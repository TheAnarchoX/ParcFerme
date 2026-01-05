"""Health check script to verify all connections."""

import sys

import httpx
import psycopg
import redis

from ingestion.config import settings


def check_postgres() -> bool:
    """Check PostgreSQL connection."""
    try:
        with psycopg.connect(settings.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                print("✅ PostgreSQL: Connected")
                return True
    except Exception as e:
        print(f"❌ PostgreSQL: {e}")
        return False


def check_redis() -> bool:
    """Check Redis connection."""
    try:
        r = redis.from_url(settings.redis_url)
        r.ping()
        print("✅ Redis: Connected")
        return True
    except Exception as e:
        print(f"❌ Redis: {e}")
        return False


def check_openf1() -> bool:
    """Check OpenF1 API availability."""
    try:
        response = httpx.get(f"{settings.openf1_base_url}/sessions", params={"limit": 1})
        response.raise_for_status()
        print("✅ OpenF1 API: Available")
        return True
    except Exception as e:
        print(f"❌ OpenF1 API: {e}")
        return False


def main() -> int:
    """Run all health checks."""
    print("Parc Fermé Ingestion - Health Check")
    print("=" * 40)

    results = [
        check_postgres(),
        check_redis(),
        check_openf1(),
    ]

    print("=" * 40)
    if all(results):
        print("All systems operational! 🏁")
        return 0
    else:
        print("Some checks failed. See above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
