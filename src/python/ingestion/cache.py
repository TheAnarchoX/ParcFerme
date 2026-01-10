"""
Cache management utilities for Parc Fermé.

Provides CLI commands for clearing and warming the Redis cache.

Usage:
    python -m ingestion.cache clear         # Clear all cache
    python -m ingestion.cache clear --prefix ParcFerme:circuits  # Clear by prefix
    python -m ingestion.cache warm          # Warm commonly accessed caches
    python -m ingestion.cache stats         # Show cache statistics
"""

import argparse
import sys
from typing import Any

import httpx
import redis
import structlog

from ingestion.config import settings

logger = structlog.get_logger()


def get_redis_client() -> redis.Redis:
    """Get Redis client connection."""
    return redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        decode_responses=True,
    )


def cmd_clear(args: argparse.Namespace) -> int:
    """Clear cache entries."""
    client = get_redis_client()
    
    try:
        client.ping()
    except redis.ConnectionError:
        logger.error("Cannot connect to Redis", host=settings.redis_host, port=settings.redis_port)
        return 1
    
    if args.prefix:
        # Clear by prefix pattern
        pattern = f"{args.prefix}*"
        logger.info("Clearing cache by pattern", pattern=pattern)
        
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                deleted += client.delete(*keys)
            if cursor == 0:
                break
        
        logger.info("Cache cleared", deleted_keys=deleted, pattern=pattern)
        print(f"✅ Cleared {deleted} cache keys matching '{pattern}'")
    elif args.all:
        # Clear everything
        logger.warning("Flushing entire Redis database")
        client.flushdb()
        print("✅ Flushed entire Redis database")
    else:
        # Default: clear only ParcFerme app keys
        pattern = "ParcFerme:*"
        logger.info("Clearing application cache", pattern=pattern)
        
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                deleted += client.delete(*keys)
            if cursor == 0:
                break
        
        logger.info("Application cache cleared", deleted_keys=deleted)
        print(f"✅ Cleared {deleted} application cache keys")
    
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Show cache statistics."""
    client = get_redis_client()
    
    try:
        client.ping()
    except redis.ConnectionError:
        logger.error("Cannot connect to Redis", host=settings.redis_host, port=settings.redis_port)
        return 1
    
    info = client.info("memory")
    keyspace = client.info("keyspace")
    
    print("\n" + "=" * 50)
    print("REDIS CACHE STATISTICS")
    print("=" * 50)
    print(f"Host:          {settings.redis_host}:{settings.redis_port}")
    print(f"Used memory:   {info.get('used_memory_human', 'N/A')}")
    print(f"Peak memory:   {info.get('used_memory_peak_human', 'N/A')}")
    
    # Count keys by prefix
    prefixes: dict[str, int] = {}
    cursor = 0
    total_keys = 0
    
    while True:
        cursor, keys = client.scan(cursor=cursor, match="ParcFerme:*", count=100)
        for key in keys:
            total_keys += 1
            # Extract first two segments as prefix (e.g., "ParcFerme:circuits")
            parts = key.split(":")
            if len(parts) >= 2:
                prefix = f"{parts[0]}:{parts[1]}"
                prefixes[prefix] = prefixes.get(prefix, 0) + 1
        if cursor == 0:
            break
    
    print(f"\nApplication keys: {total_keys}")
    
    if prefixes:
        print("\nKeys by category:")
        for prefix, count in sorted(prefixes.items(), key=lambda x: -x[1]):
            print(f"  {prefix}: {count}")
    
    return 0


def _warm_paginated_endpoint(
    http: httpx.Client,
    api_base: str,
    endpoint_base: str,
    page_size: int,
    entity_name: str,
) -> tuple[int, int, list[dict]]:
    """Warm all pages of a paginated endpoint, returns (success, failed, all_items)."""
    success = 0
    failed = 0
    all_items: list[dict] = []
    page = 1
    
    while True:
        endpoint = f"{endpoint_base}?page={page}&pageSize={page_size}"
        url = f"{api_base}{endpoint}"
        try:
            resp = http.get(url)
            if resp.status_code == 200:
                success += 1
                data = resp.json()
                items = data.get("items", [])
                all_items.extend(items)
                total = data.get("totalCount", 0)
                print(f"  ✅ {endpoint} ({len(items)} {entity_name}, page {page}/{(total + page_size - 1) // page_size})")
                
                # Check if there are more pages
                if len(items) < page_size or len(all_items) >= total:
                    break
                page += 1
            else:
                failed += 1
                print(f"  ⚠️  {endpoint} (status {resp.status_code})")
                break
        except httpx.RequestError as e:
            failed += 1
            print(f"  ❌ {endpoint} (error: {e})")
            break
    
    return success, failed, all_items


def _warm_entity_details(
    http: httpx.Client,
    api_base: str,
    endpoint_base: str,
    items: list[dict],
    entity_name: str,
) -> tuple[int, int]:
    """Warm individual entity detail pages."""
    success = 0
    failed = 0
    
    for item in items:
        slug = item.get("slug")
        if not slug:
            continue
        url = f"{api_base}{endpoint_base}/{slug}"
        try:
            resp = http.get(url)
            if resp.status_code == 200:
                success += 1
                print(f"  ✅ {endpoint_base}/{slug}")
            else:
                failed += 1
                print(f"  ⚠️  {endpoint_base}/{slug} (status {resp.status_code})")
        except httpx.RequestError as e:
            failed += 1
            print(f"  ❌ {endpoint_base}/{slug} (error: {e})")
    
    return success, failed


def cmd_warm(args: argparse.Namespace) -> int:
    """Warm the cache by hitting common API endpoints."""
    client = get_redis_client()
    
    try:
        client.ping()
    except redis.ConnectionError:
        logger.error("Cannot connect to Redis", host=settings.redis_host, port=settings.redis_port)
        return 1
    
    api_base = args.api_url.rstrip("/")
    logger.info("Warming cache", api_base=api_base, full=args.full)
    
    success = 0
    failed = 0
    
    print(f"\n🔥 Warming cache from {api_base}...")
    print("=" * 60)
    
    with httpx.Client(timeout=30.0, headers={"Accept": "application/json"}) as http:
        # === SERIES ===
        print("\n📺 Series...")
        try:
            resp = http.get(f"{api_base}/api/v1/series")
            if resp.status_code == 200:
                success += 1
                series_data = resp.json()
                print(f"  ✅ /api/v1/series ({len(series_data)} series)")
            else:
                failed += 1
                print(f"  ⚠️  /api/v1/series (status {resp.status_code})")
                series_data = []
        except httpx.RequestError as e:
            failed += 1
            print(f"  ❌ /api/v1/series (error: {e})")
            series_data = []
        
        # === SEASONS ===
        print("\n📅 Seasons...")
        all_seasons: list[dict] = []
        years_to_warm = [2024, 2025, 2026] if args.full else [2025, 2026]
        for year in years_to_warm:
            endpoint = f"/api/v1/seasons?year={year}"
            try:
                resp = http.get(f"{api_base}{endpoint}")
                if resp.status_code == 200:
                    success += 1
                    data = resp.json()
                    seasons = data if isinstance(data, list) else data.get("items", [])
                    all_seasons.extend(seasons)
                    print(f"  ✅ {endpoint} ({len(seasons)} seasons)")
                else:
                    failed += 1
                    print(f"  ⚠️  {endpoint} (status {resp.status_code})")
            except httpx.RequestError as e:
                failed += 1
                print(f"  ❌ {endpoint} (error: {e})")
        
        # === CIRCUITS ===
        print("\n🏁 Circuits...")
        if args.full:
            s, f, circuits = _warm_paginated_endpoint(
                http, api_base, "/api/v1/circuits", 50, "circuits"
            )
            success += s
            failed += f
        else:
            # Just first page
            try:
                resp = http.get(f"{api_base}/api/v1/circuits?page=1&pageSize=24")
                if resp.status_code == 200:
                    success += 1
                    circuits = resp.json().get("items", [])
                    print(f"  ✅ /api/v1/circuits?page=1&pageSize=24 ({len(circuits)} circuits)")
                else:
                    failed += 1
                    circuits = []
            except httpx.RequestError:
                failed += 1
                circuits = []
        
        # === DRIVERS ===
        print("\n🏎️  Drivers...")
        if args.full:
            s, f, drivers = _warm_paginated_endpoint(
                http, api_base, "/api/v1/drivers", 100, "drivers"
            )
            success += s
            failed += f
        else:
            # Just first page
            try:
                resp = http.get(f"{api_base}/api/v1/drivers?page=1&pageSize=50")
                if resp.status_code == 200:
                    success += 1
                    drivers = resp.json().get("items", [])
                    print(f"  ✅ /api/v1/drivers?page=1&pageSize=50 ({len(drivers)} drivers)")
                else:
                    failed += 1
                    drivers = []
            except httpx.RequestError:
                failed += 1
                drivers = []
        
        # === TEAMS ===
        print("\n🏢 Teams...")
        if args.full:
            s, f, teams = _warm_paginated_endpoint(
                http, api_base, "/api/v1/teams", 100, "teams"
            )
            success += s
            failed += f
        else:
            # Just first page
            try:
                resp = http.get(f"{api_base}/api/v1/teams?page=1&pageSize=50")
                if resp.status_code == 200:
                    success += 1
                    teams = resp.json().get("items", [])
                    print(f"  ✅ /api/v1/teams?page=1&pageSize=50 ({len(teams)} teams)")
                else:
                    failed += 1
                    teams = []
            except httpx.RequestError:
                failed += 1
                teams = []
        
        # === INDIVIDUAL ENTITY DETAILS (full mode only) ===
        if args.full:
            print("\n🔍 Circuit details...")
            s, f = _warm_entity_details(http, api_base, "/api/v1/circuits", circuits, "circuit")
            success += s
            failed += f
            
            print("\n🔍 Driver details...")
            s, f = _warm_entity_details(http, api_base, "/api/v1/drivers", drivers, "driver")
            success += s
            failed += f
            
            print("\n🔍 Team details...")
            s, f = _warm_entity_details(http, api_base, "/api/v1/teams", teams, "team")
            success += s
            failed += f
            
            # === ROUNDS (for recent seasons) ===
            print("\n📆 Rounds for recent seasons...")
            for season in all_seasons:
                season_id = season.get("id")
                year = season.get("year")
                series_name = season.get("seriesName", "")
                if season_id:
                    endpoint = f"/api/v1/seasons/{season_id}/rounds"
                    try:
                        resp = http.get(f"{api_base}{endpoint}")
                        if resp.status_code == 200:
                            success += 1
                            rounds = resp.json()
                            rounds_list = rounds if isinstance(rounds, list) else rounds.get("items", [])
                            print(f"  ✅ {endpoint} ({len(rounds_list)} rounds for {series_name} {year})")
                            
                            # Warm individual round detail pages
                            for round_data in rounds_list:
                                round_slug = round_data.get("slug")
                                if round_slug:
                                    round_endpoint = f"/api/v1/rounds/{round_slug}"
                                    try:
                                        r = http.get(f"{api_base}{round_endpoint}")
                                        if r.status_code == 200:
                                            success += 1
                                            print(f"    ✅ {round_endpoint}")
                                        else:
                                            failed += 1
                                    except httpx.RequestError:
                                        failed += 1
                        else:
                            failed += 1
                            print(f"  ⚠️  {endpoint} (status {resp.status_code})")
                    except httpx.RequestError as e:
                        failed += 1
                        print(f"  ❌ {endpoint} (error: {e})")
    
    print("=" * 60)
    print(f"\n✅ Cache warming complete: {success} successful, {failed} failed")
    
    # Show updated stats
    cursor = 0
    total_keys = 0
    while True:
        cursor, keys = client.scan(cursor=cursor, match="ParcFerme:*", count=100)
        total_keys += len(keys)
        if cursor == 0:
            break
    
    print(f"📊 Total application cache keys: {total_keys}")
    
    return 0 if failed == 0 else 1


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog="parcferme-cache",
        description="Parc Fermé cache management CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Clear command
    clear_parser = subparsers.add_parser("clear", help="Clear cache entries")
    clear_parser.add_argument(
        "--prefix",
        help="Only clear keys with this prefix (e.g., 'ParcFerme:circuits')",
    )
    clear_parser.add_argument(
        "--all",
        action="store_true",
        help="Flush entire Redis database (use with caution)",
    )
    clear_parser.set_defaults(func=cmd_clear)
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show cache statistics")
    stats_parser.set_defaults(func=cmd_stats)
    
    # Warm command
    warm_parser = subparsers.add_parser("warm", help="Warm the cache")
    warm_parser.add_argument(
        "--api-url",
        default="http://localhost:5000",
        help="Base URL of the API (default: http://localhost:5000)",
    )
    warm_parser.add_argument(
        "--full",
        action="store_true",
        help="Perform full warming including individual entity pages",
    )
    warm_parser.set_defaults(func=cmd_warm)
    
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
