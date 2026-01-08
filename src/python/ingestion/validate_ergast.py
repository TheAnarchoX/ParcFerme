#!/usr/bin/env python3
"""
Ergast Data Validation Script.

Validates the Ergast historical F1 data import against source data,
identifies discrepancies, and provides fixes.

Usage:
    # Run full validation
    python -m ingestion.validate_ergast
    
    # Check specific year
    python -m ingestion.validate_ergast --year 2017
    
    # Spot-check famous races
    python -m ingestion.validate_ergast --famous-races
    
    # Fix result import issues
    python -m ingestion.validate_ergast --fix-results
"""

from __future__ import annotations

import argparse
import sys
import unicodedata
from dataclasses import dataclass
from typing import Any

import structlog

from ingestion.config import settings

logger = structlog.get_logger()


@dataclass
class ValidationResult:
    """Result of a validation check."""
    check_name: str
    passed: bool
    expected: int | str | None = None
    actual: int | str | None = None
    details: str | None = None
    
    def __str__(self) -> str:
        status = "✅" if self.passed else "❌"
        result = f"{status} {self.check_name}"
        if self.expected is not None and self.actual is not None:
            result += f" (expected: {self.expected}, actual: {self.actual})"
        if self.details:
            result += f"\n   {self.details}"
        return result


def normalize_name(name: str) -> str:
    """Normalize a name for comparison (remove accents, lowercase)."""
    # Normalize to NFD (decomposed form), then remove accent marks
    normalized = unicodedata.normalize('NFD', name)
    ascii_name = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    return ascii_name.lower().strip()


def get_db_connection(db_url: str):
    """Get a database connection."""
    import psycopg
    return psycopg.connect(db_url)


def validate_row_counts(parcferme_conn, ergast_conn) -> list[ValidationResult]:
    """Validate that row counts match expected Ergast data."""
    results = []
    
    checks = [
        {
            "name": "Historical Rounds (1950-2017)",
            "parcferme_query": """
                SELECT COUNT(*) FROM "Rounds" r
                JOIN "Seasons" s ON r."SeasonId" = s."Id"
                WHERE s."Year" BETWEEN 1950 AND 2017
            """,
            "ergast_query": "SELECT COUNT(*) FROM races WHERE year BETWEEN 1950 AND 2017",
        },
        {
            "name": "Circuits",
            "parcferme_query": 'SELECT COUNT(*) FROM "Circuits"',
            "ergast_query": "SELECT COUNT(*) FROM circuits",
            "compare": "gte",  # We have more (modern + historical)
        },
        {
            "name": "Drivers",
            "parcferme_query": 'SELECT COUNT(*) FROM "Drivers"',
            "ergast_query": "SELECT COUNT(*) FROM drivers",
            "compare": "gte",
        },
        {
            "name": "Teams/Constructors",
            "parcferme_query": 'SELECT COUNT(*) FROM "Teams"',
            "ergast_query": "SELECT COUNT(*) FROM constructors",
            "compare": "gte",
        },
    ]
    
    with parcferme_conn.cursor() as pcur, ergast_conn.cursor() as ecur:
        for check in checks:
            pcur.execute(check["parcferme_query"])
            parcferme_count = pcur.fetchone()[0]
            
            ecur.execute(check["ergast_query"])
            ergast_count = ecur.fetchone()[0]
            
            compare_mode = check.get("compare", "eq")
            if compare_mode == "eq":
                passed = parcferme_count == ergast_count
            elif compare_mode == "gte":
                passed = parcferme_count >= ergast_count
            else:
                passed = parcferme_count == ergast_count
            
            results.append(ValidationResult(
                check_name=check["name"],
                passed=passed,
                expected=ergast_count,
                actual=parcferme_count,
            ))
    
    return results


def validate_results_by_year(parcferme_conn, ergast_conn, year: int) -> dict[str, Any]:
    """Validate results for a specific year and identify discrepancies."""
    
    discrepancies = []
    
    # Get race results per round from both databases
    parcferme_query = """
        SELECT r."Name", r."RoundNumber", COUNT(res."Id") as result_count
        FROM "Rounds" r
        JOIN "Seasons" s ON r."SeasonId" = s."Id"
        JOIN "Sessions" sess ON sess."RoundId" = r."Id" AND sess."Type" = 6
        LEFT JOIN "Results" res ON res."SessionId" = sess."Id"
        WHERE s."Year" = %s
        GROUP BY r."Id", r."Name", r."RoundNumber"
        ORDER BY r."RoundNumber"
    """
    
    ergast_query = """
        SELECT ra.name, ra.round, COUNT(res."resultId") as result_count
        FROM races ra
        LEFT JOIN results res ON res."raceId" = ra."raceId"
        WHERE ra.year = %s
        GROUP BY ra."raceId", ra.name, ra.round
        ORDER BY ra.round
    """
    
    with parcferme_conn.cursor() as pcur, ergast_conn.cursor() as ecur:
        pcur.execute(parcferme_query, (year,))
        parcferme_results = {row[0]: row[2] for row in pcur.fetchall()}
        
        ecur.execute(ergast_query, (year,))
        ergast_results = {row[0]: row[2] for row in ecur.fetchall()}
    
    total_expected = sum(ergast_results.values())
    total_actual = sum(parcferme_results.values())
    
    for race_name, expected_count in ergast_results.items():
        actual_count = parcferme_results.get(race_name, 0)
        if actual_count != expected_count:
            discrepancies.append({
                "race": race_name,
                "expected": expected_count,
                "actual": actual_count,
                "missing": expected_count - actual_count,
            })
    
    return {
        "year": year,
        "expected_total": total_expected,
        "actual_total": total_actual,
        "missing_total": total_expected - total_actual,
        "discrepancies": discrepancies,
    }


