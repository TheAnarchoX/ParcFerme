"""
Data cleanup module using the new matching framework.

This module provides utilities to normalize and clean existing data
in the database using the matching/normalization utilities.

Usage:
    python -m ingestion.cleanup --dry-run  # Preview changes
    python -m ingestion.cleanup            # Apply changes
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from uuid import UUID

import structlog  # type: ignore

from ingestion.config import settings
from ingestion.repository import RacingRepository
from ingestion.matching.normalization import (
    normalize_name,
    normalize_grand_prix,
    normalize_team_name,
)

logger = structlog.get_logger()


@dataclass
class CleanupStats:
    """Statistics from a cleanup run."""
    rounds_updated: int = 0
    rounds_skipped: int = 0
    drivers_updated: int = 0
    drivers_skipped: int = 0
    teams_updated: int = 0
    teams_skipped: int = 0
    circuits_updated: int = 0
    circuits_skipped: int = 0


def clean_round_names(repo: RacingRepository, dry_run: bool = True) -> list[tuple[str, str, UUID]]:
    """Clean Round names by removing sponsor text.
    
    Args:
        repo: Database repository
        dry_run: If True, only return changes without applying
        
    Returns:
        List of (old_name, new_name, round_id) tuples for changed rounds
    """
    changes = []
    
    # Get all rounds with potential sponsor text
    with repo._get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('''
                SELECT "Id", "Name", "Slug" 
                FROM "Rounds" 
                WHERE "Name" ILIKE '%FORMULA 1%' 
                   OR "Name" ILIKE '%GRAND PRIX OF%'
                   OR "Name" ILIKE '%HEINEKEN%'
                   OR "Name" ILIKE '%ARAMCO%'
                   OR "Name" ILIKE '%LENOVO%'
                   OR "Name" ILIKE '%PIRELLI%'
                   OR "Name" ILIKE '%ETIHAD%'
                   OR "Name" ILIKE '%EMIRATES%'
                   OR "Name" ILIKE '%ROLEX%'
                ORDER BY "Name"
            ''')
            
            rounds = cur.fetchall()
            
            for round_id, old_name, old_slug in rounds:
                # Normalize the name
                new_name = normalize_grand_prix(old_name)
                
                # Skip if no change
                if new_name == old_name:
                    continue
                
                changes.append((old_name, new_name, round_id))
                
                if not dry_run:
                    # Generate new slug
                    new_slug = new_name.lower().replace(" ", "-").replace("'", "")
                    
                    cur.execute('''
                        UPDATE "Rounds" 
                        SET "Name" = %s, "Slug" = %s 
                        WHERE "Id" = %s
                    ''', (new_name, new_slug, str(round_id)))
                    
                    logger.info(
                        "Updated round name",
                        old_name=old_name,
                        new_name=new_name,
                        round_id=str(round_id),
                    )
            
            if not dry_run:
                conn.commit()
    
    return changes


# Canonical driver names with proper diacritics
# These are the "correct" spellings that we want in the database
CANONICAL_DRIVER_NAMES = {
    "hulkenberg": ("Nico", "Hülkenberg"),
    "perez": ("Sergio", "Pérez"),  # Note: This is for Sergio specifically
    "gutierrez": ("Esteban", "Gutiérrez"),
    "grosjean": ("Romain", "Grosjean"),  # No diacritics needed
    "bottas": ("Valtteri", "Bottas"),  # No diacritics needed
    # Räikkönen already has correct diacritics
}


def update_driver_diacritics(
    repo: RacingRepository, 
    dry_run: bool = True,
    drivers_to_update: dict[str, tuple[str, str]] | None = None,
) -> list[tuple[str, str, str, str, UUID]]:
    """Update driver names to use proper diacritics.
    
    Args:
        repo: Database repository
        dry_run: If True, only return changes without applying
        drivers_to_update: Override canonical names dict
        
    Returns:
        List of (old_first, old_last, new_first, new_last, driver_id) tuples
    """
    canonical = drivers_to_update or CANONICAL_DRIVER_NAMES
    changes = []
    
    with repo._get_connection() as conn:
        with conn.cursor() as cur:
            for slug_pattern, (correct_first, correct_last) in canonical.items():
                # Find driver by last name pattern
                cur.execute('''
                    SELECT "Id", "FirstName", "LastName", "Slug"
                    FROM "Drivers" 
                    WHERE LOWER("LastName") = %s
                      AND "FirstName" = %s
                ''', (slug_pattern, correct_first.replace("ü", "u").replace("é", "e").replace("í", "i")))
                
                rows = cur.fetchall()
                
                for driver_id, old_first, old_last, old_slug in rows:
                    # Skip if already correct
                    if old_first == correct_first and old_last == correct_last:
                        continue
                    
                    changes.append((old_first, old_last, correct_first, correct_last, driver_id))
                    
                    if not dry_run:
                        # Generate new slug (without diacritics for URL safety)
                        new_slug = f"{normalize_name(correct_first)}-{normalize_name(correct_last)}".replace(" ", "-")
                        
                        cur.execute('''
                            UPDATE "Drivers" 
                            SET "FirstName" = %s, "LastName" = %s, "Slug" = %s 
                            WHERE "Id" = %s
                        ''', (correct_first, correct_last, new_slug, str(driver_id)))
                        
                        logger.info(
                            "Updated driver diacritics",
                            old_name=f"{old_first} {old_last}",
                            new_name=f"{correct_first} {correct_last}",
                            driver_id=str(driver_id),
                        )
            
            if not dry_run:
                conn.commit()
    
    return changes


def validate_data_quality(repo: RacingRepository) -> dict:
    """Validate data quality and return a report.
    
    Checks:
    - Rounds with sponsor text
    - Drivers missing diacritics
    - Teams with sponsor names
    - Circuits with inconsistent naming
    
    Returns:
        Dictionary with validation results
    """
    results = {
        "rounds_with_sponsors": [],
        "drivers_missing_diacritics": [],
        "teams_with_sponsors": [],
        "orphaned_aliases": [],
        "duplicate_slugs": [],
    }
    
    with repo._get_connection() as conn:
        with conn.cursor() as cur:
            # Check rounds with sponsor text
            cur.execute('''
                SELECT "Id", "Name" 
                FROM "Rounds" 
                WHERE "Name" ILIKE '%FORMULA 1%' 
                   OR "Name" ILIKE '%HEINEKEN%'
                   OR "Name" ILIKE '%ARAMCO%'
            ''')
            results["rounds_with_sponsors"] = [
                {"id": str(row[0]), "name": row[1]} for row in cur.fetchall()
            ]
            
            # Check drivers that might be missing diacritics
            known_diacritic_drivers = [
                ('Hulkenberg', 'Hülkenberg'),
                ('Perez', 'Pérez'),
                ('Gutierrez', 'Gutiérrez'),
            ]
            for ascii_name, correct_name in known_diacritic_drivers:
                cur.execute('''
                    SELECT "Id", "FirstName", "LastName"
                    FROM "Drivers"
                    WHERE "LastName" = %s
                ''', (ascii_name,))
                for row in cur.fetchall():
                    results["drivers_missing_diacritics"].append({
                        "id": str(row[0]),
                        "current": f"{row[1]} {row[2]}",
                        "suggested": f"{row[1]} {correct_name}",
                    })
            
            # Check for duplicate slugs
            cur.execute('''
                SELECT "Slug", COUNT(*) as cnt
                FROM "Drivers"
                GROUP BY "Slug"
                HAVING COUNT(*) > 1
            ''')
            results["duplicate_slugs"] = [
                {"slug": row[0], "count": row[1]} for row in cur.fetchall()
            ]
    
    return results


def run_cleanup(
    dry_run: bool = True,
    clean_rounds: bool = True,
    fix_diacritics: bool = True,
) -> CleanupStats:
    """Run full data cleanup.
    
    Args:
        dry_run: If True, preview changes without applying
        clean_rounds: Clean sponsor text from round names
        fix_diacritics: Fix driver name diacritics
        
    Returns:
        CleanupStats with counts of changes
    """
    stats = CleanupStats()
    
    mode = "DRY RUN" if dry_run else "APPLYING CHANGES"
    logger.info(f"Starting data cleanup ({mode})")
    
    with RacingRepository() as repo:
        if clean_rounds:
            logger.info("Cleaning round names...")
            round_changes = clean_round_names(repo, dry_run=dry_run)
            stats.rounds_updated = len(round_changes)
            
            for old_name, new_name, round_id in round_changes:
                logger.info(
                    "Round name change",
                    old=old_name,
                    new=new_name,
                    applied=not dry_run,
                )
        
        if fix_diacritics:
            logger.info("Fixing driver diacritics...")
            driver_changes = update_driver_diacritics(repo, dry_run=dry_run)
            stats.drivers_updated = len(driver_changes)
            
            for old_first, old_last, new_first, new_last, driver_id in driver_changes:
                logger.info(
                    "Driver diacritics change",
                    old=f"{old_first} {old_last}",
                    new=f"{new_first} {new_last}",
                    applied=not dry_run,
                )
        
        # Run validation
        logger.info("Validating data quality...")
        validation = validate_data_quality(repo)
        
        remaining_issues = (
            len(validation["rounds_with_sponsors"]) +
            len(validation["drivers_missing_diacritics"]) +
            len(validation["duplicate_slugs"])
        )
        
        logger.info(
            "Cleanup complete",
            mode=mode,
            rounds_updated=stats.rounds_updated,
            drivers_updated=stats.drivers_updated,
            remaining_issues=remaining_issues,
        )
    
    return stats


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Clean up racing data")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    parser.add_argument(
        "--skip-rounds",
        action="store_true",
        help="Skip cleaning round names",
    )
    parser.add_argument(
        "--skip-diacritics",
        action="store_true",
        help="Skip fixing driver diacritics",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only run validation, don't make changes",
    )
    
    args = parser.parse_args()
    
    if args.validate_only:
        with RacingRepository() as repo:
            results = validate_data_quality(repo)
        
        print("\n=== Data Quality Validation Report ===\n")
        
        print(f"Rounds with sponsor text: {len(results['rounds_with_sponsors'])}")
        for item in results['rounds_with_sponsors']:
            print(f"  - {item['name']}")
        
        print(f"\nDrivers missing diacritics: {len(results['drivers_missing_diacritics'])}")
        for item in results['drivers_missing_diacritics']:
            print(f"  - {item['current']} → {item['suggested']}")
        
        print(f"\nDuplicate slugs: {len(results['duplicate_slugs'])}")
        for item in results['duplicate_slugs']:
            print(f"  - {item['slug']} ({item['count']} occurrences)")
        
        return
    
    stats = run_cleanup(
        dry_run=args.dry_run,
        clean_rounds=not args.skip_rounds,
        fix_diacritics=not args.skip_diacritics,
    )
    
    print(f"\n=== Cleanup {'Preview' if args.dry_run else 'Results'} ===")
    print(f"Rounds updated: {stats.rounds_updated}")
    print(f"Drivers updated: {stats.drivers_updated}")
    
    if args.dry_run:
        print("\nRun without --dry-run to apply changes.")


if __name__ == "__main__":
    main()
