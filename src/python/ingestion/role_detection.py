"""
Driver Role Detection for Parc Fermé.

This module analyzes driver participation patterns to automatically classify
drivers into roles:
- REGULAR: Consistent race participation throughout season
- RESERVE: Filled in for injured/unavailable driver (mid-season, limited rounds)  
- FP1_ONLY: Only participated in FP1 sessions (rookie practice requirement)
- TEST: Test session only (no race weekend participation)

Key considerations:
- One-off race entries (Indy 500, Le Mans) are REGULAR, not reserves
- Historical F1 had more driver changes - need higher threshold for "reserve"
- Must analyze session-level participation, not just round-level
"""

from collections import defaultdict
from dataclasses import dataclass
from enum import IntEnum
from uuid import UUID

from psycopg.rows import dict_row

from .models import DriverRole
from .repository import RacingRepository


@dataclass
class DriverSeasonStats:
    """Statistics for a driver's participation in a season with a specific team."""
    
    driver_id: UUID
    driver_name: str
    team_id: UUID
    team_name: str
    season_id: UUID
    year: int
    
    # Round-level stats
    total_rounds_in_season: int
    rounds_participated: int
    
    # Session-level stats (per round they participated in)
    fp1_sessions: int  # FP1 sessions participated
    fp2_sessions: int
    fp3_sessions: int
    quali_sessions: int  # Qualifying/Sprint Qualifying
    race_sessions: int  # Race/Sprint
    
    # Derived flags
    only_fp1: bool = False  # True if participated in FP1 but never quali/race
    
    def __post_init__(self):
        # Driver did FP1 but never made it to quali/race in any of their rounds
        self.only_fp1 = (
            self.fp1_sessions > 0 and 
            self.quali_sessions == 0 and 
            self.race_sessions == 0
        )


@dataclass 
class RoleDetectionResult:
    """Result of role detection for an entrant."""
    
    entrant_id: UUID
    driver_id: UUID
    driver_name: str
    team_name: str
    round_id: UUID
    round_name: str
    year: int
    
    old_role: DriverRole
    new_role: DriverRole
    reason: str
    
    @property
    def changed(self) -> bool:
        return self.old_role != self.new_role