def identify_name_mismatches(parcferme_conn, ergast_conn, year: int) -> list[dict]:
    """Identify driver name mismatches that prevent result imports."""
    
    mismatches = []
    
    # Get Ergast drivers for the year with their normalized names
    ergast_query = """
        SELECT DISTINCT d.forename, d.surname, d."driverRef"
        FROM results res
        JOIN races ra ON res."raceId" = ra."raceId"
        JOIN drivers d ON res."driverId" = d."driverId"
        WHERE ra.year = %s
        ORDER BY d.surname
    """
    
    # Get ParcFerme drivers for the year
    parcferme_query = """
        SELECT DISTINCT d."FirstName", d."LastName", d."Slug"
        FROM "Entrants" e
        JOIN "Rounds" r ON e."RoundId" = r."Id"
        JOIN "Seasons" s ON r."SeasonId" = s."Id"
        JOIN "Drivers" d ON e."DriverId" = d."Id"
        WHERE s."Year" = %s
        ORDER BY d."LastName"
    """
    
    with parcferme_conn.cursor() as pcur, ergast_conn.cursor() as ecur:
        ecur.execute(ergast_query, (year,))
        ergast_drivers = {
            normalize_name(f"{row[0]} {row[1]}"): {
                "original_name": f"{row[0]} {row[1]}",
                "ref": row[2],
            }
            for row in ecur.fetchall()
        }
        
        pcur.execute(parcferme_query, (year,))
        parcferme_drivers = {
            normalize_name(f"{row[0]} {row[1]}"): {
                "original_name": f"{row[0]} {row[1]}",
                "slug": row[2],
            }
            for row in pcur.fetchall()
        }
    
    # Find Ergast drivers not in ParcFerme (normalized comparison)
    for norm_name, ergast_info in ergast_drivers.items():
        if norm_name not in parcferme_drivers:
            # Check if there's a close match
            close_match = None
            for pf_norm, pf_info in parcferme_drivers.items():
                if pf_norm.replace(" ", "") == norm_name.replace(" ", ""):
                    close_match = pf_info
                    break
            
            mismatches.append({
                "ergast_name": ergast_info["original_name"],
                "ergast_ref": ergast_info["ref"],
                "normalized": norm_name,
                "parcferme_match": close_match["original_name"] if close_match else None,
                "issue": "Name mismatch - special characters" if close_match else "Driver not found in ParcFerme",
            })
    
    return mismatches


def spot_check_famous_races(parcferme_conn, ergast_conn) -> list[ValidationResult]:
    """Spot-check famous/important historical races."""
    
    famous_races = [
        {"year": 1950, "round": 1, "name": "1950 British GP (first F1 race)", "expected_starters": 21},
        {"year": 1976, "round": 16, "name": "1976 Japanese GP (Hunt vs Lauda)", "expected_starters": 25},
        {"year": 1994, "round": 3, "name": "1994 San Marino GP (Senna)", "expected_starters": 26},
        {"year": 2008, "round": 18, "name": "2008 Brazilian GP (Hamilton champion)", "expected_starters": 20},
        {"year": 2010, "round": 19, "name": "2010 Abu Dhabi GP (4-way title)", "expected_starters": 24},
        {"year": 2016, "round": 21, "name": "2016 Abu Dhabi GP (Rosberg champion)", "expected_starters": 22},
    ]
    
    results = []
    
    for race in famous_races:
        # Get Ergast result count
        ergast_query = """
            SELECT COUNT(*) FROM results res
            JOIN races ra ON res."raceId" = ra."raceId"
            WHERE ra.year = %s AND ra.round = %s
        """
        
        # Get ParcFerme result count
        parcferme_query = """
            SELECT COUNT(*) FROM "Results" res
            JOIN "Sessions" sess ON res."SessionId" = sess."Id"
            JOIN "Rounds" r ON sess."RoundId" = r."Id"
            JOIN "Seasons" s ON r."SeasonId" = s."Id"
            WHERE s."Year" = %s AND r."RoundNumber" = %s AND sess."Type" = 6
        """
        
        with parcferme_conn.cursor() as pcur, ergast_conn.cursor() as ecur:
            ecur.execute(ergast_query, (race["year"], race["round"]))
            ergast_count = ecur.fetchone()[0]
            
            pcur.execute(parcferme_query, (race["year"], race["round"]))
            parcferme_count = pcur.fetchone()[0]
        
        passed = parcferme_count == ergast_count
        results.append(ValidationResult(
            check_name=race["name"],
            passed=passed,
            expected=ergast_count,
            actual=parcferme_count,
            details=f"Expected ~{race['expected_starters']} starters" if not passed else None,
        ))
    
    return results


