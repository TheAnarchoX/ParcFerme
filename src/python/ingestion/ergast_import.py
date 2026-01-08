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

from ingestion.config import get_database_url, get_pool, setup_logging
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
        "postgresql://postgres:postgres@localhost:5432/ergastf1",
    )


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Import historical F1 data from Ergast database into ParcFerme",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
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

    # Year selection (mutually exclusive)
    year_group = parser.add_mutually_exclusive_group(required=True)
    year_group.add_argument(
        "--year",
        type=int,
        help="Import a single year (e.g., 1980)",
    )
    year_group.add_argument(
        "--year-range",
        type=int,
        nargs=2,
        metavar=("START", "END"),
        help="Import a range of years (e.g., 1950 2017)",
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
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level=log_level)

    # Get database URLs
    parcferme_db_url = args.parcferme_db or get_database_url()

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


if __name__ == "__main__":
    sys.exit(main())
