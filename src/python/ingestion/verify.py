"""
Database verification utility for checking synced data.

Usage:
    python -m ingestion.verify
"""

import sys

import structlog  # type: ignore

from ingestion.config import settings
from ingestion.repository import RacingRepository

logger = structlog.get_logger()


def verify_database() -> dict:
    """Check what data has been synced to the database."""
    repo = RacingRepository()
    
    try:
        repo.connect()
        
        # Query statistics
        with repo._get_connection() as conn:
          with conn.cursor() as cur:
            stats = {}
            
            # Series
            cur.execute('SELECT COUNT(*) FROM "Series"')
            stats['series'] = cur.fetchone()[0]
            
            # Seasons by year
            cur.execute('''
                SELECT "Year", COUNT(*) as rounds
                FROM "Seasons" s
                JOIN "Rounds" r ON r."SeasonId" = s."Id"
                GROUP BY "Year"
                ORDER BY "Year" DESC
            ''')
            stats['seasons'] = cur.fetchall()
            
            # Total counts
            cur.execute('SELECT COUNT(*) FROM "Rounds"')
            stats['total_rounds'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Sessions"')
            stats['total_sessions'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Drivers"')
            stats['total_drivers'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Teams"')
            stats['total_teams'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Circuits"')
            stats['total_circuits'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Results"')
            stats['total_results'] = cur.fetchone()[0]
            
            # Session types breakdown
            cur.execute('''
                SELECT "Type", COUNT(*) as count
                FROM "Sessions"
                GROUP BY "Type"
                ORDER BY "Type"
            ''')
            stats['session_types'] = cur.fetchall()
            
            # Most recent session
            cur.execute('''
                SELECT ses."StartTimeUtc", r."Name", ses."Type"
                FROM "Sessions" ses
                JOIN "Rounds" r ON r."Id" = ses."RoundId"
                JOIN "Seasons" s ON s."Id" = r."SeasonId"
                ORDER BY ses."StartTimeUtc" DESC
                LIMIT 1
            ''')
            latest = cur.fetchone()
            if latest:
                stats['latest_session'] = {
                    'time': latest[0],
                    'round': latest[1],
                    'type': latest[2],
                }
            
            return stats
            
    finally:
        repo.close()


def print_verification_report(stats: dict) -> None:
    """Print a formatted verification report."""
    print("\n" + "=" * 70)
    print("📊 DATABASE VERIFICATION REPORT")
    print("=" * 70)
    
    print(f"\n🏁 SERIES & SEASONS:")
    print(f"  Total series:       {stats['series']}")
    print(f"  Seasons with data:  {len(stats['seasons'])}")
    
    if stats['seasons']:
        print(f"\n  Seasons breakdown:")
        for year, rounds in stats['seasons']:
            print(f"    {year}: {rounds} rounds")
    
    print(f"\n📈 AGGREGATE COUNTS:")
    print(f"  Rounds (weekends):  {stats['total_rounds']}")
    print(f"  Sessions:           {stats['total_sessions']}")
    print(f"  Circuits:           {stats['total_circuits']}")
    print(f"  Drivers:            {stats['total_drivers']}")
    print(f"  Teams:              {stats['total_teams']}")
    print(f"  Results:            {stats['total_results']}")
    
    if stats['session_types']:
        print(f"\n🎯 SESSION TYPES:")
        type_names = {
            0: "FP1", 1: "FP2", 2: "FP3",
            3: "Qualifying",
            4: "Sprint Qualifying", 5: "Sprint",
            6: "Race",
            7: "Warmup",
            8: "Moto3 Race", 9: "Moto2 Race", 10: "MotoGP Race"
        }
        for session_type, count in stats['session_types']:
            type_name = type_names.get(session_type, f"Type {session_type}")
            print(f"  {type_name:20s} {count:4d}")
    
    if 'latest_session' in stats:
        latest = stats['latest_session']
        print(f"\n🕒 LATEST SESSION:")
        print(f"  Round: {latest['round']}")
        print(f"  Type:  {latest['type']}")
        print(f"  Time:  {latest['time']}")
    
    print("\n" + "=" * 70)
    print("✅ Verification complete")
    print("=" * 70 + "\n")


def main() -> int:
    """Main entry point."""
    print("Connecting to database...")
    print(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'configured'}")
    
    try:
        stats = verify_database()
        print_verification_report(stats)
        return 0
    except Exception as e:
        logger.error("Verification failed", error=str(e), exc_info=True)
        print(f"\n❌ Verification failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
