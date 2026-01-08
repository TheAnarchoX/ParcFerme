#!/usr/bin/env python3
"""
Ergast Historical F1 Data Import CLI.

This script imports historical F1 data from the Ergast database into ParcFerme.
The Ergast database contains comprehensive F1 data from 1950-2017.

Usage:
    # Import a single year
    python -m ingestion.ergast_import --year 1980

    # Import a range of years
    python -m ingestion.ergast_import --year-range 1950 2017

    # Dry run (show what would be imported)
    python -m ingestion.ergast_import --year 1980 --dry-run

    # Skip existing entities (don't update)
    python -m ingestion.ergast_import --year-range 2010 2017 --skip-existing

    # Verbose logging
    python -m ingestion.ergast_import --year 1980 -v
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import structlog

from ingestion.config import settings
from ingestion.entity_resolver import EntityResolver
from ingestion.repository import RacingRepository
from ingestion.services.ergast import ErgastSyncService
from ingestion.sources.ergast import ErgastDataSource
from ingestion.sync import SyncOptions

if TYPE_CHECKING:
    from psycopg_pool import ConnectionPool


log = structlog.get_logger(__name__)


@dataclass
class ImportConfig:
    """Configuration for Ergast import."""

    ergast_db_url: str
    parcferme_db_url: str
    dry_run: bool = False
    skip_existing: bool = False
    verbose: bool = False


@dataclass
class ImportStats:
    """Statistics from an import run."""

    years_processed: int = 0
    rounds_synced: int = 0
    sessions_synced: int = 0
    results_synced: int = 0
    drivers_resolved: int = 0
    teams_resolved: int = 0
    circuits_resolved: int = 0
    errors: int = 0
    duration_seconds: float = 0.0

    def __str__(self) -> str:
        return (
            f"Import Complete:\n"
            f"  Years: {self.years_processed}\n"
            f"  Rounds: {self.rounds_synced}\n"
            f"  Sessions: {self.sessions_synced}\n"
            f"  Results: {self.results_synced}\n"
            f"  Drivers resolved: {self.drivers_resolved}\n"
            f"  Teams resolved: {self.teams_resolved}\n"
            f"  Circuits resolved: {self.circuits_resolved}\n"
            f"  Errors: {self.errors}\n"
            f"  Duration: {self.duration_seconds:.1f}s"
        )


class ErgastImporter:
    """
    Orchestrates the import of Ergast historical data into ParcFerme.
    
    This class manages the connection pools, data sources, and sync services
    needed to perform a full historical import.
    """

    def __init__(self, config: ImportConfig) -> None:
        self.config = config
        self._ergast_pool: ConnectionPool | None = None
        self._parcferme_pool: ConnectionPool | None = None
        self._ergast_source: ErgastDataSource | None = None
        self._sync_service: ErgastSyncService | None = None

    def __enter__(self) -> "ErgastImporter":
        """Set up connection pools and services."""
        from psycopg_pool import ConnectionPool

        log.info("Initializing Ergast importer")

        # Create connection pools
        self._ergast_pool = ConnectionPool(
            self.config.ergast_db_url,
            min_size=1,
            max_size=4,
            open=True,
        )
        log.debug("Created Ergast database pool")

        self._parcferme_pool = ConnectionPool(
            self.config.parcferme_db_url,
            min_size=1,
            max_size=4,
            open=True,
        )
        log.debug("Created ParcFerme database pool")

        # Create data source
        self._ergast_source = ErgastDataSource(self._ergast_pool)

        # Create repository and resolver
        repo = RacingRepository(self._parcferme_pool)
        resolver = EntityResolver(repo)

        # Create sync options
        sync_options = SyncOptions(
            drivers="skip" if self.config.skip_existing else "create_only",
            teams="skip" if self.config.skip_existing else "create_only",
            circuits="skip" if self.config.skip_existing else "create_only",
            rounds="skip" if self.config.skip_existing else "create_only",
            sessions="skip" if self.config.skip_existing else "create_only",
            entrants="skip" if self.config.skip_existing else "create_only",
            results="skip" if self.config.skip_existing else "full",
        )

        # Create sync service
        self._sync_service = ErgastSyncService(
            data_source=self._ergast_source,
            repository=repo,
            resolver=resolver,
            sync_options=sync_options,
            dry_run=self.config.dry_run,
        )

        log.info("Ergast importer initialized")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Clean up connection pools."""
        if self._ergast_pool:
            self._ergast_pool.close()
        if self._parcferme_pool:
            self._parcferme_pool.close()
        log.info("Ergast importer closed")

    def import_year(self, year: int) -> ImportStats:
        """Import a single year of historical data."""
        if not self._sync_service:
            raise RuntimeError("Importer not initialized. Use context manager.")

        start_time = time.monotonic()
        stats = ImportStats()

        try:
            log.info("Starting import", year=year, dry_run=self.config.dry_run)

            sync_stats = self._sync_service.sync_year(year)

            stats.years_processed = 1
            stats.rounds_synced = sync_stats.rounds_synced
            stats.sessions_synced = sync_stats.sessions_synced
            stats.results_synced = sync_stats.results_synced
            stats.drivers_resolved = sync_stats.drivers_resolved
            stats.teams_resolved = sync_stats.teams_resolved
            stats.circuits_resolved = sync_stats.circuits_resolved
            stats.errors = sync_stats.errors

            log.info(
                "Year import complete",
                year=year,
                rounds=stats.rounds_synced,
                sessions=stats.sessions_synced,
                results=stats.results_synced,
            )

        except Exception as e:
            log.error("Year import failed", year=year, error=str(e))
            stats.errors += 1
            raise

        finally:
            stats.duration_seconds = time.monotonic() - start_time

        return stats

    def import_year_range(self, start_year: int, end_year: int) -> ImportStats:
        """Import a range of years."""
        if not self._sync_service:
            raise RuntimeError("Importer not initialized. Use context manager.")

        start_time = time.monotonic()
        total_stats = ImportStats()

        log.info(
            "Starting year range import",
            start_year=start_year,
            end_year=end_year,
            dry_run=self.config.dry_run,
        )

        try:
            sync_stats = self._sync_service.sync_year_range(start_year, end_year)

            total_stats.years_processed = end_year - start_year + 1
            total_stats.rounds_synced = sync_stats.rounds_synced
            total_stats.sessions_synced = sync_stats.sessions_synced
            total_stats.results_synced = sync_stats.results_synced
            total_stats.drivers_resolved = sync_stats.drivers_resolved
            total_stats.teams_resolved = sync_stats.teams_resolved
            total_stats.circuits_resolved = sync_stats.circuits_resolved
            total_stats.errors = sync_stats.errors

        except Exception as e:
            log.error(
                "Year range import failed",
                start_year=start_year,
                end_year=end_year,
                error=str(e),
            )
            total_stats.errors += 1
            raise

        finally:
            total_stats.duration_seconds = time.monotonic() - start_time

        log.info(
            "Year range import complete",
            years=total_stats.years_processed,
            rounds=total_stats.rounds_synced,
            sessions=total_stats.sessions_synced,
            results=total_stats.results_synced,
            duration=f"{total_stats.duration_seconds:.1f}s",
        )

        return total_stats