class RoleDetector:
    """
    Detects and assigns driver roles based on participation patterns.
    
    Detection logic:
    1. FP1_ONLY: Driver has results in FP1 but NOT in Qualifying or Race sessions
       for that round (rookie Friday practice)
    
    2. RESERVE: Driver appears for a team mid-season to replace another driver,
       participates in quali/race but only for 1-3 rounds while regular driver
       was scheduled for rest of season. NOT a one-off entry.
    
    3. REGULAR: Default - participated in race sessions. Includes:
       - Full-time drivers
       - One-off race entries (Indy 500, Le Mans guest entries)
       - Part-time schedules (NASCAR road course specialists)
       - Historical drivers who switched teams frequently
    
    4. TEST: Only test sessions (not implemented - requires test session data)
    """
    
    def __init__(self, repository: RacingRepository):
        self.repo = repository
    
    def detect_roles_for_season(
        self,
        season_id: UUID,
        dry_run: bool = True,
    ) -> list[RoleDetectionResult]:
        """
        Detect and optionally update roles for all entrants in a season.
        
        Args:
            season_id: The season to analyze
            dry_run: If True, only report changes without applying them
            
        Returns:
            List of role detection results (changes and non-changes)
        """
        results: list[RoleDetectionResult] = []
        
        # Get all entrants with their session participation
        entrant_data = self._get_entrant_session_participation(season_id)
        
        # Get season context (total rounds, team lineups)
        season_context = self._get_season_context(season_id)
        
        for entrant in entrant_data:
            new_role = self._determine_role(entrant, season_context)
            
            result = RoleDetectionResult(
                entrant_id=entrant["entrant_id"],
                driver_id=entrant["driver_id"],
                driver_name=entrant["driver_name"],
                team_name=entrant["team_name"],
                round_id=entrant["round_id"],
                round_name=entrant["round_name"],
                year=entrant["year"],
                old_role=DriverRole(entrant["current_role"]),
                new_role=new_role,
                reason=self._get_reason(entrant, new_role, season_context),
            )
            results.append(result)
            
            if not dry_run and result.changed:
                self._update_entrant_role(entrant["entrant_id"], new_role)
        
        return results
    
    def detect_roles_for_all_seasons(
        self,
        dry_run: bool = True,
        series_slug: str | None = None,
    ) -> list[RoleDetectionResult]:
        """
        Detect roles for all seasons, optionally filtered by series.
        
        Args:
            dry_run: If True, only report changes without applying
            series_slug: Optional series filter (e.g., "formula-1")
            
        Returns:
            List of all role detection results
        """
        all_results: list[RoleDetectionResult] = []
        
        seasons = self._get_all_seasons(series_slug)
        
        for season in seasons:
            print(f"Processing {season['series_name']} {season['year']}...")
            results = self.detect_roles_for_season(season["id"], dry_run)
            all_results.extend(results)
        
        return all_results
    
    def _get_entrant_session_participation(self, season_id: UUID) -> list[dict]:
        """Get all entrants with their session participation details."""
        with self.repo._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    e."Id" as entrant_id,
                    e."DriverId" as driver_id,
                    e."TeamId" as team_id,
                    e."RoundId" as round_id,
                    e."Role" as current_role,
                    d."FirstName" || ' ' || d."LastName" as driver_name,
                    t."Name" as team_name,
                    r."Name" as round_name,
                    r."RoundNumber" as round_number,
                    s."Year" as year,
                    -- Count session types this entrant has results in
                    COUNT(DISTINCT CASE WHEN sess."Type" = 0 THEN sess."Id" END) as fp1_count,
                    COUNT(DISTINCT CASE WHEN sess."Type" = 1 THEN sess."Id" END) as fp2_count,
                    COUNT(DISTINCT CASE WHEN sess."Type" = 2 THEN sess."Id" END) as fp3_count,
                    COUNT(DISTINCT CASE WHEN sess."Type" IN (3, 4) THEN sess."Id" END) as quali_count,
                    COUNT(DISTINCT CASE WHEN sess."Type" IN (5, 6) THEN sess."Id" END) as race_count
                FROM "Entrants" e
                JOIN "Drivers" d ON e."DriverId" = d."Id"
                JOIN "Teams" t ON e."TeamId" = t."Id"
                JOIN "Rounds" r ON e."RoundId" = r."Id"
                JOIN "Seasons" s ON r."SeasonId" = s."Id"
                LEFT JOIN "Results" res ON res."EntrantId" = e."Id"
                LEFT JOIN "Sessions" sess ON res."SessionId" = sess."Id"
                WHERE s."Id" = %s
                GROUP BY e."Id", e."DriverId", e."TeamId", e."RoundId", e."Role",
                         d."FirstName", d."LastName", t."Name", r."Name", r."RoundNumber", s."Year"
                ORDER BY r."RoundNumber", d."LastName"
                """,
                (str(season_id),),
            )
            return list(cur.fetchall())
    
    def _get_season_context(self, season_id: UUID) -> dict:
        """Get context about the season for role detection."""
        with self.repo._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            # Get total rounds in season
            cur.execute(
                'SELECT COUNT(*) as total FROM "Rounds" WHERE "SeasonId" = %s AND "RoundNumber" > 0',
                (str(season_id),),
            )
            total_rounds = cur.fetchone()["total"]
            
            # Get team lineup continuity (which drivers drove most rounds per team)
            # AND track which specific rounds they raced
            cur.execute(
                """
                SELECT 
                    e."TeamId" as team_id,
                    e."DriverId" as driver_id,
                    COUNT(DISTINCT e."RoundId") as rounds_count,
                    -- Check if they have race results (not just FP1)
                    COUNT(DISTINCT CASE WHEN sess."Type" IN (5, 6) THEN r."Id" END) as race_rounds,
                    -- Get the specific round numbers they raced (for consecutive detection)
                    ARRAY_AGG(DISTINCT r."RoundNumber" ORDER BY r."RoundNumber") 
                        FILTER (WHERE sess."Type" IN (5, 6)) as race_round_numbers
                FROM "Entrants" e
                JOIN "Rounds" r ON e."RoundId" = r."Id"
                LEFT JOIN "Results" res ON res."EntrantId" = e."Id"
                LEFT JOIN "Sessions" sess ON res."SessionId" = sess."Id"
                WHERE r."SeasonId" = %s
                GROUP BY e."TeamId", e."DriverId"
                ORDER BY e."TeamId", rounds_count DESC
                """,
                (str(season_id),),
            )
            
            # Build team -> driver participation map
            team_drivers: dict[str, list[dict]] = defaultdict(list)
            for row in cur.fetchall():
                race_round_numbers = row["race_round_numbers"] or []
                team_drivers[str(row["team_id"])].append({
                    "driver_id": str(row["driver_id"]),
                    "rounds_count": row["rounds_count"],
                    "race_rounds": row["race_rounds"],
                    "race_round_numbers": race_round_numbers,
                })
            
            return {
                "total_rounds": total_rounds,
                "team_drivers": dict(team_drivers),
            }
    
    def _determine_role(self, entrant: dict, context: dict) -> DriverRole:
        """
        Determine the appropriate role for an entrant.
        
        Logic:
        1. Pre-season testing (round_number = 0) -> Always REGULAR (test sessions, not FP1-only)
        2. If only FP1 results (no quali/race) AND driver has race results in other rounds -> REGULAR
           (They just did FP1 in this round, e.g., injury, or FP1-only appearance)
        3. If only FP1 results AND driver never races for this team -> FP1_ONLY (rookie practice)
        4. If has race results:
           a. Check if they're a "regular" driver for this team (high participation)
           b. Check if they're replacing an injured driver (mid-season, low rounds)
           c. One-off entries are REGULAR (not reserves)
        """
        round_number = entrant["round_number"]
        fp1_count = entrant["fp1_count"] or 0
        fp2_count = entrant["fp2_count"] or 0
        fp3_count = entrant["fp3_count"] or 0
        quali_count = entrant["quali_count"] or 0
        race_count = entrant["race_count"] or 0
        
        # Case 0: Pre-season testing - everyone is REGULAR (test sessions)
        if round_number == 0:
            return DriverRole.REGULAR
        
        # Case 1: No results at all - this is a reserve who was on the entry list but never drove
        # They're listed as an entrant but have no session participation data
        if fp1_count == 0 and fp2_count == 0 and fp3_count == 0 and quali_count == 0 and race_count == 0:
            return DriverRole.RESERVE
        
        # Case 2: Only practice results (FP1/FP2/FP3), no quali/race
        if quali_count == 0 and race_count == 0 and (fp1_count > 0 or fp2_count > 0 or fp3_count > 0):
            # Check if this driver has race results in OTHER rounds with this team
            team_id = str(entrant["team_id"])
            driver_id = str(entrant["driver_id"])
            team_data = context["team_drivers"].get(team_id, [])
            
            driver_stats = next(
                (d for d in team_data if d["driver_id"] == driver_id),
                {"race_rounds": 0}
            )
            
            # If driver has race results elsewhere with this team, this is just an FP1 appearance
            # (e.g., injured driver did FP1 before pulling out, or regular driver testing)
            if driver_stats["race_rounds"] > 0:
                # They race for this team, just not in this specific round's race
                # Keep as REGULAR - they're a race driver who happened to only do FP1 here
                return DriverRole.REGULAR
            
            # Driver NEVER races for this team - they're an FP1-only/test driver
            return DriverRole.FP1_ONLY
        
        # Case 3: Has race/quali results - determine if regular or reserve
        team_id = str(entrant["team_id"])
        driver_id = str(entrant["driver_id"])
        total_rounds = context["total_rounds"]
        team_data = context["team_drivers"].get(team_id, [])
        
        # Find this driver's stats within the team
        driver_stats = next(
            (d for d in team_data if d["driver_id"] == driver_id),
            {"rounds_count": 1, "race_rounds": 0}
        )
        
        race_rounds = driver_stats["race_rounds"]
        
        # Find the "main" drivers for this team (those with highest participation)
        # Use a sliding threshold based on season length
        if total_rounds >= 20:
            main_driver_threshold = max(1, total_rounds * 0.4)  # 40% for long seasons
        elif total_rounds >= 10:
            main_driver_threshold = max(1, total_rounds * 0.3)  # 30% for medium seasons
        else:
            main_driver_threshold = max(1, total_rounds * 0.25)  # 25% for short seasons
        
        main_drivers = [d for d in team_data if d["race_rounds"] >= main_driver_threshold]
        
        # Is this driver one of the main drivers?
        is_main_driver = any(d["driver_id"] == driver_id for d in main_drivers)
        
        if is_main_driver:
            return DriverRole.REGULAR
        
        # Not a main driver - but is this a reserve filling in, or a one-off entry?
        # Key distinction: reserves replace someone, one-offs are additional entries
        
        # Count how many "slots" the team typically has
        # Most series have 2 drivers per team, WEC has 2-3 per car
        typical_team_size = len([d for d in team_data if d["race_rounds"] >= main_driver_threshold])
        if typical_team_size == 0:
            typical_team_size = 2  # Default assumption
        
        # If team has more unique race drivers than typical slots, some are reserves/replacements
        unique_race_drivers = len([d for d in team_data if d["race_rounds"] > 0])
        
        # Get the round numbers this driver raced for this team
        race_round_numbers = driver_stats.get("race_round_numbers", [])
        # Filter out round 0 (pre-season testing)
        actual_race_rounds = [r for r in race_round_numbers if r > 0]
        
        # Heuristic: Check if this driver's rounds form a consecutive block or scattered fill-ins
        # - Consecutive block starting from R1: likely initial/regular driver
        # - Consecutive block at end of season: likely late-season promotion
        # - Scattered non-consecutive rounds: likely reserve filling in for injuries
        # - Single round anywhere: likely reserve (one-off fill-in)
        is_consecutive_block = self._is_consecutive_block(actual_race_rounds)
        # Start of season means CONSECUTIVE rounds starting from round 1 or 2
        is_consecutive_from_start = (
            actual_race_rounds and 
            min(actual_race_rounds) <= 2 and 
            is_consecutive_block and
            len(actual_race_rounds) >= 2  # Must have at least 2 consecutive rounds from start
        )
        is_end_of_season = actual_race_rounds and max(actual_race_rounds) >= total_rounds - 1 and is_consecutive_block
        is_single_appearance = len(actual_race_rounds) == 1
        
        # Reserve criteria:
        # 1. Very limited participation (1-3 rounds)
        # 2. Either:
        #    a) NOT a consecutive block (scattered rounds suggest fill-ins), OR
        #    b) Single appearance anywhere (one-off fill-in)
        # 3. NOT consecutive from start (that's initial driver assignment like Lawson at RBR)
        # 4. NOT consecutive at season end (that's late-season promotion)
        # 5. Team has excess drivers beyond typical slots
        # 6. Season is long enough for this to be meaningful
        is_reserve_candidate = (
            race_rounds > 0 and
            race_rounds <= 3 and  # Very limited participation
            (not is_consecutive_block or is_single_appearance) and  # Scattered OR single
            not is_consecutive_from_start and  # Not initial driver assignment
            not is_end_of_season and  # Not late-season promotion  
            unique_race_drivers > typical_team_size and
            len(main_drivers) >= typical_team_size and
            total_rounds >= 10  # Only for seasons with enough races
        )
        
        if is_reserve_candidate:
            return DriverRole.RESERVE
        
        # Default: Regular driver (includes one-off entries, part-time, historical)
        return DriverRole.REGULAR
    
    def _is_consecutive_block(self, round_numbers: list[int]) -> bool:
        """Check if round numbers form a consecutive block."""
        if not round_numbers:
            return False
        if len(round_numbers) == 1:
            return True  # Single round counts as consecutive
        
        # Remove round 0 (pre-season testing) from consideration
        race_rounds = [r for r in round_numbers if r > 0]
        if not race_rounds:
            return False
        if len(race_rounds) == 1:
            return True
        
        # Check if rounds are consecutive
        sorted_rounds = sorted(race_rounds)
        for i in range(1, len(sorted_rounds)):
            if sorted_rounds[i] - sorted_rounds[i-1] > 1:
                return False
        return True
    
    def _get_reason(self, entrant: dict, role: DriverRole, context: dict) -> str:
        """Generate a human-readable reason for the role assignment."""
        fp1 = entrant["fp1_count"] or 0
        fp2 = entrant["fp2_count"] or 0
        fp3 = entrant["fp3_count"] or 0
        quali = entrant["quali_count"] or 0
        race = entrant["race_count"] or 0
        round_number = entrant["round_number"]
        
        practice_count = fp1 + fp2 + fp3
        
        if round_number == 0:
            return f"Pre-season testing ({practice_count} practice sessions)"
        
        if role == DriverRole.FP1_ONLY:
            return f"FP1/practice only ({practice_count} practice, no quali/race) - never races for this team"
        
        if role == DriverRole.RESERVE:
            # Check if this is a "no results at all" case
            if fp1 == 0 and fp2 == 0 and fp3 == 0 and quali == 0 and race == 0:
                return "Reserve driver on entry list (no session participation)"
            
            team_id = str(entrant["team_id"])
            driver_id = str(entrant["driver_id"])
            team_data = context["team_drivers"].get(team_id, [])
            driver_stats = next(
                (d for d in team_data if d["driver_id"] == driver_id),
                {"race_rounds": 0, "race_round_numbers": []}
            )
            race_rnds = driver_stats.get("race_round_numbers", [])
            rounds_str = ", ".join(f"R{r}" for r in race_rnds) if race_rnds else "?"
            return f"Reserve fill-in (rounds: {rounds_str}, scattered mid-season appearances)"
        
        if role == DriverRole.REGULAR:
            if race > 0:
                return f"Regular driver ({race} race sessions)"
            elif quali > 0:
                return f"Regular driver ({quali} quali sessions)"
            elif practice_count > 0:
                # This happens when driver did FP1 but also races for this team in other rounds
                return f"Regular driver (practice only this round, races other rounds)"
            else:
                return "No session results yet"
        
        return "Unknown"
    
    def _update_entrant_role(self, entrant_id: UUID, role: DriverRole) -> None:
        """Update an entrant's role in the database."""
        with self.repo._get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                'UPDATE "Entrants" SET "Role" = %s WHERE "Id" = %s',
                (int(role), str(entrant_id)),
            )
            conn.commit()
    
    def _get_all_seasons(self, series_slug: str | None = None) -> list[dict]:
        """Get all seasons, optionally filtered by series."""
        with self.repo._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            if series_slug:
                cur.execute(
                    """
                    SELECT s."Id" as id, s."Year" as year, ser."Name" as series_name
                    FROM "Seasons" s
                    JOIN "Series" ser ON s."SeriesId" = ser."Id"
                    WHERE ser."Slug" = %s
                    ORDER BY s."Year"
                    """,
                    (series_slug,),
                )
            else:
                cur.execute(
                    """
                    SELECT s."Id" as id, s."Year" as year, ser."Name" as series_name
                    FROM "Seasons" s
                    JOIN "Series" ser ON s."SeriesId" = ser."Id"
                    ORDER BY ser."Name", s."Year"
                    """,
                )
            return list(cur.fetchall())


