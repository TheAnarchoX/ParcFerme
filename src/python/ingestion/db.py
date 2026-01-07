"""
Database management commands for Parc Fermé.

Usage:
    python -m ingestion.db clean-racing   # Clear racing data tables (keeps user data)
    python -m ingestion.db audit          # Audit data quality
"""

import argparse
import sys
from typing import Any

import structlog  # type: ignore

from ingestion.config import settings
from ingestion.repository import RacingRepository

logger = structlog.get_logger()

# Racing data tables in dependency order (child tables first for FK constraints)
RACING_TABLES = [
    "Results",      # FK: Sessions, Entrants
    "Logs",         # FK: Sessions, Users - skip if has user data
    "Sessions",     # FK: Rounds
    "Entrants",     # FK: Rounds, Drivers, Teams
    "Rounds",       # FK: Seasons, Circuits
    "Seasons",      # FK: Series
    "Drivers",      # No FK to racing tables
    "Teams",        # No FK to racing tables  
    "Circuits",     # No FK to racing tables
    "Series",       # No FK to racing tables
]

# Tables to preserve (contain user data)
USER_TABLES = ["Logs", "Reviews", "Experiences", "AspNetUsers", "AspNetRoles"]


def clean_racing_data(preserve_user_data: bool = True) -> dict[str, int]:
    """Clean all racing data tables, optionally preserving user data.
    
    Returns dict of table -> rows deleted.
    """
    stats: dict[str, int] = {}
    repo = RacingRepository()
    
    try:
        repo.connect()
        
        with repo._get_connection() as conn:
            with conn.cursor() as cur:
                # Determine which tables to clean
                tables_to_clean = RACING_TABLES.copy()
                if preserve_user_data:
                    # Don't delete from tables that contain user data
                    tables_to_clean = [t for t in tables_to_clean if t not in USER_TABLES]
                    # Also skip Results if Logs exist (Results FK to Entrants which FK to Rounds)
                    # Actually Results doesn't FK to user tables, so it's safe
                
                for table in tables_to_clean:
                    # Check if table exists
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = %s
                        )
                    """, (table,))
                    exists = cur.fetchone()[0]
                    
                    if not exists:
                        logger.debug(f"Table {table} does not exist, skipping")
                        continue
                    
                    # Get row count before
                    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                    count_before = cur.fetchone()[0]
                    
                    if count_before == 0:
                        stats[table] = 0
                        continue
                    
                    # Truncate with cascade
                    logger.info(f"Cleaning {table}...", rows=count_before)
                    cur.execute(f'TRUNCATE TABLE "{table}" CASCADE')
                    stats[table] = count_before
                
                conn.commit()
                
        return stats
        
    finally:
        repo.close()


def audit_data_quality() -> dict[str, Any]:
    """Audit data quality across all racing tables.
    
    Checks for:
    - Null values in columns where data should exist
    - Data distribution and counts
    - Foreign key integrity
    """
    repo = RacingRepository()
    audit_results: dict[str, Any] = {}
    
    try:
        repo.connect()
        
        with repo._get_connection() as conn:
            with conn.cursor() as cur:
                # Series
                audit_results["Series"] = audit_table(cur, "Series", [
                    ("Id", False),
                    ("Name", False),
                    ("Slug", False),
                    ("LogoUrl", True),  # Optional
                ])
                
                # Seasons
                audit_results["Seasons"] = audit_table(cur, "Seasons", [
                    ("Id", False),
                    ("SeriesId", False),
                    ("Year", False),
                ])
                
                # Circuits
                audit_results["Circuits"] = audit_table(cur, "Circuits", [
                    ("Id", False),
                    ("Name", False),
                    ("Slug", False),
                    ("Location", False),
                    ("Country", False),
                    ("CountryCode", True),  # May be null
                    ("LayoutMapUrl", True),  # Optional
                    ("Latitude", True),  # Optional
                    ("Longitude", True),  # Optional
                    ("LengthMeters", True),  # Optional
                ])
                
                # Rounds
                audit_results["Rounds"] = audit_table(cur, "Rounds", [
                    ("Id", False),
                    ("SeasonId", False),
                    ("CircuitId", False),
                    ("Name", False),
                    ("Slug", False),
                    ("RoundNumber", False),
                    ("DateStart", False),
                    ("DateEnd", False),
                    ("OpenF1MeetingKey", False),  # Should have this from sync
                ])
                
                # Sessions
                audit_results["Sessions"] = audit_table(cur, "Sessions", [
                    ("Id", False),
                    ("RoundId", False),
                    ("Type", False),
                    ("StartTimeUtc", False),
                    ("Status", False),
                    ("OpenF1SessionKey", False),  # Should have this from sync
                ])
                
                # Drivers
                audit_results["Drivers"] = audit_table(cur, "Drivers", [
                    ("Id", False),
                    ("FirstName", False),
                    ("LastName", False),
                    ("Slug", False),
                    ("Abbreviation", True),  # May be null for some drivers
                    ("Nationality", True),  # May be null
                    ("HeadshotUrl", True),  # May be null
                ])
                
                # Teams
                audit_results["Teams"] = audit_table(cur, "Teams", [
                    ("Id", False),
                    ("Name", False),
                    ("Slug", False),
                    ("ShortName", True),  # Optional
                    ("LogoUrl", True),  # Optional
                    ("PrimaryColor", True),  # May be null
                ])
                
                # Entrants
                audit_results["Entrants"] = audit_table(cur, "Entrants", [
                    ("Id", False),
                    ("RoundId", False),
                    ("DriverId", False),
                    ("TeamId", False),
                ])
                
                # Results
                audit_results["Results"] = audit_table(cur, "Results", [
                    ("Id", False),
                    ("SessionId", False),
                    ("EntrantId", False),
                    ("Position", True),  # Can be null for DNF/DNS
                    ("GridPosition", True),  # Optional
                    ("Status", False),
                    ("Points", True),  # Optional
                    ("Time", True),  # Optional
                    ("Laps", True),  # Optional
                    ("FastestLap", False),
                ])
                
                # Session type distribution
                cur.execute("""
                    SELECT "Type", COUNT(*) as count
                    FROM "Sessions"
                    GROUP BY "Type"
                    ORDER BY "Type"
                """)
                audit_results["SessionTypeDistribution"] = {
                    row[0]: row[1] for row in cur.fetchall()
                }
                
                # Season summary
                cur.execute("""
                    SELECT se."Year", 
                           COUNT(DISTINCT r."Id") as rounds,
                           COUNT(DISTINCT s."Id") as sessions
                    FROM "Seasons" se
                    LEFT JOIN "Rounds" r ON r."SeasonId" = se."Id"
                    LEFT JOIN "Sessions" s ON s."RoundId" = r."Id"
                    GROUP BY se."Year"
                    ORDER BY se."Year"
                """)
                audit_results["SeasonSummary"] = [
                    {"year": row[0], "rounds": row[1], "sessions": row[2]}
                    for row in cur.fetchall()
                ]
                
        return audit_results
        
    finally:
        repo.close()


def audit_table(cur, table: str, columns: list[tuple[str, bool]]) -> dict[str, Any]:
    """Audit a single table for null values and data quality.
    
    Args:
        cur: Database cursor
        table: Table name
        columns: List of (column_name, nullable) tuples
        
    Returns:
        Dict with audit results
    """
    result: dict[str, Any] = {"columns": {}}
    
    # Check if table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = %s
        )
    """, (table,))
    if not cur.fetchone()[0]:
        result["exists"] = False
        result["total_rows"] = 0
        return result
    
    result["exists"] = True
    
    # Get total row count
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    result["total_rows"] = cur.fetchone()[0]
    
    if result["total_rows"] == 0:
        return result
    
    # Check each column for nulls
    for column, nullable in columns:
        try:
            cur.execute(f'''
                SELECT 
                    COUNT(*) FILTER (WHERE "{column}" IS NULL) as null_count,
                    COUNT(*) FILTER (WHERE "{column}" IS NOT NULL) as not_null_count
                FROM "{table}"
            ''')
            row = cur.fetchone()
            null_count, not_null_count = row[0], row[1]
            
            col_result = {
                "null_count": null_count,
                "not_null_count": not_null_count,
                "null_pct": round(null_count / result["total_rows"] * 100, 1) if result["total_rows"] > 0 else 0,
                "nullable": nullable,
            }
            
            # Flag unexpected nulls (column marked as not nullable but has nulls)
            if not nullable and null_count > 0:
                col_result["WARNING"] = f"Unexpected nulls in non-nullable column!"
            
            result["columns"][column] = col_result
            
        except Exception as e:
            result["columns"][column] = {"error": str(e)}
    
    # Sample some data for manual inspection
    try:
        cur.execute(f'SELECT * FROM "{table}" LIMIT 5')
        col_names = [desc[0] for desc in cur.description]
        result["sample_data"] = [dict(zip(col_names, row)) for row in cur.fetchall()]
    except Exception as e:
        result["sample_error"] = str(e)
    
    return result