def get_ergast_db_url() -> str:
    """Get the Ergast database URL from environment or default."""
    return os.environ.get(
        "ERGAST_DATABASE_URL",
        "postgresql://parcferme:localdev@localhost:5432/ergastf1",
    )


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Import historical F1 data from Ergast database into ParcFerme",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import reference data (circuits, drivers, teams, seasons) first
  python -m ingestion.ergast_import --reference-data
  
  # Verify Ergast database connectivity
  python -m ingestion.ergast_import --verify

  # Import a single year
  python -m ingestion.ergast_import --year 1980

  # Import all Ergast data (1950-2017)
  python -m ingestion.ergast_import --year-range 1950 2017

  # Preview what would be imported
  python -m ingestion.ergast_import --year 1980 --dry-run

  # Import without updating existing entities
  python -m ingestion.ergast_import --year-range 2010 2017 --skip-existing
        """,
    )

    # Operation selection (mutually exclusive)
    op_group = parser.add_mutually_exclusive_group(required=True)
    op_group.add_argument(
        "--year",
        type=int,
        help="Import a single year (e.g., 1980)",
    )
    op_group.add_argument(
        "--year-range",
        type=int,
        nargs=2,
        metavar=("START", "END"),
        help="Import a range of years (e.g., 1950 2017)",
    )
    op_group.add_argument(
        "--reference-data",
        action="store_true",
        help="Import reference data only (circuits, drivers, teams, seasons 1950-2019)",
    )
    op_group.add_argument(
        "--events",
        type=int,
        nargs=2,
        metavar=("START", "END"),
        help="Import rounds, sessions, and entrants for year range (no results)",
    )
    op_group.add_argument(
        "--results",
        type=int,
        nargs=2,
        metavar=("START", "END"),
        help="Import race and qualifying results for year range (requires events to exist)",
    )
    op_group.add_argument(
        "--verify",
        action="store_true",
        help="Verify Ergast database connectivity and data counts",
    )

    # Options
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be imported without making changes",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip entities that already exist (don't update)",
    )
    parser.add_argument(
        "--race-only",
        action="store_true",
        help="For --results: import race results only, skip qualifying",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )

    # Database URLs (usually from environment)
    parser.add_argument(
        "--ergast-db",
        type=str,
        default=get_ergast_db_url(),
        help="Ergast database URL (default: from ERGAST_DATABASE_URL env var)",
    )
    parser.add_argument(
        "--parcferme-db",
        type=str,
        default=None,
        help="ParcFerme database URL (default: from DATABASE_URL env var)",
    )

    return parser.parse_args()


def main() -> int:
    """Main entry point."""
    args = parse_args()

    # Set up logging
    import logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
    )

    # Get database URLs
    parcferme_db_url = args.parcferme_db or settings.database_url

    # Handle --verify command
    if args.verify:
        return run_verification(args.ergast_db, parcferme_db_url)

    # Handle --reference-data command
    if args.reference_data:
        return run_reference_data_import(args.ergast_db, parcferme_db_url, args.skip_existing, args.dry_run)

    # Handle --events command
    if args.events:
        start_year, end_year = args.events
        return run_events_import(args.ergast_db, parcferme_db_url, start_year, end_year, args.skip_existing, args.dry_run)

    # Handle --results command
    if args.results:
        start_year, end_year = args.results
        include_qualifying = not args.race_only
        return run_results_import(args.ergast_db, parcferme_db_url, start_year, end_year, include_qualifying, args.dry_run)

    # Validate year range if provided
    if args.year_range:
        start_year, end_year = args.year_range
        if start_year > end_year:
            log.error("Start year must be <= end year")
            return 1
        if start_year < 1950:
            log.warning("Ergast data starts from 1950", requested_start=start_year)
        if end_year > 2024:
            log.warning(
                "Ergast data may not be complete after 2017",
                requested_end=end_year,
            )

    # Create import config
    config = ImportConfig(
        ergast_db_url=args.ergast_db,
        parcferme_db_url=parcferme_db_url,
        dry_run=args.dry_run,
        skip_existing=args.skip_existing,
        verbose=args.verbose,
    )

    if args.dry_run:
        log.info("DRY RUN MODE - no changes will be made")

    try:
        with ErgastImporter(config) as importer:
            if args.year:
                stats = importer.import_year(args.year)
            else:
                start_year, end_year = args.year_range
                stats = importer.import_year_range(start_year, end_year)

            print("\n" + "=" * 50)
            print(stats)
            print("=" * 50)

            return 0 if stats.errors == 0 else 1

    except KeyboardInterrupt:
        log.info("Import cancelled by user")
        return 130
    except Exception as e:
        log.exception("Import failed", error=str(e))
        return 1


def run_verification(ergast_db_url: str, parcferme_db_url: str) -> int:
    """Verify Ergast database connectivity and data counts."""
    from ingestion.sources.ergast import ErgastConfig
    import urllib.parse
    
    print("=" * 60)
    print("ERGAST DATABASE VERIFICATION")
    print("=" * 60)
    
    try:
        # Parse ergast URL to create config
        parsed = urllib.parse.urlparse(ergast_db_url)
        ergast_config = ErgastConfig(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            user=parsed.username or "parcferme",
            password=parsed.password or "localdev",
            database=parsed.path.lstrip("/") if parsed.path else "ergastf1",
        )
        
        # Use context manager for repo to ensure connection
        with RacingRepository(parcferme_db_url) as repo:
            sync_service = ErgastSyncService(
                repository=repo,
                config=ergast_config,
            )
            
            results = sync_service.verify_ergast_data()
        
        if results["connected"]:
            print("\n✅ Ergast database verified successfully!")
            return 0
        else:
            print(f"\n❌ Verification failed: {results.get('error')}")
            return 1
            
    except Exception as e:
        log.exception("Verification failed", error=str(e))
        print(f"\n❌ Verification failed: {e}")
        return 1


def run_reference_data_import(
    ergast_db_url: str,
    parcferme_db_url: str,
    skip_existing: bool,
    dry_run: bool,
) -> int:
    """Import reference data (circuits, drivers, teams, seasons)."""
    from ingestion.sources.ergast import ErgastConfig
    
    print("=" * 60)
    print("ERGAST REFERENCE DATA IMPORT")
    print("=" * 60)
    
    if dry_run:
        print("DRY RUN MODE - showing what would be imported\n")
    
    try:
        # Parse ergast URL to create config
        import urllib.parse
        parsed = urllib.parse.urlparse(ergast_db_url)
        ergast_config = ErgastConfig(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            user=parsed.username or "parcferme",
            password=parsed.password or "localdev",
            database=parsed.path.lstrip("/") if parsed.path else "ergastf1",
        )
        
        sync_options = SyncOptions(
            driver_mode="skip" if skip_existing else "create_only",
            team_mode="skip" if skip_existing else "create_only",
            circuit_mode="skip" if skip_existing else "create_only",
        )
        
        total_stats = {
            "circuits": {"created": 0, "matched": 0, "errors": 0},
            "drivers": {"created": 0, "matched": 0, "errors": 0},
            "teams": {"created": 0, "matched": 0, "errors": 0},
            "seasons": {"created": 0},
        }
        
        # Use context manager for repository to ensure proper connection
        with RacingRepository(parcferme_db_url) as repo:
            sync_service = ErgastSyncService(
                config=ergast_config,
                repository=repo,
            )
            
            # Import circuits
            circuit_stats = sync_service.import_circuits_with_stats(sync_options)
            total_stats["circuits"]["created"] = circuit_stats["created"]
            total_stats["circuits"]["matched"] = circuit_stats["matched"]
            total_stats["circuits"]["errors"] = len(circuit_stats.get("errors", []))
            
            # Import drivers
            driver_stats = sync_service.import_drivers_with_stats(sync_options)
            total_stats["drivers"]["created"] = driver_stats["created"]
            total_stats["drivers"]["matched"] = driver_stats["matched"]
            total_stats["drivers"]["errors"] = len(driver_stats.get("errors", []))
            
            # Import teams
            team_stats = sync_service.import_teams_with_stats(sync_options)
            total_stats["teams"]["created"] = team_stats["created"]
            total_stats["teams"]["matched"] = team_stats["matched"]
            total_stats["teams"]["errors"] = len(team_stats.get("errors", []))
            
            # Create F1 seasons 1950-2019
            seasons_created = sync_service.create_historical_seasons(1950, 2019)
            total_stats["seasons"]["created"] = seasons_created
        
        # Print summary
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Circuits:  Created {total_stats['circuits']['created']}, "
              f"Matched {total_stats['circuits']['matched']}")
        print(f"Drivers:   Created {total_stats['drivers']['created']}, "
              f"Matched {total_stats['drivers']['matched']}")
        print(f"Teams:     Created {total_stats['teams']['created']}, "
              f"Matched {total_stats['teams']['matched']}")
        print(f"Seasons:   Created {total_stats['seasons']['created']}")
        
        total_errors = (
            total_stats["circuits"]["errors"]
            + total_stats["drivers"]["errors"]
            + total_stats["teams"]["errors"]
        )
        
        if total_errors:
            print(f"\n⚠️  {total_errors} errors occurred during import")
            return 1
        
        print("\n✅ Reference data import completed successfully!")
        return 0
        
    except Exception as e:
        log.exception("Reference data import failed", error=str(e))
        print(f"\n❌ Import failed: {e}")
        return 1


def run_events_import(
    ergast_db_url: str,
    parcferme_db_url: str,
    start_year: int,
    end_year: int,
    skip_existing: bool,
    dry_run: bool,
) -> int:
    """Import event data (rounds, sessions, entrants) for a year range."""
    from ingestion.sources.ergast import ErgastConfig
    
    print("=" * 60)
    print("ERGAST EVENT DATA IMPORT")
    print("=" * 60)
    print(f"Years: {start_year} - {end_year}")
    
    if dry_run:
        print("DRY RUN MODE - showing what would be imported\n")
    
    try:
        # Parse ergast URL to create config
        import urllib.parse
        parsed = urllib.parse.urlparse(ergast_db_url)
        ergast_config = ErgastConfig(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            user=parsed.username or "parcferme",
            password=parsed.password or "localdev",
            database=parsed.path.lstrip("/") if parsed.path else "ergastf1",
        )
        
        sync_options = SyncOptions(
            driver_mode="skip" if skip_existing else "create_only",
            team_mode="skip" if skip_existing else "create_only",
            circuit_mode="skip" if skip_existing else "create_only",
        )
        
        # Use context manager for repository
        with RacingRepository(parcferme_db_url) as repo:
            sync_service = ErgastSyncService(
                config=ergast_config,
                repository=repo,
            )
            
            # Import events for year range
            stats = sync_service.import_events_for_year_range(
                start_year,
                end_year,
                sync_options,
            )
        
        # Print summary
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Years processed: {stats['years_processed']}")
        print(f"Rounds created:  {stats['rounds_created']}")
        print(f"Sessions created: {stats['sessions_created']}")
        print(f"Entrants created: {stats['entrants_created']}")
        
        if stats["errors"]:
            print(f"\n⚠️  {len(stats['errors'])} errors occurred:")
            for err in stats["errors"][:10]:  # Show first 10
                print(f"   - {err}")
            if len(stats["errors"]) > 10:
                print(f"   ... and {len(stats['errors']) - 10} more")
            return 1
        
        print("\n✅ Event data import completed successfully!")
        return 0
        
    except Exception as e:
        log.exception("Event data import failed", error=str(e))
        print(f"\n❌ Import failed: {e}")
        return 1


def run_results_import(
    ergast_db_url: str,
    parcferme_db_url: str,
    start_year: int,
    end_year: int,
    include_qualifying: bool,
    dry_run: bool,
) -> int:
    """Import race and qualifying results for a year range."""
    from ingestion.sources.ergast import ErgastConfig
    
    print("=" * 60)
    print("ERGAST RESULTS IMPORT")
    print("=" * 60)
    print(f"Years: {start_year} - {end_year}")
    print(f"Qualifying: {'Yes' if include_qualifying else 'No (race results only)'}")
    
    if dry_run:
        print("DRY RUN MODE - showing what would be imported\n")
    
    try:
        # Parse ergast URL to create config
        import urllib.parse
        parsed = urllib.parse.urlparse(ergast_db_url)
        ergast_config = ErgastConfig(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            user=parsed.username or "parcferme",
            password=parsed.password or "localdev",
            database=parsed.path.lstrip("/") if parsed.path else "ergastf1",
        )
        
        # Use context manager for repository
        with RacingRepository(parcferme_db_url) as repo:
            sync_service = ErgastSyncService(
                config=ergast_config,
                repository=repo,
            )
            
            # Import results for year range
            stats = sync_service.import_results_for_year_range(
                start_year,
                end_year,
                include_qualifying,
            )
        
        # Print summary
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Years processed:     {stats['years_processed']}")
        print(f"Rounds processed:    {stats['rounds_processed']}")
        print(f"Race results:        {stats['race_results']}")
        print(f"Qualifying results:  {stats['qualifying_results']}")
        
        if stats["errors"]:
            print(f"\n⚠️  {len(stats['errors'])} errors occurred:")
            for err in stats["errors"][:10]:  # Show first 10
                print(f"   - {err}")
            if len(stats["errors"]) > 10:
                print(f"   ... and {len(stats['errors']) - 10} more")
            return 1
        
        print("\n✅ Results import completed successfully!")
        return 0
        
    except Exception as e:
        log.exception("Results import failed", error=str(e))
        print(f"\n❌ Import failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
