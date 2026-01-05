"""
CLI entry point for Parc Fermé data ingestion.

Usage:
    python -m ingestion sync --year 2024
    python -m ingestion sync --recent 7
    python -m ingestion healthcheck
"""

import argparse
import sys
from datetime import UTC, datetime

import structlog  # type: ignore

from ingestion.config import settings
from ingestion.healthcheck import check_health
from ingestion.sync import OpenF1SyncService

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
        structlog.dev.ConsoleRenderer() if settings.log_level == "DEBUG" else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


def cmd_sync(args: argparse.Namespace) -> int:
    """Run the sync command."""
    if args.year and args.recent:
        logger.error("Cannot specify both --year and --recent")
        return 1

    if not args.year and not args.recent:
        # Default to syncing current year
        args.year = datetime.now(UTC).year
        logger.info("No year specified, defaulting to current year", year=args.year)

    with OpenF1SyncService() as sync_service:
        if args.recent:
            logger.info("Starting recent sync", days=args.recent)
            stats = sync_service.sync_recent(
                days=args.recent,
                include_results=not args.no_results,
            )
        else:
            logger.info("Starting full year sync", year=args.year)
            stats = sync_service.sync_year(
                year=args.year,
                include_results=not args.no_results,
            )

    # Print summary
    print("\n" + "=" * 50)
    print("SYNC COMPLETE")
    print("=" * 50)
    if "year" in stats:
        print(f"Year:            {stats['year']}")
    if "days_checked" in stats:
        print(f"Days checked:    {stats['days_checked']}")
    print(f"Meetings synced: {stats['meetings_synced']}")
    print(f"Sessions synced: {stats['sessions_synced']}")
    if "drivers_synced" in stats:
        print(f"Drivers synced:  {stats['drivers_synced']}")
    if "teams_synced" in stats:
        print(f"Teams synced:    {stats['teams_synced']}")
    if "results_synced" in stats:
        print(f"Results synced:  {stats['results_synced']}")

    if stats.get("errors"):
        print(f"\n⚠️  Errors ({len(stats['errors'])}):")
        for error in stats["errors"]:
            print(f"  - {error}")
        return 1

    print("\n✅ Sync completed successfully!")
    return 0


def cmd_healthcheck(args: argparse.Namespace) -> int:
    """Run health checks."""
    print("Running health checks...\n")

    results = check_health()

    all_healthy = True
    for service, status in results.items():
        icon = "✅" if status["healthy"] else "❌"
        print(f"{icon} {service}: {status['message']}")
        if not status["healthy"]:
            all_healthy = False

    return 0 if all_healthy else 1


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog="parcferme-ingestion",
        description="Parc Fermé data ingestion CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Sync command
    sync_parser = subparsers.add_parser("sync", help="Sync F1 data from OpenF1 API")
    sync_parser.add_argument(
        "--year",
        type=int,
        help="Year to sync (e.g., 2024). Defaults to current year.",
    )
    sync_parser.add_argument(
        "--recent",
        type=int,
        metavar="DAYS",
        help="Only sync meetings from the last N days",
    )
    sync_parser.add_argument(
        "--no-results",
        action="store_true",
        help="Skip syncing results (useful for avoiding spoilers)",
    )
    sync_parser.set_defaults(func=cmd_sync)

    # Healthcheck command
    healthcheck_parser = subparsers.add_parser(
        "healthcheck", help="Check service connectivity"
    )
    healthcheck_parser.set_defaults(func=cmd_healthcheck)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