def print_audit_report(audit: dict[str, Any]) -> None:
    """Print a formatted audit report."""
    print("\n" + "=" * 80)
    print("🔍 DATA QUALITY AUDIT REPORT")
    print("=" * 80)
    
    # Session type distribution
    if "SessionTypeDistribution" in audit:
        print("\n📊 SESSION TYPE DISTRIBUTION:")
        type_names = {
            0: "FP1", 1: "FP2", 2: "FP3",
            3: "Qualifying", 4: "Sprint Qualifying", 5: "Sprint",
            6: "Race", 7: "Warmup",
            8: "Moto3 Race", 9: "Moto2 Race", 10: "MotoGP Race"
        }
        for type_id, count in audit["SessionTypeDistribution"].items():
            name = type_names.get(type_id, f"Type {type_id}")
            print(f"  {name:20s} {count:5d}")
    
    # Season summary
    if "SeasonSummary" in audit:
        print("\n📅 SEASON SUMMARY:")
        for s in audit["SeasonSummary"]:
            print(f"  {s['year']}: {s['rounds']} rounds, {s['sessions']} sessions")
    
    # Table-by-table analysis
    print("\n📋 TABLE ANALYSIS:")
    
    warnings = []
    
    for table_name in ["Series", "Seasons", "Circuits", "Rounds", "Sessions", 
                       "Drivers", "Teams", "Entrants", "Results"]:
        if table_name not in audit:
            continue
            
        table_data = audit[table_name]
        print(f"\n  ═══ {table_name} ═══")
        
        if not table_data.get("exists", True):
            print(f"    ⚠️  Table does not exist")
            continue
            
        print(f"    Total rows: {table_data.get('total_rows', 0)}")
        
        if table_data.get("total_rows", 0) == 0:
            print(f"    (empty table)")
            continue
        
        # Column analysis
        columns = table_data.get("columns", {})
        if columns:
            print(f"    {'Column':<25} {'Nulls':>8} {'Non-Null':>10} {'%Null':>8} {'Status':<15}")
            print(f"    {'-'*25} {'-'*8} {'-'*10} {'-'*8} {'-'*15}")
            
            for col_name, col_data in columns.items():
                if "error" in col_data:
                    print(f"    {col_name:<25} ERROR: {col_data['error']}")
                    continue
                    
                null_count = col_data.get("null_count", 0)
                not_null = col_data.get("not_null_count", 0)
                null_pct = col_data.get("null_pct", 0)
                nullable = col_data.get("nullable", True)
                
                if "WARNING" in col_data:
                    status = "⚠️  UNEXPECTED"
                    warnings.append(f"{table_name}.{col_name}: {null_count} unexpected nulls")
                elif null_count > 0 and nullable:
                    status = "✅ (nullable)"
                elif null_count == 0:
                    status = "✅"
                else:
                    status = ""
                
                print(f"    {col_name:<25} {null_count:>8} {not_null:>10} {null_pct:>7.1f}% {status:<15}")
    
    # Summary
    print("\n" + "=" * 80)
    if warnings:
        print("⚠️  WARNINGS FOUND:")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("✅ No unexpected null values found!")
    print("=" * 80 + "\n")