def print_detection_summary(results: list[RoleDetectionResult]) -> None:
    """Print a summary of role detection results."""
    changed = [r for r in results if r.changed]
    
    print(f"\n{'='*60}")
    print(f"Role Detection Summary")
    print(f"{'='*60}")
    print(f"Total entrants analyzed: {len(results)}")
    print(f"Roles changed: {len(changed)}")
    
    if changed:
        # Group by change type
        by_change: dict[str, list[RoleDetectionResult]] = defaultdict(list)
        for r in changed:
            key = f"{r.old_role.name} -> {r.new_role.name}"
            by_change[key].append(r)
        
        print(f"\nChanges by type:")
        for change_type, items in sorted(by_change.items()):
            print(f"  {change_type}: {len(items)}")
        
        print(f"\nDetailed changes:")
        for r in changed[:50]:  # Limit output
            print(f"  {r.year} {r.round_name}: {r.driver_name} ({r.team_name})")
            print(f"    {r.old_role.name} -> {r.new_role.name}: {r.reason}")
        
        if len(changed) > 50:
            print(f"  ... and {len(changed) - 50} more changes")
    
    # Show role distribution
    role_counts: dict[str, int] = defaultdict(int)
    for r in results:
        role_counts[r.new_role.name] += 1
    
    print(f"\nFinal role distribution:")
    for role, count in sorted(role_counts.items()):
        print(f"  {role}: {count}")
