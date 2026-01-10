"""
CLI tool for detecting and updating driver roles.

Usage:
    # Dry run (report only) for all F1 seasons:
    python -m ingestion.detect_roles --series formula-1 --dry-run
    
    # Apply changes for a specific year:
    python -m ingestion.detect_roles --series formula-1 --year 2024 --apply
    
    # Apply changes for all seasons:
    python -m ingestion.detect_roles --apply
"""

import argparse
import sys
from uuid import UUID

from .repository import RacingRepository
from .role_detection import RoleDetector, print_detection_summary


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect and update driver roles based on session participation patterns."
    )
    parser.add_argument(
        "--series",
        type=str,
        help="Filter by series slug (e.g., 'formula-1')",
    )
    parser.add_argument(
        "--year",
        type=int,
        help="Filter by specific year",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Only report changes without applying them (default)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to the database",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show all entrants, not just changes",
    )
    
    args = parser.parse_args()
    
    # --apply overrides --dry-run
    dry_run = not args.apply
    
    print(f"Driver Role Detection Tool")
    print(f"{'='*60}")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'APPLY CHANGES'}")
    if args.series:
        print(f"Series filter: {args.series}")
    if args.year:
        print(f"Year filter: {args.year}")
    print()
    
    repo = RacingRepository()
    repo.connect()  # Connect to the database
    detector = RoleDetector(repo)
    
    try:
        if args.year:
            # Get specific season
            season_id = _get_season_id(repo, args.series, args.year)
            if not season_id:
                print(f"Error: Season not found for {args.series or 'any series'} {args.year}")
                return 1
            
            print(f"Processing {args.year}...")
            results = detector.detect_roles_for_season(season_id, dry_run)
        else:
            # All seasons
            results = detector.detect_roles_for_all_seasons(dry_run, args.series)
        
        if args.verbose:
            # Show all results
            for r in results:
                status = "CHANGED" if r.changed else "ok"
                print(f"[{status}] {r.year} {r.round_name}: {r.driver_name} ({r.team_name})")
                print(f"    Role: {r.new_role.name} - {r.reason}")
        
        print_detection_summary(results)
        
        if not dry_run:
            changed_count = len([r for r in results if r.changed])
            print(f"\n✓ Applied {changed_count} role changes to the database.")
        else:
            changed_count = len([r for r in results if r.changed])
            if changed_count > 0:
                print(f"\nTo apply these changes, run with --apply")
        
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


def _get_season_id(repo: RacingRepository, series_slug: str | None, year: int) -> UUID | None:
    """Get the season ID for a series/year combination."""
    from psycopg.rows import dict_row
    
    with repo._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        if series_slug:
            cur.execute(
                """
                SELECT s."Id" as id
                FROM "Seasons" s
                JOIN "Series" ser ON s."SeriesId" = ser."Id"
                WHERE ser."Slug" = %s AND s."Year" = %s
                """,
                (series_slug, year),
            )
        else:
            cur.execute(
                'SELECT "Id" as id FROM "Seasons" WHERE "Year" = %s LIMIT 1',
                (year,),
            )
        
        row = cur.fetchone()
        if row:
            val = row["id"]
            return UUID(val) if isinstance(val, str) else val
        return None


if __name__ == "__main__":
    sys.exit(main())