def cmd_clean(args: argparse.Namespace) -> int:
    """Clean racing data tables."""
    print("🧹 Cleaning racing data tables...")
    print("   (User data will be preserved)\n")
    
    if not args.yes:
        confirm = input("Are you sure you want to delete all racing data? [y/N] ")
        if confirm.lower() != 'y':
            print("Cancelled.")
            return 0
    
    stats = clean_racing_data(preserve_user_data=True)
    
    print("\n📊 Cleanup Results:")
    total = 0
    for table, count in stats.items():
        if count > 0:
            print(f"  {table}: {count} rows deleted")
            total += count
    
    print(f"\nTotal: {total} rows deleted")
    print("✅ Cleanup complete!")
    return 0


def cmd_audit(args: argparse.Namespace) -> int:
    """Run data quality audit."""
    print("🔍 Running data quality audit...")
    
    audit = audit_data_quality()
    print_audit_report(audit)
    
    return 0


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog="parcferme-db",
        description="Database management for Parc Fermé",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Clean command
    clean_parser = subparsers.add_parser("clean-racing", help="Clean racing data tables")
    clean_parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation")
    clean_parser.set_defaults(func=cmd_clean)
    
    # Audit command
    audit_parser = subparsers.add_parser("audit", help="Audit data quality")
    audit_parser.set_defaults(func=cmd_audit)
    
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
