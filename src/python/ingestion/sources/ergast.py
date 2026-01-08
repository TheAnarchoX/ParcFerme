"""
Ergast F1 Archive Data Source.

Reads historical F1 data (1950-2017) from the Ergast PostgreSQL database
and transforms it to our generic SourceXxx models.
"""

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Generator

import psycopg  # type: ignore
import structlog  # type: ignore
from psycopg.rows import dict_row  # type: ignore
from psycopg_pool import ConnectionPool  # type: ignore

from ingestion.sources.base import (
    BaseDataSource,
    DataSourceError,
    DataSourceUnavailable,
    SourceCircuit,
    SourceDriver,
    SourceEntrant,
    SourceMeeting,
    SourceResult,
    SourceResultStatus,
    SourceSession,
    SourceSessionStatus,
    SourceSessionType,
    SourceTeam,
)

logger = structlog.get_logger()


# Mapping from Ergast statusId to our SourceResultStatus
# Based on the status mapping table in ERGAST_MIGRATION.md
ERGAST_STATUS_MAP: dict[int, tuple[SourceResultStatus, str | None]] = {
    1: (SourceResultStatus.FINISHED, None),  # "Finished"
    2: (SourceResultStatus.DSQ, "Disqualified"),
    # 3-10, 20-136 are various DNF reasons
    # 11-19 are lapped finishes (still finished)
    # We'll handle these dynamically based on status text
}

# Status IDs that indicate DNS
DNS_STATUS_IDS = {54, 77, 81, 97}  # Withdrew, 107% Rule, Did not qualify, Did not prequalify


