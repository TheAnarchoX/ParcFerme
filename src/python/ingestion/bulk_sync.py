"""
Bulk Sync Script for OpenF1 Data.

This script scrapes the entire OpenF1 API comprehensively and can be run
multiple times safely without data corruption. It uses upserts to ensure
idempotency.

Usage:
    python -m ingestion.bulk_sync --start-year 1950 --end-year 2024
    python -m ingestion.bulk_sync --all  # Sync all available years
    python -m ingestion.bulk_sync --current  # Sync current season only
"""

import argparse
import sys
import time
from datetime import UTC, datetime

import structlog  # type: ignore

from ingestion.clients.openf1 import OpenF1ApiError, OpenF1Client
from ingestion.config import settings
from ingestion.repository import RacingRepository
from ingestion.sync import OpenF1SyncService, SyncOptions

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        (
            structlog.dev.ConsoleRenderer()
            if settings.log_level == "DEBUG"
            else structlog.processors.JSONRenderer()
        ),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# OpenF1 currently has reliable data from 2023 onwards
# Historical data availability varies
OPENF1_RELIABLE_START_YEAR = 2023
CURRENT_YEAR = datetime.now(UTC).year


class BulkSyncRunner:
    """Orchestrates bulk syncing of multiple years with error handling and retry logic."""

    def __init__(
        self,
        pause_between_years: float = 2.0,
        max_retries: int = 3,
        include_results: bool = True,
        results_only: bool = False,
        sync_options: SyncOptions | None = None,
    ):
        """
        Initialize bulk sync runner.

        Args:
            pause_between_years: Seconds to pause between year syncs (rate limiting)
            max_retries: Max retry attempts per year on failure
            include_results: Whether to sync results (spoiler data) - ignored if results_only=True
            results_only: If True, only sync results for existing sessions (no entity updates)
            sync_options: SyncOptions controlling entity update behavior
        """
        self.pause_between_years = pause_between_years
        self.max_retries = max_retries
        self.include_results = include_results
        self.results_only = results_only
        self.sync_options = sync_options or SyncOptions()
        self.total_stats = {
            "years_attempted": 0,
            "years_succeeded": 0,
            "years_failed": 0,
            "total_meetings": 0,
            "total_sessions": 0,
            "total_drivers": 0,
            "total_teams": 0,
            "total_results": 0,
            "failed_years": [],
        }

    def check_api_health(self) -> bool:
        """Check if OpenF1 API is accessible."""
        try:
            client = OpenF1Client()
            # Try to fetch current year meetings as health check
            client.get_meetings(CURRENT_YEAR)
            client.close()
            logger.info("✅ OpenF1 API is accessible")
            return True
        except OpenF1ApiError as e:
            logger.error(
                "❌ OpenF1 API is not accessible",
                status_code=e.status_code,
                error=e.message,
            )
            return False
        except Exception as e:
            logger.error("❌ Failed to connect to OpenF1 API", error=str(e))
            return False

    def sync_year_with_retry(self, year: int, sync_service: OpenF1SyncService) -> dict | None:
        """
        Sync a single year with retry logic.

        Returns stats dict on success, None on failure after all retries.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                mode = "results-only" if self.results_only else "full"
                logger.info(
                    f"Syncing year {year}",
                    year=year,
                    mode=mode,
                    attempt=attempt,
                    max_retries=self.max_retries,
                )

                if self.results_only:
                    stats = sync_service.sync_results_only_year(year=year)
                    # For results-only mode, check sessions_synced instead of meetings_synced
                    success_key = "sessions_synced"
                else:
                    stats = sync_service.sync_year(
                        year=year, 
                        include_results=self.include_results,
                        options=self.sync_options,
                    )
                    success_key = "meetings_synced"

                # Check if there were critical errors
                if stats.get("errors"):
                    error_count = len(stats["errors"])
                    logger.warning(
                        f"Year {year} completed with errors",
                        year=year,
                        error_count=error_count,
                    )
                    # If we got some data, consider it a partial success
                    if stats.get(success_key, 0) > 0:
                        logger.info(f"Partial success for year {year}", stats=stats)
                        return stats
                    # If no data synced and errors, retry
                    if attempt < self.max_retries:
                        logger.info(f"Retrying year {year} (attempt {attempt + 1})")
                        time.sleep(self.pause_between_years * 2)  # Longer pause on error
                        continue
                    return None

                logger.info(f"✅ Successfully synced year {year}", stats=stats)
                return stats

            except OpenF1ApiError as e:
                logger.error(
                    f"OpenF1 API error for year {year}",
                    year=year,
                    status_code=e.status_code,
                    error=e.message,
                    attempt=attempt,
                )
                if attempt < self.max_retries:
                    # Exponential backoff for rate limiting
                    wait_time = self.pause_between_years * (2**attempt)
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    return None

            except Exception as e:
                logger.error(
                    f"Unexpected error syncing year {year}",
                    year=year,
                    error=str(e),
                    attempt=attempt,
                )
                if attempt < self.max_retries:
                    time.sleep(self.pause_between_years)
                else:
                    return None

        return None

    def sync_year_range(self, start_year: int, end_year: int) -> dict:
        """
        Sync all years in range [start_year, end_year] inclusive.

        This method is idempotent - it can be run multiple times safely.
        Existing data will be updated, new data will be inserted.

        Args:
            start_year: First year to sync (inclusive)
            end_year: Last year to sync (inclusive)

        Returns:
            Aggregate statistics dictionary
        """
        if start_year > end_year:
            logger.error("Invalid year range", start_year=start_year, end_year=end_year)
            return self.total_stats

        years = list(range(start_year, end_year + 1))
        total_years = len(years)

        logger.info(
            "🏁 Starting bulk sync",
            start_year=start_year,
            end_year=end_year,
            total_years=total_years,
            include_results=self.include_results,
        )

        # Check API health first
        if not self.check_api_health():
            logger.error("Aborting bulk sync - API not accessible")
            return self.total_stats

        with OpenF1SyncService() as sync_service:
            for i, year in enumerate(years, 1):
                self.total_stats["years_attempted"] += 1

                logger.info(
                    f"\n{'=' * 60}\n"
                    f"📅 Processing year {year} ({i}/{total_years})\n"
                    f"{'=' * 60}"
                )

                stats = self.sync_year_with_retry(year, sync_service)

                if stats:
                    self.total_stats["years_succeeded"] += 1
                    self.total_stats["total_meetings"] += stats.get("meetings_synced", 0)
                    self.total_stats["total_sessions"] += stats.get("sessions_synced", 0)
                    self.total_stats["total_drivers"] += stats.get("drivers_synced", 0)
                    self.total_stats["total_teams"] += stats.get("teams_synced", 0)
                    self.total_stats["total_results"] += stats.get("results_synced", 0)
                else:
                    self.total_stats["years_failed"] += 1
                    self.total_stats["failed_years"].append(year)
                    logger.error(f"❌ Failed to sync year {year} after all retries")

                # Progress update
                logger.info(
                    f"Progress: {i}/{total_years} years processed "
                    f"({self.total_stats['years_succeeded']} succeeded, "
                    f"{self.total_stats['years_failed']} failed)"
                )

                # Rate limiting: pause between years (except after last year)
                if i < total_years:
                    logger.info(f"Pausing {self.pause_between_years}s before next year...")
                    time.sleep(self.pause_between_years)

        return self.total_stats

    def print_summary(self) -> None:
        """Print comprehensive summary of bulk sync results."""
        stats = self.total_stats

        mode_label = "RESULTS-ONLY SYNC" if self.results_only else "BULK SYNC"
        print("\n" + "=" * 70)
        print(f"🏁 {mode_label} COMPLETE")
        print("=" * 70)
        print(f"\n📊 SUMMARY:")
        print(f"  Years attempted:    {stats['years_attempted']}")
        print(f"  ✅ Years succeeded:  {stats['years_succeeded']}")
        print(f"  ❌ Years failed:     {stats['years_failed']}")
        print(f"\n📈 TOTAL DATA SYNCED:")
        if not self.results_only:
            print(f"  Meetings:           {stats['total_meetings']}")
            print(f"  Sessions:           {stats['total_sessions']}")
            print(f"  Drivers:            {stats['total_drivers']}")
            print(f"  Teams:              {stats['total_teams']}")
        if self.include_results:
            print(f"  Results:            {stats['total_results']}")

        if stats["failed_years"]:
            print(f"\n⚠️  FAILED YEARS: {', '.join(map(str, stats['failed_years']))}")
            print("   You can retry these individually with:")
            for year in stats["failed_years"]:
                print(f"   python -m ingestion sync --year {year}")

        if stats["years_failed"] == 0:
            print("\n✅ All years synced successfully!")
        elif stats["years_succeeded"] > 0:
            print(f"\n⚠️  Partial success: {stats['years_succeeded']}/{stats['years_attempted']} years synced")
        else:
            print("\n❌ Bulk sync failed - no years were synced successfully")

        print("=" * 70 + "\n")


def main() -> int:
    """Main entry point for bulk sync."""
    parser = argparse.ArgumentParser(
        prog="parcferme-bulk-sync",
        description="Bulk sync F1 data from OpenF1 API for multiple years",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Sync all reliable years (2023-present)
  python -m ingestion.bulk_sync --all

  # Sync current season only
  python -m ingestion.bulk_sync --current

  # Sync specific year range
  python -m ingestion.bulk_sync --start-year 2023 --end-year 2024

  # Sync without results (faster, no spoilers)
  python -m ingestion.bulk_sync --all --no-results
  
  # Clear and re-sync results from scratch
  python -m ingestion.bulk_sync --start-year 2023 --end-year 2025 --clear-results
  
  # Safe historical sync: only create new entities, don't update existing
  python -m ingestion.bulk_sync --start-year 2020 --end-year 2022 --create-only

  # Sync but preserve canonical driver/team names (only create aliases)
  python -m ingestion.bulk_sync --all --preserve-names

  # Sync but preserve canonical driver numbers (track #1 changes as aliases)
  python -m ingestion.bulk_sync --all --preserve-numbers

  # Combine flags for maximum safety
  python -m ingestion.bulk_sync --start-year 2020 --end-year 2022 --create-only --preserve-numbers

  # Custom pause between years (default 2s)
  python -m ingestion.bulk_sync --all --pause 5
        """,
    )

    # Year range options (mutually exclusive)
    year_group = parser.add_mutually_exclusive_group(required=True)
    year_group.add_argument(
        "--all",
        action="store_true",
        help=f"Sync all reliable years ({OPENF1_RELIABLE_START_YEAR}-{CURRENT_YEAR})",
    )
    year_group.add_argument(
        "--current",
        action="store_true",
        help=f"Sync current year only ({CURRENT_YEAR})",
    )
    year_group.add_argument(
        "--start-year",
        type=int,
        metavar="YEAR",
        help="First year to sync (requires --end-year)",
    )

    # Optional arguments
    parser.add_argument(
        "--end-year",
        type=int,
        metavar="YEAR",
        help="Last year to sync (requires --start-year)",
    )
    parser.add_argument(
        "--no-results",
        action="store_true",
        help="Skip syncing results (faster, avoids spoiler data)",
    )
    parser.add_argument(
        "--results-only",
        action="store_true",
        help="Only sync results for existing sessions (no driver/team/session updates)",
    )
    
    # Safety flags for entity updates
    parser.add_argument(
        "--create-only",
        action="store_true",
        help="""Only create new entities (drivers, teams, circuits), never update existing ones.
                Any incoming name/number changes will be recorded as aliases.
                Use for historical syncs where you want to preserve current canonical data.""",
    )
    parser.add_argument(
        "--preserve-names",
        action="store_true",
        help="""Preserve existing canonical names for drivers and teams.
                Incoming name variations will be recorded as aliases.
                Useful when OpenF1 has different naming conventions.""",
    )
    parser.add_argument(
        "--preserve-numbers",
        action="store_true",
        help="""Preserve existing canonical driver numbers.
                Historical numbers (like Verstappen's #1) will be recorded as aliases.
                Essential for syncing world champion seasons where #1 was used.""",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log what would be done without making database changes (not yet implemented)",
    )
    parser.add_argument(
        "--clear-results",
        action="store_true",
        help="""Clear all existing results for the specified year range before syncing.
                ⚠️ DESTRUCTIVE: Permanently deletes results data.
                Use when you want a fresh re-sync of results data.""",
    )
    
    parser.add_argument(
        "--pause",
        type=float,
        default=2.0,
        metavar="SECONDS",
        help="Seconds to pause between years (default: 2.0)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        metavar="N",
        help="Max retry attempts per year on failure (default: 3)",
    )

    args = parser.parse_args()

    # Validate arguments
    if args.results_only and args.no_results:
        parser.error("--results-only and --no-results are mutually exclusive")
    
    # results-only mode doesn't need entity safety flags
    if args.results_only and (args.create_only or args.preserve_names or args.preserve_numbers):
        parser.error("--results-only cannot be combined with --create-only, --preserve-names, or --preserve-numbers")

    # Validate year range arguments
    if args.start_year and not args.end_year:
        parser.error("--start-year requires --end-year")
    if args.end_year and not args.start_year:
        parser.error("--end-year requires --start-year")

    # Determine year range
    if args.all:
        start_year = OPENF1_RELIABLE_START_YEAR
        end_year = CURRENT_YEAR
    elif args.current:
        start_year = end_year = CURRENT_YEAR
    else:
        start_year = args.start_year
        end_year = args.end_year

    # Validate year range
    if start_year < 1950:
        print(f"⚠️  Warning: F1 started in 1950, year {start_year} may have no data")
    if end_year > CURRENT_YEAR:
        print(f"⚠️  Warning: Year {end_year} is in the future, adjusting to {CURRENT_YEAR}")
        end_year = CURRENT_YEAR
    if start_year > end_year:
        parser.error(f"Invalid year range: {start_year} > {end_year}")

    # Build SyncOptions from CLI flags
    if args.create_only:
        # Use the safe historical preset as a base
        sync_options = SyncOptions(
            driver_mode="create_only",
            team_mode="create_only",
            circuit_mode="create_only",
            session_mode="full",  # Sessions can still be updated
            preserve_canonical_names=args.preserve_names,
            preserve_canonical_numbers=args.preserve_numbers,
        )
    else:
        sync_options = SyncOptions(
            preserve_canonical_names=args.preserve_names,
            preserve_canonical_numbers=args.preserve_numbers,
        )
    
    # Log safety settings
    if args.create_only:
        print("🛡️  Safety: --create-only enabled (new entities only, existing unchanged)")
    if args.preserve_names:
        print("🛡️  Safety: --preserve-names enabled (canonical names preserved)")
    if args.preserve_numbers:
        print("🛡️  Safety: --preserve-numbers enabled (canonical driver numbers preserved)")
    if args.dry_run:
        print("🧪 DRY RUN: Not yet implemented - changes WILL be made")

    # Handle --clear-results: delete existing results before syncing
    if args.clear_results:
        print(f"\n🗑️  --clear-results: Clearing existing results for {start_year}-{end_year}...")
        with RacingRepository() as repo:
            # Show current count before deletion
            current_count = repo.count_results_for_year_range(start_year, end_year)
            if current_count == 0:
                print(f"   No existing results found for {start_year}-{end_year}")
            else:
                print(f"   Found {current_count} existing results")
                deleted_count = repo.delete_results_for_year_range(start_year, end_year)
                print(f"   ✅ Deleted {deleted_count} results")

    # Create and run bulk sync
    runner = BulkSyncRunner(
        pause_between_years=args.pause,
        max_retries=args.max_retries,
        include_results=not args.no_results,
        results_only=args.results_only,
        sync_options=sync_options,
    )

    try:
        runner.sync_year_range(start_year, end_year)
    except KeyboardInterrupt:
        print("\n\n⚠️  Sync interrupted by user (Ctrl+C)")
        print("Progress has been saved. You can resume by running the command again.")
        return 130  # Standard exit code for SIGINT
    except Exception as e:
        logger.error("Fatal error during bulk sync", error=str(e), exc_info=True)
        return 1
    finally:
        runner.print_summary()

    # Return appropriate exit code
    if runner.total_stats["years_failed"] > 0:
        return 1  # Partial or complete failure
    return 0  # Complete success


if __name__ == "__main__":
    sys.exit(main())