def print_validation_summary(all_results: list[ValidationResult]) -> None:
    """Print a summary of validation results."""
    passed = sum(1 for r in all_results if r.passed)
    failed = len(all_results) - passed
    
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    print(f"Total checks: {len(all_results)}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    
    if failed > 0:
        print("\nFailed checks:")
        for r in all_results:
            if not r.passed:
                print(f"  {r}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Ergast data import")
    parser.add_argument("--year", type=int, help="Check specific year")
    parser.add_argument("--famous-races", action="store_true", help="Spot-check famous races")
    parser.add_argument("--identify-mismatches", action="store_true", help="Identify name mismatches")
    parser.add_argument("--year-summary", action="store_true", help="Show results summary by year")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    args = parser.parse_args()
    
    # Configure logging
    import logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    
    # Get database URLs
    parcferme_db = settings.database_url
    ergast_db = "postgresql://parcferme:localdev@localhost:5432/ergastf1"
    
    print("=" * 60)
    print("ERGAST DATA VALIDATION")
    print("=" * 60)
    
    try:
        parcferme_conn = get_db_connection(parcferme_db)
        ergast_conn = get_db_connection(ergast_db)
    except Exception as e:
        print(f"❌ Failed to connect to databases: {e}")
        return 1
    
    all_results: list[ValidationResult] = []
    
    try:
        # Row count validation
        print("\n📊 Validating row counts...")
        count_results = validate_row_counts(parcferme_conn, ergast_conn)
        all_results.extend(count_results)
        for r in count_results:
            print(f"  {r}")
        
        # Famous races spot-check
        if args.famous_races or not args.year:
            print("\n🏆 Spot-checking famous races...")
            famous_results = spot_check_famous_races(parcferme_conn, ergast_conn)
            all_results.extend(famous_results)
            for r in famous_results:
                print(f"  {r}")
        
        # Year-specific validation
        if args.year:
            print(f"\n📅 Validating year {args.year}...")
            year_results = validate_results_by_year(parcferme_conn, ergast_conn, args.year)
            print(f"  Expected results: {year_results['expected_total']}")
            print(f"  Actual results: {year_results['actual_total']}")
            print(f"  Missing: {year_results['missing_total']}")
            
            if year_results['discrepancies']:
                print(f"\n  Discrepancies by race:")
                for d in year_results['discrepancies']:
                    print(f"    {d['race']}: expected {d['expected']}, got {d['actual']} (missing {d['missing']})")
            
            all_results.append(ValidationResult(
                check_name=f"Year {args.year} results",
                passed=year_results['missing_total'] == 0,
                expected=year_results['expected_total'],
                actual=year_results['actual_total'],
            ))
        
        # Name mismatch identification
        if args.identify_mismatches:
            year = args.year or 2017
            print(f"\n🔍 Identifying name mismatches for {year}...")
            mismatches = identify_name_mismatches(parcferme_conn, ergast_conn, year)
            if mismatches:
                print(f"  Found {len(mismatches)} potential mismatches:")
                for m in mismatches:
                    print(f"    Ergast: {m['ergast_name']}")
                    if m['parcferme_match']:
                        print(f"      → Likely match: {m['parcferme_match']}")
                    print(f"      Issue: {m['issue']}")
            else:
                print("  No mismatches found!")
        
        # Year summary
        if args.year_summary:
            print("\n📊 Results summary by year (2010-2017):")
            for year in range(2010, 2018):
                year_results = validate_results_by_year(parcferme_conn, ergast_conn, year)
                status = "✅" if year_results['missing_total'] == 0 else "❌"
                print(f"  {year}: {status} {year_results['actual_total']}/{year_results['expected_total']} "
                      f"(missing {year_results['missing_total']})")
        
        # Print summary
        print_validation_summary(all_results)
        
        return 0 if all(r.passed for r in all_results) else 1
        
    finally:
        parcferme_conn.close()
        ergast_conn.close()


if __name__ == "__main__":
    sys.exit(main())