@dataclass
class ErgastConfig:
    """Configuration for Ergast database connection."""
    host: str = "localhost"
    port: int = 5432
    user: str = "parcferme"
    password: str = "localdev"
    database: str = "ergastf1"  # Separate database from main parcferme DB
    
    @property
    def connection_string(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class ErgastDataSource(BaseDataSource):
    """Ergast F1 Archive data source.
    
    Reads from a PostgreSQL database populated with the Ergast F1 archive data.
    The Ergast database contains historical F1 data from 1950-2017.
    
    Usage:
        with ErgastDataSource() as ergast:
            circuits = ergast.get_all_circuits()
            drivers = ergast.get_all_drivers()
    """
    
    source_name = "Ergast"
    default_series_slug = "formula-1"
    default_series_name = "Formula 1"
    
    # Ergast has data from 1950 to 2017
    DATA_START_YEAR = 1950
    DATA_END_YEAR = 2017
    
    def __init__(self, config: ErgastConfig | None = None) -> None:
        self._config = config or ErgastConfig()
        self._pool: ConnectionPool | None = None
        self._status_cache: dict[int, str] = {}  # statusId -> status text
    
    def connect(self) -> None:
        """Initialize the database connection pool."""
        try:
            self._pool = ConnectionPool(
                self._config.connection_string,
                min_size=1,
                max_size=5,
                open=True,
            )
            logger.info("Connected to Ergast database", database=self._config.database)
            self._load_status_cache()
        except Exception as e:
            raise DataSourceUnavailable(f"Failed to connect to Ergast database: {e}", self.source_name) from e
    
    def close(self) -> None:
        """Close the database connection pool."""
        if self._pool:
            self._pool.close()
            self._pool = None
            logger.info("Closed Ergast database connection")
    
    def __enter__(self) -> "ErgastDataSource":
        self.connect()
        return self
    
    def __exit__(self, *args) -> None:
        self.close()
    
    @contextmanager
    def _get_connection(self) -> Generator[psycopg.Connection, None, None]:
        """Get a connection from the pool."""
        if not self._pool:
            raise DataSourceError("Not connected to database. Call connect() first.", self.source_name)
        with self._pool.connection() as conn:
            yield conn
    
    def _load_status_cache(self) -> None:
        """Load status codes from the status table."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('SELECT "statusId", status FROM status')
            for row in cur.fetchall():
                self._status_cache[row["statusId"]] = row["status"]
    
    def _get_status_text(self, status_id: int) -> str:
        """Get status text for a status ID."""
        return self._status_cache.get(status_id, "Unknown")
    
    def _convert_result_status(self, status_id: int) -> tuple[SourceResultStatus, str | None]:
        """Convert Ergast statusId to our result status enum and detail text."""
        status_text = self._get_status_text(status_id)
        
        if status_id == 1:
            return SourceResultStatus.FINISHED, None
        elif status_id == 2:
            return SourceResultStatus.DSQ, "Disqualified"
        elif status_id in DNS_STATUS_IDS:
            return SourceResultStatus.DNS, status_text
        elif status_text.startswith("+") and "Lap" in status_text:
            # "+1 Lap", "+2 Laps" etc. - still finished, just lapped
            return SourceResultStatus.FINISHED, status_text
        elif status_id == 62 or "not classified" in status_text.lower():
            return SourceResultStatus.NC, status_text
        else:
            # All other statuses are DNF reasons
            return SourceResultStatus.DNF, status_text
    
    # =========================================================================
    # BaseDataSource Implementation
    # =========================================================================
    
    def get_available_years(self) -> list[int]:
        """Get years for which Ergast has data (1950-2017)."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT DISTINCT year FROM seasons ORDER BY year")
            return [row["year"] for row in cur.fetchall()]
    
    def get_meetings(self, year: int) -> list[SourceMeeting]:
        """Get all race weekends (rounds) for a year."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    r."raceId",
                    r.year,
                    r.round,
                    r.name,
                    r.date,
                    r.time,
                    r.url as race_url,
                    c."circuitId",
                    c."circuitRef",
                    c.name as circuit_name,
                    c.location,
                    c.country,
                    c.lat,
                    c.lng,
                    c.alt,
                    c.url as circuit_url
                FROM races r
                JOIN circuits c ON r."circuitId" = c."circuitId"
                WHERE r.year = %s
                ORDER BY r.round
            ''', (year,))
            
            meetings = []
            for row in cur.fetchall():
                # Build circuit from joined data
                circuit = SourceCircuit(
                    name=row["circuit_name"],
                    short_name=row["circuitRef"].replace("_", " ").title() if row["circuitRef"] else None,
                    location=row["location"],
                    country=row["country"],
                    latitude=float(row["lat"]) if row["lat"] else None,
                    longitude=float(row["lng"]) if row["lng"] else None,
                    altitude=row["alt"],
                    wikipedia_url=row["circuit_url"],
                    source_id=row["circuitRef"],
                )
                
                meetings.append(SourceMeeting(
                    name=row["name"],
                    official_name=row["name"],  # Ergast doesn't have official names
                    year=row["year"],
                    round_number=row["round"],
                    date_start=row["date"],
                    date_end=row["date"],  # Historical races are single-day events
                    wikipedia_url=row["race_url"],
                    circuit=circuit,
                    source_id=str(row["raceId"]),
                ))
            
            return meetings
    
    def get_circuit(self, source_id: str) -> SourceCircuit | None:
        """Get circuit by circuitRef (slug)."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "circuitId",
                    "circuitRef",
                    name,
                    location,
                    country,
                    lat,
                    lng,
                    alt,
                    url
                FROM circuits
                WHERE "circuitRef" = %s
            ''', (source_id,))
            
            row = cur.fetchone()
            if not row:
                return None
            
            return SourceCircuit(
                name=row["name"],
                short_name=row["circuitRef"].replace("_", " ").title(),
                location=row["location"],
                country=row["country"],
                latitude=float(row["lat"]) if row["lat"] else None,
                longitude=float(row["lng"]) if row["lng"] else None,
                altitude=row["alt"],
                wikipedia_url=row["url"],
                source_id=row["circuitRef"],
            )
    
    def get_sessions(self, meeting_source_id: str) -> list[SourceSession]:
        """Get sessions for a meeting.
        
        Ergast only has Race and Qualifying data, not practice sessions.
        We create a Race session for all races, and a Qualifying session
        if qualifying data exists (1994+).
        """
        race_id = int(meeting_source_id)
        sessions = []
        
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            # Get race info
            cur.execute('''
                SELECT date, time, year
                FROM races
                WHERE "raceId" = %s
            ''', (race_id,))
            race_row = cur.fetchone()
            
            if not race_row:
                return []
            
            race_date = race_row["date"]
            race_time = race_row["time"]
            year = race_row["year"]
            
            # Combine date and time for race start
            if race_time:
                race_start = datetime.combine(race_date, race_time, tzinfo=timezone.utc)
            else:
                race_start = datetime.combine(race_date, time(14, 0), tzinfo=timezone.utc)  # Default 14:00 UTC
            
            # Create Race session
            sessions.append(SourceSession(
                session_type=SourceSessionType.RACE,
                start_time=race_start,
                status=SourceSessionStatus.COMPLETED,
                source_id=f"{race_id}_race",
            ))
            
            # Check if qualifying data exists for this race
            cur.execute('''
                SELECT COUNT(*) as count
                FROM qualifying
                WHERE "raceId" = %s
            ''', (race_id,))
            quali_count = cur.fetchone()["count"]
            
            if quali_count > 0:
                # Qualifying is typically the day before the race
                # Use day before race at 14:00 UTC to ensure proper session ordering
                quali_date = race_date - timedelta(days=1)
                quali_start = datetime.combine(quali_date, time(14, 0), tzinfo=timezone.utc)
                
                sessions.append(SourceSession(
                    session_type=SourceSessionType.QUALIFYING,
                    start_time=quali_start,
                    status=SourceSessionStatus.COMPLETED,
                    source_id=f"{race_id}_qualifying",
                ))
        
        return sessions
    
    def get_entrants(self, meeting_source_id: str) -> list[SourceEntrant]:
        """Get entrants for a meeting (race).
        
        In Ergast, entrants are derived from the results table which has
        driver + constructor for each race.
        """
        race_id = int(meeting_source_id)
        
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT DISTINCT ON (r."driverId")
                    r."driverId",
                    r."constructorId",
                    r.number as car_number,
                    d."driverRef",
                    d.forename,
                    d.surname,
                    d.code,
                    d.nationality as driver_nationality,
                    d.dob,
                    d.url as driver_url,
                    d.number as driver_permanent_number,
                    c."constructorRef",
                    c.name as team_name,
                    c.nationality as team_nationality,
                    c.url as team_url
                FROM results r
                JOIN drivers d ON r."driverId" = d."driverId"
                JOIN constructors c ON r."constructorId" = c."constructorId"
                WHERE r."raceId" = %s
                ORDER BY r."driverId", r."resultId"
            ''', (race_id,))
            
            entrants = []
            for row in cur.fetchall():
                # IMPORTANT: Only use driver_permanent_number (for 2014+ drivers)
                # NOT the race car_number which changes per race and could
                # accidentally match modern drivers' permanent numbers
                driver = SourceDriver(
                    first_name=row["forename"],
                    last_name=row["surname"],
                    abbreviation=row["code"],
                    nationality=row["driver_nationality"],
                    driver_number=row["driver_permanent_number"],  # Only permanent, not car_number
                    date_of_birth=row["dob"],
                    wikipedia_url=row["driver_url"],
                    source_id=row["driverRef"],
                )
                
                team = SourceTeam(
                    name=row["team_name"],
                    nationality=row["team_nationality"],
                    wikipedia_url=row["team_url"],
                    source_id=row["constructorRef"],
                )
                
                entrants.append(SourceEntrant(
                    driver=driver,
                    team=team,
                    driver_source_id=row["driverRef"],
                    team_source_id=row["constructorRef"],
                    car_number=row["car_number"],
                ))
            
            return entrants
    
    def get_results(
        self,
        session_source_id: str,
        session_type: SourceSessionType,
    ) -> list[SourceResult]:
        """Get results for a session."""
        # Parse the session source_id (format: "{raceId}_race" or "{raceId}_qualifying")
        parts = session_source_id.rsplit("_", 1)
        race_id = int(parts[0])
        
        if session_type == SourceSessionType.QUALIFYING:
            return self._get_qualifying_results(race_id)
        else:
            return self._get_race_results(race_id)
    
    def _get_race_results(self, race_id: int) -> list[SourceResult]:
        """Get race results."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    r."resultId",
                    r."driverId",
                    r."constructorId",
                    r.number,
                    r.grid,
                    r.position,
                    r."positionText",
                    r.points,
                    r.laps,
                    r.time,
                    r.milliseconds,
                    r."fastestLap",
                    r.rank as fastest_lap_rank,
                    r."fastestLapTime",
                    r."fastestLapSpeed",
                    r."statusId",
                    d."driverRef"
                FROM results r
                JOIN drivers d ON r."driverId" = d."driverId"
                WHERE r."raceId" = %s
                ORDER BY r."positionOrder"
            ''', (race_id,))
            
            results = []
            for row in cur.fetchall():
                status, status_detail = self._convert_result_status(row["statusId"])
                
                # Determine if this driver set fastest lap
                # rank=1 means they set the fastest lap
                has_fastest_lap = row["fastest_lap_rank"] == 1
                
                results.append(SourceResult(
                    position=row["position"],
                    grid_position=row["grid"],
                    status=status,
                    status_detail=status_detail,
                    points=float(row["points"]) if row["points"] else None,
                    laps=row["laps"],
                    time_milliseconds=row["milliseconds"],
                    fastest_lap=has_fastest_lap,
                    fastest_lap_number=row["fastestLap"],
                    fastest_lap_rank=row["fastest_lap_rank"],
                    fastest_lap_time=row["fastestLapTime"],
                    fastest_lap_speed=row["fastestLapSpeed"],
                    driver_source_id=row["driverRef"],
                    driver_number=row["number"],
                ))
            
            return results
    
    def _get_qualifying_results(self, race_id: int) -> list[SourceResult]:
        """Get qualifying results."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    q."qualifyId",
                    q."driverId",
                    q."constructorId",
                    q.number,
                    q.position,
                    q.q1,
                    q.q2,
                    q.q3,
                    d."driverRef"
                FROM qualifying q
                JOIN drivers d ON q."driverId" = d."driverId"
                WHERE q."raceId" = %s
                ORDER BY q.position
            ''', (race_id,))
            
            results = []
            for row in cur.fetchall():
                # Convert Q times to milliseconds (best qualifying time)
                best_time_ms = None
                for q_time in [row["q3"], row["q2"], row["q1"]]:
                    if q_time and q_time.strip():
                        ms = self._parse_lap_time_to_ms(q_time)
                        if ms:
                            best_time_ms = ms
                            break
                
                results.append(SourceResult(
                    position=row["position"],
                    status=SourceResultStatus.FINISHED if row["position"] else SourceResultStatus.DNS,
                    time_milliseconds=best_time_ms,
                    q1_time=row["q1"],
                    q2_time=row["q2"],
                    q3_time=row["q3"],
                    driver_source_id=row["driverRef"],
                    driver_number=row["number"],
                ))
            
            return results
    
    def _parse_lap_time_to_ms(self, time_str: str) -> int | None:
        """Parse a lap time string to milliseconds.
        
        Formats:
        - "1:27.452" -> 87452 ms
        - "27.452" -> 27452 ms (unlikely but possible)
        """
        if not time_str or not time_str.strip():
            return None
        
        try:
            time_str = time_str.strip()
            if ":" in time_str:
                parts = time_str.split(":")
                minutes = int(parts[0])
                seconds_and_ms = float(parts[1])
                return int((minutes * 60 + seconds_and_ms) * 1000)
            else:
                return int(float(time_str) * 1000)
        except (ValueError, IndexError):
            logger.debug("Failed to parse lap time", time_str=time_str)
            return None
    
    # =========================================================================
    # Bulk Import Methods
    # =========================================================================
    
    def get_all_circuits(self) -> list[SourceCircuit]:
        """Get all circuits from Ergast."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "circuitId",
                    "circuitRef",
                    name,
                    location,
                    country,
                    lat,
                    lng,
                    alt,
                    url
                FROM circuits
                ORDER BY "circuitId"
            ''')
            
            circuits = []
            for row in cur.fetchall():
                circuits.append(SourceCircuit(
                    name=row["name"],
                    short_name=row["circuitRef"].replace("_", " ").title() if row["circuitRef"] else None,
                    location=row["location"],
                    country=row["country"],
                    latitude=float(row["lat"]) if row["lat"] else None,
                    longitude=float(row["lng"]) if row["lng"] else None,
                    altitude=row["alt"],
                    wikipedia_url=row["url"],
                    source_id=row["circuitRef"],
                ))
            
            logger.info("Loaded circuits from Ergast", count=len(circuits))
            return circuits
    
    def get_all_drivers(self) -> list[SourceDriver]:
        """Get all drivers from Ergast."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "driverId",
                    "driverRef",
                    number,
                    code,
                    forename,
                    surname,
                    dob,
                    nationality,
                    url
                FROM drivers
                ORDER BY "driverId"
            ''')
            
            drivers = []
            for row in cur.fetchall():
                drivers.append(SourceDriver(
                    first_name=row["forename"],
                    last_name=row["surname"],
                    abbreviation=row["code"],
                    nationality=row["nationality"],
                    driver_number=row["number"],
                    date_of_birth=row["dob"],
                    wikipedia_url=row["url"],
                    source_id=row["driverRef"],
                ))
            
            logger.info("Loaded drivers from Ergast", count=len(drivers))
            return drivers
    
    def get_all_teams(self) -> list[SourceTeam]:
        """Get all teams/constructors from Ergast."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "constructorId",
                    "constructorRef",
                    name,
                    nationality,
                    url
                FROM constructors
                ORDER BY "constructorId"
            ''')
            
            teams = []
            for row in cur.fetchall():
                teams.append(SourceTeam(
                    name=row["name"],
                    short_name=row["constructorRef"].replace("_", " ").title() if row["constructorRef"] else None,
                    nationality=row["nationality"],
                    wikipedia_url=row["url"],
                    source_id=row["constructorRef"],
                ))
            
            logger.info("Loaded teams from Ergast", count=len(teams))
            return teams
    
    # =========================================================================
    # Additional Query Methods
    # =========================================================================
    
    def get_driver_by_ref(self, driver_ref: str) -> SourceDriver | None:
        """Get a driver by their Ergast driverRef."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "driverId",
                    "driverRef",
                    number,
                    code,
                    forename,
                    surname,
                    dob,
                    nationality,
                    url
                FROM drivers
                WHERE "driverRef" = %s
            ''', (driver_ref,))
            
            row = cur.fetchone()
            if not row:
                return None
            
            return SourceDriver(
                first_name=row["forename"],
                last_name=row["surname"],
                abbreviation=row["code"],
                nationality=row["nationality"],
                driver_number=row["number"],
                date_of_birth=row["dob"],
                wikipedia_url=row["url"],
                source_id=row["driverRef"],
            )
    
    def get_team_by_ref(self, team_ref: str) -> SourceTeam | None:
        """Get a team by their Ergast constructorRef."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    "constructorId",
                    "constructorRef",
                    name,
                    nationality,
                    url
                FROM constructors
                WHERE "constructorRef" = %s
            ''', (team_ref,))
            
            row = cur.fetchone()
            if not row:
                return None
            
            return SourceTeam(
                name=row["name"],
                nationality=row["nationality"],
                wikipedia_url=row["url"],
                source_id=row["constructorRef"],
            )
    
    def get_seasons(self) -> list[int]:
        """Get all available seasons."""
        return self.get_available_years()
    
    def count_by_year(self) -> dict[int, dict[str, int]]:
        """Get counts of races and results by year for verification."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''
                SELECT 
                    r.year,
                    COUNT(DISTINCT r."raceId") as races,
                    COUNT(DISTINCT res."resultId") as results,
                    COUNT(DISTINCT q."qualifyId") as qualifying_results
                FROM races r
                LEFT JOIN results res ON r."raceId" = res."raceId"
                LEFT JOIN qualifying q ON r."raceId" = q."raceId"
                GROUP BY r.year
                ORDER BY r.year
            ''')
            
            return {
                row["year"]: {
                    "races": row["races"],
                    "results": row["results"],
                    "qualifying_results": row["qualifying_results"],
                }
                for row in cur.fetchall()
            }
