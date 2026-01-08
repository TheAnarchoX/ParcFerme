"""
Database repository for upserting racing data.

Uses psycopg3 for PostgreSQL operations with proper connection pooling
and upsert semantics (INSERT ... ON CONFLICT DO UPDATE).
"""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

import psycopg  # type: ignore
import structlog  # type: ignore
from psycopg.rows import dict_row  # type: ignore
from psycopg_pool import ConnectionPool  # type: ignore

from ingestion.config import settings
from ingestion.models import (
    Circuit,
    CircuitAlias,
    Driver,
    DriverAlias,
    Entrant,
    Result,
    Round,
    Season,
    Series,
    SeriesAlias,
    Session,
    SessionStatus,
    SessionType,
    Team,
    TeamAlias,
)

logger = structlog.get_logger()


def _to_uuid(value: Any) -> UUID:
    """Convert a value to UUID, handling both string and UUID inputs."""
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


class RacingRepository:
    """Repository for racing data operations.

    Provides upsert semantics - entities are inserted if new,
    or updated if they already exist (based on unique constraints).
    """

    def __init__(self, connection_string: str | None = None) -> None:
        self.connection_string = connection_string or settings.database_url
        self._pool: ConnectionPool | None = None

    def connect(self) -> None:
        """Initialize the connection pool."""
        self._pool = ConnectionPool(
            self.connection_string,
            min_size=1,
            max_size=10,
            open=True,
        )
        logger.info("Database connection pool initialized")

    def close(self) -> None:
        """Close the connection pool."""
        if self._pool:
            self._pool.close()
            logger.info("Database connection pool closed")

    def __enter__(self) -> "RacingRepository":
        self.connect()
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    @contextmanager
    def _get_connection(self) -> Generator[psycopg.Connection, None, None]:
        """Get a connection from the pool."""
        if not self._pool:
            raise RuntimeError("Repository not connected. Call connect() first.")
        with self._pool.connection() as conn:
            yield conn

    # =========================
    # Series Operations
    # =========================

    def upsert_series(self, series: Series) -> UUID:
        """Upsert a series and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                    INSERT INTO "Series" ("Id", "Name", "Slug", "LogoUrl")
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT ("Slug") DO UPDATE SET
                        "Name" = EXCLUDED."Name",
                        "LogoUrl" = EXCLUDED."LogoUrl"
                    RETURNING "Id"
                    """,
                (str(series.id), series.name, series.slug, series.logo_url),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else series.id

    def get_series_by_slug(self, slug: str) -> Series | None:
        """Get a series by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                'SELECT "Id", "Name", "Slug", "LogoUrl" FROM "Series" WHERE "Slug" = %s',
                (slug,),
            )
            row = cur.fetchone()
            if row:
                return Series(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    logo_url=row["LogoUrl"],
                )
            return None

    # =========================
    # Season Operations
    # =========================

    def upsert_season(self, season: Season) -> UUID:
        """Upsert a season and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                    INSERT INTO "Seasons" ("Id", "SeriesId", "Year")
                    VALUES (%s, %s, %s)
                    ON CONFLICT ("SeriesId", "Year") DO UPDATE SET
                        "Year" = EXCLUDED."Year"
                    RETURNING "Id"
                    """,
                (str(season.id), str(season.series_id), season.year),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else season.id

    def get_season(self, series_id: UUID, year: int) -> Season | None:
        """Get a season by series and year."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                (
                    'SELECT "Id", "SeriesId", "Year" FROM "Seasons" '
                    'WHERE "SeriesId" = %s AND "Year" = %s'
                ),
                (str(series_id), year),
            )
            row = cur.fetchone()
            if row:
                return Season(
                    id=_to_uuid(row["Id"]),
                    series_id=_to_uuid(row["SeriesId"]),
                    year=row["Year"],
                )
            return None

    # =========================
    # Circuit Operations
    # =========================

    def upsert_circuit(self, circuit: Circuit) -> UUID:
        """Upsert a circuit and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "Circuits" ("Id", "Name", "Slug", "Location", "Country",
                                       "CountryCode", "LayoutMapUrl", "Latitude",
                                       "Longitude", "LengthMeters")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("Slug") DO UPDATE SET
                    "Name" = EXCLUDED."Name",
                    "Location" = EXCLUDED."Location",
                    "Country" = EXCLUDED."Country",
                    "CountryCode" = EXCLUDED."CountryCode",
                    "LayoutMapUrl" = EXCLUDED."LayoutMapUrl",
                    "Latitude" = EXCLUDED."Latitude",
                    "Longitude" = EXCLUDED."Longitude",
                    "LengthMeters" = EXCLUDED."LengthMeters"
                RETURNING "Id"
                """,
                (
                    str(circuit.id),
                    circuit.name,
                    circuit.slug,
                    circuit.location,
                    circuit.country,
                    circuit.country_code,
                    circuit.layout_map_url,
                    circuit.latitude,
                    circuit.longitude,
                    circuit.length_meters,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else circuit.id

    def get_circuit_by_slug(self, slug: str) -> Circuit | None:
        """Get a circuit by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "Name", "Slug", "Location", "Country", "CountryCode",
                              "LayoutMapUrl", "Latitude", "Longitude", "LengthMeters"
                       FROM "Circuits" WHERE "Slug" = %s""",
                (slug,),
            )
            row = cur.fetchone()
            if row:
                return Circuit(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    location=row["Location"],
                    country=row["Country"],
                    country_code=row["CountryCode"],
                    layout_map_url=row["LayoutMapUrl"],
                    latitude=row["Latitude"],
                    longitude=row["Longitude"],
                    length_meters=row["LengthMeters"],
                )
            return None

    # =========================
    # Round Operations
    # =========================

    def upsert_round(self, round_: Round) -> UUID:
        """Upsert a round and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "Rounds" ("Id", "SeasonId", "CircuitId", "Name", "Slug",
                                     "RoundNumber", "DateStart", "DateEnd",
                                     "OpenF1MeetingKey")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("Slug") DO UPDATE SET
                        "SeasonId" = EXCLUDED."SeasonId",
                        "CircuitId" = EXCLUDED."CircuitId",
                        "Name" = EXCLUDED."Name",
                        "RoundNumber" = EXCLUDED."RoundNumber",
                        "DateStart" = EXCLUDED."DateStart",
                        "DateEnd" = EXCLUDED."DateEnd",
                        "OpenF1MeetingKey" = EXCLUDED."OpenF1MeetingKey"
                    RETURNING "Id"
                    """,
                (
                    str(round_.id),
                    str(round_.season_id),
                    str(round_.circuit_id),
                    round_.name,
                    round_.slug,
                    round_.round_number,
                    round_.date_start,
                    round_.date_end,
                    round_.openf1_meeting_key,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else round_.id

    def get_round_by_meeting_key(self, meeting_key: int) -> Round | None:
        """Get a round by its OpenF1 meeting key."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "SeasonId", "CircuitId", "Name", "Slug", "RoundNumber",
                              "DateStart", "DateEnd", "OpenF1MeetingKey"
                       FROM "Rounds" WHERE "OpenF1MeetingKey" = %s""",
                (meeting_key,),
            )
            row = cur.fetchone()
            if row:
                return Round(
                    id=_to_uuid(row["Id"]),
                    season_id=_to_uuid(row["SeasonId"]),
                    circuit_id=_to_uuid(row["CircuitId"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    round_number=row["RoundNumber"],
                    date_start=row["DateStart"],
                    date_end=row["DateEnd"],
                    openf1_meeting_key=row["OpenF1MeetingKey"],
                )
            return None

    # =========================
    # Session Operations
    # =========================

    def upsert_session(self, session: Session) -> UUID:
        """Upsert a session and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "Sessions" ("Id", "RoundId", "Type", "StartTimeUtc",
                                       "Status", "OpenF1SessionKey")
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT ("OpenF1SessionKey") DO UPDATE SET
                    "RoundId" = EXCLUDED."RoundId",
                    "Type" = EXCLUDED."Type",
                    "StartTimeUtc" = EXCLUDED."StartTimeUtc",
                    "Status" = EXCLUDED."Status"
                RETURNING "Id"
                """,
                (
                    str(session.id),
                    str(session.round_id),
                    session.type.value,
                    session.start_time_utc,
                    session.status.value,
                    session.openf1_session_key,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else session.id

    def upsert_session_by_round_type(self, session: Session) -> UUID:
        """Upsert a session using (RoundId, Type, StartTimeUtc date) as lookup key.
        
        Use this for seeding sessions that don't have OpenF1 keys.
        This first looks for an existing session with matching round, type, and date,
        and updates it if found. Otherwise inserts a new session.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            # First, try to find an existing session with same round, type, and date
            cur.execute(
                """
                SELECT "Id" FROM "Sessions"
                WHERE "RoundId" = %s
                  AND "Type" = %s
                  AND DATE("StartTimeUtc") = DATE(%s)
                """,
                (str(session.round_id), session.type.value, session.start_time_utc),
            )
            existing = cur.fetchone()
            
            if existing:
                # Update existing session
                cur.execute(
                    """
                    UPDATE "Sessions"
                    SET "StartTimeUtc" = %s,
                        "Status" = %s,
                        "OpenF1SessionKey" = COALESCE(%s, "OpenF1SessionKey")
                    WHERE "Id" = %s
                    RETURNING "Id"
                    """,
                    (
                        session.start_time_utc,
                        session.status.value,
                        session.openf1_session_key,
                        str(existing["Id"]),
                    ),
                )
            else:
                # Insert new session
                cur.execute(
                    """
                    INSERT INTO "Sessions" ("Id", "RoundId", "Type", "StartTimeUtc",
                                           "Status", "OpenF1SessionKey")
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING "Id"
                    """,
                    (
                        str(session.id),
                        str(session.round_id),
                        session.type.value,
                        session.start_time_utc,
                        session.status.value,
                        session.openf1_session_key,
                    ),
                )
            
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else session.id

    def get_session_by_key(self, session_key: int) -> Session | None:
        """Get a session by its OpenF1 session key."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "RoundId", "Type", "StartTimeUtc", "Status", "OpenF1SessionKey"
                       FROM "Sessions" WHERE "OpenF1SessionKey" = %s""",
                (session_key,),
            )
            row = cur.fetchone()
            if row:
                return Session(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    type=SessionType(row["Type"]),
                    start_time_utc=row["StartTimeUtc"],
                    status=SessionStatus(row["Status"]),
                    openf1_session_key=row["OpenF1SessionKey"],
                )
            return None

    def get_completed_sessions_by_year(self, year: int) -> list[Session]:
        """Get all completed sessions for a given year.
        
        Used for results-only sync to find sessions that need results.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT s."Id", s."RoundId", s."Type", s."StartTimeUtc", 
                       s."Status", s."OpenF1SessionKey"
                FROM "Sessions" s
                JOIN "Rounds" r ON s."RoundId" = r."Id"
                JOIN "Seasons" se ON r."SeasonId" = se."Id"
                WHERE se."Year" = %s
                  AND s."Status" = %s
                  AND s."OpenF1SessionKey" IS NOT NULL
                ORDER BY s."StartTimeUtc"
                """,
                (year, SessionStatus.COMPLETED.value),
            )
            rows = cur.fetchall()
            return [
                Session(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    type=SessionType(row["Type"]),
                    start_time_utc=row["StartTimeUtc"],
                    status=SessionStatus(row["Status"]),
                    openf1_session_key=row["OpenF1SessionKey"],
                )
                for row in rows
            ]

    def get_sessions_by_round(self, round_id: UUID) -> list[Session]:
        """Get all sessions for a round."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT "Id", "RoundId", "Type", "StartTimeUtc", "Status", "OpenF1SessionKey"
                FROM "Sessions"
                WHERE "RoundId" = %s
                ORDER BY "Type"
                """,
                (str(round_id),),
            )
            rows = cur.fetchall()
            return [
                Session(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    type=SessionType(row["Type"]),
                    start_time_utc=row["StartTimeUtc"],
                    status=SessionStatus(row["Status"]),
                    openf1_session_key=row["OpenF1SessionKey"],
                )
                for row in rows
            ]

    def get_entrants_by_round_with_driver_refs(self, round_id: UUID) -> dict[str, UUID]:
        """Get all entrants for a round, keyed by driver slug.
        
        Returns a dict mapping driver_slug -> entrant_id.
        Used for Ergast results import where we match by driverRef.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT e."Id", d."Slug"
                FROM "Entrants" e
                JOIN "Drivers" d ON e."DriverId" = d."Id"
                WHERE e."RoundId" = %s AND d."Slug" IS NOT NULL
                """,
                (str(round_id),),
            )
            rows = cur.fetchall()
            return {row["Slug"]: _to_uuid(row["Id"]) for row in rows}

    def get_rounds_by_year(self, year: int, series_slug: str = "formula-1") -> list[Round]:
        """Get all rounds for a given year.
        
        Returns rounds ordered by round number for the specified series.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT r."Id", r."SeasonId", r."CircuitId", r."Name", r."Slug", 
                       r."RoundNumber", r."DateStart", r."DateEnd"
                FROM "Rounds" r
                JOIN "Seasons" se ON r."SeasonId" = se."Id"
                JOIN "Series" sr ON se."SeriesId" = sr."Id"
                WHERE se."Year" = %s AND sr."Slug" = %s
                ORDER BY r."RoundNumber"
                """,
                (year, series_slug),
            )
            rows = cur.fetchall()
            return [
                Round(
                    id=_to_uuid(row["Id"]),
                    season_id=_to_uuid(row["SeasonId"]),
                    circuit_id=_to_uuid(row["CircuitId"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    round_number=row["RoundNumber"],
                    date_start=row["DateStart"],
                    date_end=row["DateEnd"],
                )
                for row in rows
            ]

    def get_entrants_with_drivers_by_round(self, round_id: UUID) -> list[dict]:
        """Get all entrants for a round with driver info.
        
        Returns a list of dicts with entrant_id, first_name, last_name.
        Used for matching Ergast results to existing entrants by driver name.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT e."Id" as entrant_id, d."FirstName" as first_name, d."LastName" as last_name
                FROM "Entrants" e
                JOIN "Drivers" d ON e."DriverId" = d."Id"
                WHERE e."RoundId" = %s
                """,
                (str(round_id),),
            )
            rows = cur.fetchall()
            return [
                {
                    'entrant_id': _to_uuid(row["entrant_id"]),
                    'first_name': row["first_name"],
                    'last_name': row["last_name"],
                }
                for row in rows
            ]

    def get_entrants_by_round(self, round_id: UUID) -> dict[int, UUID]:
        """Get all entrants for a round, keyed by driver number.
        
        Returns a dict mapping driver_number -> entrant_id.
        Includes both current driver numbers and historical aliases.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            # Get entrants with current driver numbers
            cur.execute(
                """
                SELECT e."Id", d."DriverNumber"
                FROM "Entrants" e
                JOIN "Drivers" d ON e."DriverId" = d."Id"
                WHERE e."RoundId" = %s AND d."DriverNumber" IS NOT NULL
                """,
                (str(round_id),),
            )
            rows = cur.fetchall()
            result = {row["DriverNumber"]: _to_uuid(row["Id"]) for row in rows}
            
            # Also include historical driver numbers from aliases
            cur.execute(
                """
                SELECT e."Id", da."DriverNumber"
                FROM "Entrants" e
                JOIN "DriverAliases" da ON e."DriverId" = da."DriverId"
                WHERE e."RoundId" = %s AND da."DriverNumber" IS NOT NULL
                """,
                (str(round_id),),
            )
            alias_rows = cur.fetchall()
            for row in alias_rows:
                # Don't overwrite if we already have an entry from current driver number
                if row["DriverNumber"] not in result:
                    result[row["DriverNumber"]] = _to_uuid(row["Id"])
            
            return result

    def get_entrant_by_driver_number(self, round_id: UUID, driver_number: int) -> Entrant | None:
        """Get an entrant by round and driver number.
        
        First tries to find by the driver's current DriverNumber.
        Falls back to searching DriverAliases for historical driver numbers.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            # First try direct driver number match
            cur.execute(
                """
                SELECT e."Id", e."RoundId", e."DriverId", e."TeamId"
                FROM "Entrants" e
                JOIN "Drivers" d ON e."DriverId" = d."Id"
                WHERE e."RoundId" = %s AND d."DriverNumber" = %s
                """,
                (str(round_id), driver_number),
            )
            row = cur.fetchone()
            if row:
                return Entrant(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    driver_id=_to_uuid(row["DriverId"]),
                    team_id=_to_uuid(row["TeamId"]),
                )
            
            # Fall back to driver alias lookup (historical driver numbers)
            cur.execute(
                """
                SELECT e."Id", e."RoundId", e."DriverId", e."TeamId"
                FROM "Entrants" e
                JOIN "DriverAliases" da ON e."DriverId" = da."DriverId"
                WHERE e."RoundId" = %s AND da."DriverNumber" = %s
                """,
                (str(round_id), driver_number),
            )
            row = cur.fetchone()
            if row:
                return Entrant(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    driver_id=_to_uuid(row["DriverId"]),
                    team_id=_to_uuid(row["TeamId"]),
                )
            
            return None

    def count_results_for_session(self, session_id: UUID) -> int:
        """Count results for a session."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                'SELECT COUNT(*) as count FROM "Results" WHERE "SessionId" = %s',
                (str(session_id),),
            )
            row = cur.fetchone()
            return row["count"] if row else 0

    # =========================
    # Driver Operations
    # =========================

    def upsert_driver(self, driver: Driver) -> UUID:
        """Upsert a driver and return its ID.
        
        If driver.id is set and exists in DB, updates that driver.
        Otherwise uses OpenF1DriverNumber, DriverNumber, and Slug to find existing.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            existing_id = None
            
            # First check if driver.id is set and exists (entity resolver match)
            if driver.id is not None:
                cur.execute(
                    'SELECT "Id" FROM "Drivers" WHERE "Id" = %s',
                    (str(driver.id),),
                )
                row = cur.fetchone()
                if row:
                    existing_id = _to_uuid(row["Id"])
            
            # Try OpenF1 driver number (most stable for new drivers)
            if existing_id is None and driver.openf1_driver_number is not None:
                cur.execute(
                    'SELECT "Id" FROM "Drivers" WHERE "OpenF1DriverNumber" = %s',
                    (driver.openf1_driver_number,),
                )
                row = cur.fetchone()
                if row:
                    existing_id = _to_uuid(row["Id"])
            
            # Try driver number if not found
            if existing_id is None and driver.driver_number is not None:
                cur.execute(
                    'SELECT "Id" FROM "Drivers" WHERE "DriverNumber" = %s',
                    (driver.driver_number,),
                )
                row = cur.fetchone()
                if row:
                    existing_id = _to_uuid(row["Id"])
            
            # Fall back to slug
            if existing_id is None:
                cur.execute(
                    'SELECT "Id" FROM "Drivers" WHERE "Slug" = %s',
                    (driver.slug,),
                )
                row = cur.fetchone()
                if row:
                    existing_id = _to_uuid(row["Id"])
            
            # Now do the upsert
            if existing_id:
                # Update existing driver
                cur.execute(
                    """
                    UPDATE "Drivers" SET
                        "FirstName" = %s,
                        "LastName" = %s,
                        "Slug" = %s,
                        "Abbreviation" = %s,
                        "Nationality" = %s,
                        "HeadshotUrl" = %s,
                        "DriverNumber" = %s,
                        "OpenF1DriverNumber" = %s
                    WHERE "Id" = %s
                    RETURNING "Id"
                    """,
                    (
                        driver.first_name,
                        driver.last_name,
                        driver.slug,
                        driver.abbreviation,
                        driver.nationality,
                        driver.headshot_url,
                        driver.driver_number,
                        driver.openf1_driver_number,
                        str(existing_id),
                    ),
                )
            else:
                # Insert new driver
                cur.execute(
                    """
                    INSERT INTO "Drivers" ("Id", "FirstName", "LastName", "Slug",
                                          "Abbreviation", "Nationality", "HeadshotUrl",
                                          "DriverNumber", "OpenF1DriverNumber")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING "Id"
                    """,
                    (
                        str(driver.id),
                        driver.first_name,
                        driver.last_name,
                        driver.slug,
                        driver.abbreviation,
                        driver.nationality,
                        driver.headshot_url,
                        driver.driver_number,
                        driver.openf1_driver_number,
                    ),
                )
            
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else (existing_id or driver.id)

    def get_driver_by_slug(self, slug: str) -> Driver | None:
        """Get a driver by slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "FirstName", "LastName", "Slug", "Abbreviation",
                          "Nationality", "HeadshotUrl", "DriverNumber", "OpenF1DriverNumber"
                   FROM "Drivers" WHERE "Slug" = %s""",
                (slug,),
            )
            row = cur.fetchone()
            if row:
                return Driver(
                    id=_to_uuid(row["Id"]),
                    first_name=row["FirstName"],
                    last_name=row["LastName"],
                    slug=row["Slug"],
                    abbreviation=row["Abbreviation"],
                    nationality=row["Nationality"],
                    headshot_url=row["HeadshotUrl"],
                    driver_number=row["DriverNumber"],
                    openf1_driver_number=row["OpenF1DriverNumber"],
                )
            return None

    def get_all_drivers(self) -> list[Driver]:
        """Get all drivers from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "FirstName", "LastName", "Slug", "Abbreviation",
                          "Nationality", "HeadshotUrl", "DriverNumber", "OpenF1DriverNumber"
                   FROM "Drivers\""""
            )
            rows = cur.fetchall()
            return [
                Driver(
                    id=_to_uuid(row["Id"]),
                    first_name=row["FirstName"],
                    last_name=row["LastName"],
                    slug=row["Slug"],
                    abbreviation=row["Abbreviation"],
                    nationality=row["Nationality"],
                    headshot_url=row["HeadshotUrl"],
                    driver_number=row["DriverNumber"],
                    openf1_driver_number=row["OpenF1DriverNumber"],
                )
                for row in rows
            ]

    # =========================
    # Team Operations
    # =========================

    def upsert_team(self, team: Team) -> UUID:
        """Upsert a team and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "Teams" ("Id", "Name", "Slug", "ShortName", "LogoUrl",
                                    "PrimaryColor")
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT ("Slug") DO UPDATE SET
                    "Name" = EXCLUDED."Name",
                    "ShortName" = EXCLUDED."ShortName",
                    "LogoUrl" = EXCLUDED."LogoUrl",
                    "PrimaryColor" = EXCLUDED."PrimaryColor"
                RETURNING "Id"
                """,
                (
                    str(team.id),
                    team.name,
                    team.slug,
                    team.short_name,
                    team.logo_url,
                    team.primary_color,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else team.id

    def get_team_by_slug(self, slug: str) -> Team | None:
        """Get a team by slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "Name", "Slug", "ShortName", "LogoUrl", "PrimaryColor"
                       FROM "Teams" WHERE "Slug" = %s""",
                (slug,),
            )
            row = cur.fetchone()
            if row:
                return Team(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    short_name=row["ShortName"],
                    logo_url=row["LogoUrl"],
                    primary_color=row["PrimaryColor"],
                )
            return None

    def get_all_teams(self) -> list[Team]:
        """Get all teams from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "Name", "Slug", "ShortName", "LogoUrl", "PrimaryColor"
                   FROM "Teams\""""
            )
            rows = cur.fetchall()
            return [
                Team(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    short_name=row["ShortName"],
                    logo_url=row["LogoUrl"],
                    primary_color=row["PrimaryColor"],
                )
                for row in rows
            ]

    # =========================
    # Driver Alias Operations
    # =========================

    def upsert_driver_alias(self, alias: DriverAlias) -> UUID:
        """Upsert a driver alias and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "DriverAliases" ("Id", "DriverId", "AliasName", "AliasSlug",
                                            "SeriesId", "DriverNumber", "ValidFrom",
                                            "ValidUntil", "Source")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("DriverId", "AliasSlug") DO UPDATE SET
                    "AliasName" = EXCLUDED."AliasName",
                    "SeriesId" = EXCLUDED."SeriesId",
                    "DriverNumber" = EXCLUDED."DriverNumber",
                    "ValidFrom" = EXCLUDED."ValidFrom",
                    "ValidUntil" = EXCLUDED."ValidUntil",
                    "Source" = EXCLUDED."Source"
                RETURNING "Id"
                """,
                (
                    str(alias.id),
                    str(alias.driver_id),
                    alias.alias_name,
                    alias.alias_slug,
                    str(alias.series_id) if alias.series_id else None,
                    alias.driver_number,
                    alias.valid_from,
                    alias.valid_until,
                    alias.source,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else alias.id

    def get_all_driver_aliases(self) -> list[DriverAlias]:
        """Get all driver aliases from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "DriverId", "AliasName", "AliasSlug", "SeriesId",
                          "DriverNumber", "ValidFrom", "ValidUntil", "Source"
                   FROM "DriverAliases\""""
            )
            rows = cur.fetchall()
            return [
                DriverAlias(
                    id=_to_uuid(row["Id"]),
                    driver_id=_to_uuid(row["DriverId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    series_id=_to_uuid(row["SeriesId"]) if row["SeriesId"] else None,
                    driver_number=row["DriverNumber"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
                for row in rows
            ]

    def get_driver_alias_by_slug(self, alias_slug: str) -> DriverAlias | None:
        """Find a driver alias by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "DriverId", "AliasName", "AliasSlug", "SeriesId",
                          "DriverNumber", "ValidFrom", "ValidUntil", "Source"
                   FROM "DriverAliases" WHERE "AliasSlug" = %s""",
                (alias_slug,),
            )
            row = cur.fetchone()
            if row:
                return DriverAlias(
                    id=_to_uuid(row["Id"]),
                    driver_id=_to_uuid(row["DriverId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    series_id=_to_uuid(row["SeriesId"]) if row["SeriesId"] else None,
                    driver_number=row["DriverNumber"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
            return None

    # =========================
    # Team Alias Operations
    # =========================

    def upsert_team_alias(self, alias: TeamAlias) -> UUID:
        """Upsert a team alias and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "TeamAliases" ("Id", "TeamId", "AliasName", "AliasSlug",
                                          "SeriesId", "ValidFrom", "ValidUntil", "Source")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("TeamId", "AliasSlug") DO UPDATE SET
                    "AliasName" = EXCLUDED."AliasName",
                    "SeriesId" = EXCLUDED."SeriesId",
                    "ValidFrom" = EXCLUDED."ValidFrom",
                    "ValidUntil" = EXCLUDED."ValidUntil",
                    "Source" = EXCLUDED."Source"
                RETURNING "Id"
                """,
                (
                    str(alias.id),
                    str(alias.team_id),
                    alias.alias_name,
                    alias.alias_slug,
                    str(alias.series_id) if alias.series_id else None,
                    alias.valid_from,
                    alias.valid_until,
                    alias.source,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else alias.id

    def get_all_team_aliases(self) -> list[TeamAlias]:
        """Get all team aliases from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "TeamId", "AliasName", "AliasSlug", "SeriesId",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "TeamAliases\""""
            )
            rows = cur.fetchall()
            return [
                TeamAlias(
                    id=_to_uuid(row["Id"]),
                    team_id=_to_uuid(row["TeamId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    series_id=_to_uuid(row["SeriesId"]) if row["SeriesId"] else None,
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
                for row in rows
            ]

    def get_team_alias_by_slug(self, alias_slug: str) -> TeamAlias | None:
        """Find a team alias by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "TeamId", "AliasName", "AliasSlug", "SeriesId",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "TeamAliases" WHERE "AliasSlug" = %s""",
                (alias_slug,),
            )
            row = cur.fetchone()
            if row:
                return TeamAlias(
                    id=_to_uuid(row["Id"]),
                    team_id=_to_uuid(row["TeamId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    series_id=_to_uuid(row["SeriesId"]) if row["SeriesId"] else None,
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
            return None

    # =========================
    # Series Alias Operations
    # =========================

    def upsert_series_alias(self, alias: SeriesAlias) -> UUID:
        """Upsert a series alias and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "SeriesAliases" ("Id", "SeriesId", "AliasName", "AliasSlug",
                                            "LogoUrl", "ValidFrom", "ValidUntil", "Source")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("SeriesId", "AliasSlug") DO UPDATE SET
                    "AliasName" = EXCLUDED."AliasName",
                    "LogoUrl" = EXCLUDED."LogoUrl",
                    "ValidFrom" = EXCLUDED."ValidFrom",
                    "ValidUntil" = EXCLUDED."ValidUntil",
                    "Source" = EXCLUDED."Source"
                RETURNING "Id"
                """,
                (
                    str(alias.id),
                    str(alias.series_id),
                    alias.alias_name,
                    alias.alias_slug,
                    alias.logo_url,
                    alias.valid_from,
                    alias.valid_until,
                    alias.source,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else alias.id

    def get_all_series_aliases(self) -> list[SeriesAlias]:
        """Get all series aliases from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "SeriesId", "AliasName", "AliasSlug", "LogoUrl",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "SeriesAliases\""""
            )
            rows = cur.fetchall()
            return [
                SeriesAlias(
                    id=_to_uuid(row["Id"]),
                    series_id=_to_uuid(row["SeriesId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    logo_url=row["LogoUrl"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
                for row in rows
            ]

    def get_series_alias_by_slug(self, alias_slug: str) -> SeriesAlias | None:
        """Find a series alias by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "SeriesId", "AliasName", "AliasSlug", "LogoUrl",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "SeriesAliases" WHERE "AliasSlug" = %s""",
                (alias_slug,),
            )
            row = cur.fetchone()
            if row:
                return SeriesAlias(
                    id=_to_uuid(row["Id"]),
                    series_id=_to_uuid(row["SeriesId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    logo_url=row["LogoUrl"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
            return None

    def get_all_series(self) -> list[Series]:
        """Get all series from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "Name", "Slug", "LogoUrl"
                   FROM "Series\""""
            )
            rows = cur.fetchall()
            return [
                Series(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    logo_url=row["LogoUrl"],
                )
                for row in rows
            ]

    # =========================
    # Circuit Alias Operations
    # =========================

    def upsert_circuit_alias(self, alias: CircuitAlias) -> UUID:
        """Upsert a circuit alias and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "CircuitAliases" ("Id", "CircuitId", "AliasName", "AliasSlug",
                                             "ValidFrom", "ValidUntil", "Source")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("CircuitId", "AliasSlug") DO UPDATE SET
                    "AliasName" = EXCLUDED."AliasName",
                    "ValidFrom" = EXCLUDED."ValidFrom",
                    "ValidUntil" = EXCLUDED."ValidUntil",
                    "Source" = EXCLUDED."Source"
                RETURNING "Id"
                """,
                (
                    str(alias.id),
                    str(alias.circuit_id),
                    alias.alias_name,
                    alias.alias_slug,
                    alias.valid_from,
                    alias.valid_until,
                    alias.source,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else alias.id

    def get_all_circuit_aliases(self) -> list[CircuitAlias]:
        """Get all circuit aliases from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "CircuitId", "AliasName", "AliasSlug",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "CircuitAliases\""""
            )
            rows = cur.fetchall()
            return [
                CircuitAlias(
                    id=_to_uuid(row["Id"]),
                    circuit_id=_to_uuid(row["CircuitId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
                for row in rows
            ]

    def get_circuit_alias_by_slug(self, alias_slug: str) -> CircuitAlias | None:
        """Find a circuit alias by its slug."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "CircuitId", "AliasName", "AliasSlug",
                          "ValidFrom", "ValidUntil", "Source"
                   FROM "CircuitAliases" WHERE "AliasSlug" = %s""",
                (alias_slug,),
            )
            row = cur.fetchone()
            if row:
                return CircuitAlias(
                    id=_to_uuid(row["Id"]),
                    circuit_id=_to_uuid(row["CircuitId"]),
                    alias_name=row["AliasName"],
                    alias_slug=row["AliasSlug"],
                    valid_from=row["ValidFrom"],
                    valid_until=row["ValidUntil"],
                    source=row["Source"],
                )
            return None

    def get_all_circuits(self) -> list[Circuit]:
        """Get all circuits from the database."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "Name", "Slug", "Location", "Country", "CountryCode",
                          "LayoutMapUrl", "Latitude", "Longitude", "LengthMeters"
                   FROM "Circuits\""""
            )
            rows = cur.fetchall()
            return [
                Circuit(
                    id=_to_uuid(row["Id"]),
                    name=row["Name"],
                    slug=row["Slug"],
                    location=row["Location"],
                    country=row["Country"],
                    country_code=row["CountryCode"],
                    layout_map_url=row["LayoutMapUrl"],
                    latitude=row["Latitude"],
                    longitude=row["Longitude"],
                    length_meters=row["LengthMeters"],
                )
                for row in rows
            ]

    # =========================
    # Entrant Operations
    # =========================

    def upsert_entrant(self, entrant: Entrant) -> UUID:
        """Upsert an entrant and return its ID."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                    INSERT INTO "Entrants" ("Id", "RoundId", "DriverId", "TeamId")
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT ("RoundId", "DriverId") DO UPDATE SET
                        "TeamId" = EXCLUDED."TeamId"
                    RETURNING "Id"
                    """,
                (
                    str(entrant.id),
                    str(entrant.round_id),
                    str(entrant.driver_id),
                    str(entrant.team_id),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else entrant.id

    def get_entrant(self, round_id: UUID, driver_id: UUID) -> Entrant | None:
        """Get an entrant by round and driver."""
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT "Id", "RoundId", "DriverId", "TeamId"
                       FROM "Entrants" WHERE "RoundId" = %s AND "DriverId" = %s""",
                (str(round_id), str(driver_id)),
            )
            row = cur.fetchone()
            if row:
                return Entrant(
                    id=_to_uuid(row["Id"]),
                    round_id=_to_uuid(row["RoundId"]),
                    driver_id=_to_uuid(row["DriverId"]),
                    team_id=_to_uuid(row["TeamId"]),
                )
            return None

    # =========================
    # Result Operations
    # =========================

    def upsert_result(self, result: Result) -> UUID:
        """Upsert a result and return its ID.

        ⚠️ SPOILER DATA - This contains race results.
        """
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO "Results" ("Id", "SessionId", "EntrantId", "Position",
                                      "GridPosition", "Status", "Points", "Time", "Laps",
                                      "FastestLap")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("SessionId", "EntrantId") DO UPDATE SET
                    "Position" = EXCLUDED."Position",
                    "GridPosition" = EXCLUDED."GridPosition",
                    "Status" = EXCLUDED."Status",
                    "Points" = EXCLUDED."Points",
                    "Time" = EXCLUDED."Time",
                    "Laps" = EXCLUDED."Laps",
                    "FastestLap" = EXCLUDED."FastestLap"
                RETURNING "Id"
                """,
                (
                    str(result.id),
                    str(result.session_id),
                    str(result.entrant_id),
                    result.position,
                    result.grid_position,
                    result.status.value,
                    result.points,
                    # Convert milliseconds to PostgreSQL interval
                    (
                        f"{result.time_milliseconds} milliseconds"
                        if result.time_milliseconds
                        else None
                    ),
                    result.laps,
                    result.fastest_lap,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _to_uuid(row["Id"]) if row else result.id

    # =========================
    # Bulk Operations
    # =========================

    def bulk_upsert_sessions(self, sessions: list[Session]) -> list[UUID]:
        """Upsert multiple sessions in a single transaction."""
        ids: list[UUID] = []
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            for session in sessions:
                cur.execute(
                    """
                    INSERT INTO "Sessions" ("Id", "RoundId", "Type", "StartTimeUtc",
                                           "Status", "OpenF1SessionKey")
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("OpenF1SessionKey") DO UPDATE SET
                        "RoundId" = EXCLUDED."RoundId",
                        "Type" = EXCLUDED."Type",
                        "StartTimeUtc" = EXCLUDED."StartTimeUtc",
                        "Status" = EXCLUDED."Status"
                    RETURNING "Id"
                    """,
                    (
                        str(session.id),
                        str(session.round_id),
                        session.type.value,
                        session.start_time_utc,
                        session.status.value,
                        session.openf1_session_key,
                    ),
                )
                row = cur.fetchone()
                ids.append(_to_uuid(row["Id"]) if row else session.id)
            conn.commit()
        return ids

    def bulk_upsert_results(self, results: list[Result]) -> list[UUID]:
        """Upsert multiple results in a single transaction.

        ⚠️ SPOILER DATA - This contains race results.
        """
        ids: list[UUID] = []
        with self._get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            for result in results:
                cur.execute(
                    """
                    INSERT INTO "Results" ("Id", "SessionId", "EntrantId", "Position",
                                          "GridPosition", "Status", "StatusDetail", "Points", "Time",
                                          "TimeMilliseconds", "Laps", "FastestLap", "FastestLapNumber",
                                          "FastestLapRank", "FastestLapTime", "FastestLapSpeed",
                                          "Q1Time", "Q2Time", "Q3Time")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("SessionId", "EntrantId") DO UPDATE SET
                        "Position" = EXCLUDED."Position",
                        "GridPosition" = EXCLUDED."GridPosition",
                        "Status" = EXCLUDED."Status",
                        "StatusDetail" = EXCLUDED."StatusDetail",
                        "Points" = EXCLUDED."Points",
                        "Time" = EXCLUDED."Time",
                        "TimeMilliseconds" = EXCLUDED."TimeMilliseconds",
                        "Laps" = EXCLUDED."Laps",
                        "FastestLap" = EXCLUDED."FastestLap",
                        "FastestLapNumber" = EXCLUDED."FastestLapNumber",
                        "FastestLapRank" = EXCLUDED."FastestLapRank",
                        "FastestLapTime" = EXCLUDED."FastestLapTime",
                        "FastestLapSpeed" = EXCLUDED."FastestLapSpeed",
                        "Q1Time" = EXCLUDED."Q1Time",
                        "Q2Time" = EXCLUDED."Q2Time",
                        "Q3Time" = EXCLUDED."Q3Time"
                    RETURNING "Id"
                    """,
                    (
                        str(result.id),
                        str(result.session_id),
                        str(result.entrant_id),
                        result.position,
                        result.grid_position,
                        result.status.value,
                        result.status_detail,
                        result.points,
                        (
                            f"{result.time_milliseconds} milliseconds"
                            if result.time_milliseconds
                            else None
                        ),
                        result.time_milliseconds,
                        result.laps,
                        result.fastest_lap,
                        result.fastest_lap_number,
                        result.fastest_lap_rank,
                        result.fastest_lap_time,
                        result.fastest_lap_speed,
                        result.q1_time,
                        result.q2_time,
                        result.q3_time,
                    ),
                )
                row = cur.fetchone()
                ids.append(_to_uuid(row["Id"]) if row else result.id)
            conn.commit()
        return ids

    def delete_results_for_year(self, year: int, series_slug: str = "formula-1") -> int:
        """Delete all results for a specific year.
        
        ⚠️ DESTRUCTIVE - This permanently removes results data.
        
        Args:
            year: The season year to delete results for
            series_slug: The series slug (default: "formula-1")
            
        Returns:
            Number of results deleted
        """
        with self._get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM "Results" r
                USING "Sessions" s
                JOIN "Rounds" rd ON s."RoundId" = rd."Id"
                JOIN "Seasons" sn ON rd."SeasonId" = sn."Id"
                JOIN "Series" sr ON sn."SeriesId" = sr."Id"
                WHERE r."SessionId" = s."Id"
                  AND sn."Year" = %s
                  AND sr."Slug" = %s
                """,
                (year, series_slug),
            )
            deleted_count = cur.rowcount
            conn.commit()
            
        logger.info(
            "Deleted results for year",
            year=year,
            series=series_slug,
            count=deleted_count,
        )
        return deleted_count

    def delete_results_for_year_range(
        self, start_year: int, end_year: int, series_slug: str = "formula-1"
    ) -> int:
        """Delete all results for a range of years.
        
        ⚠️ DESTRUCTIVE - This permanently removes results data.
        
        Args:
            start_year: First year (inclusive)
            end_year: Last year (inclusive)
            series_slug: The series slug (default: "formula-1")
            
        Returns:
            Total number of results deleted
        """
        with self._get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM "Results" r
                USING "Sessions" s
                JOIN "Rounds" rd ON s."RoundId" = rd."Id"
                JOIN "Seasons" sn ON rd."SeasonId" = sn."Id"
                JOIN "Series" sr ON sn."SeriesId" = sr."Id"
                WHERE r."SessionId" = s."Id"
                  AND sn."Year" >= %s
                  AND sn."Year" <= %s
                  AND sr."Slug" = %s
                """,
                (start_year, end_year, series_slug),
            )
            deleted_count = cur.rowcount
            conn.commit()
            
        logger.info(
            "Deleted results for year range",
            start_year=start_year,
            end_year=end_year,
            series=series_slug,
            count=deleted_count,
        )
        return deleted_count

    def count_results_for_year_range(
        self, start_year: int, end_year: int, series_slug: str = "formula-1"
    ) -> int:
        """Count results for a range of years.
        
        Args:
            start_year: First year (inclusive)
            end_year: Last year (inclusive)
            series_slug: The series slug (default: "formula-1")
            
        Returns:
            Number of results in the year range
        """
        with self._get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) as count
                FROM "Results" r
                JOIN "Sessions" s ON r."SessionId" = s."Id"
                JOIN "Rounds" rd ON s."RoundId" = rd."Id"
                JOIN "Seasons" sn ON rd."SeasonId" = sn."Id"
                JOIN "Series" sr ON sn."SeriesId" = sr."Id"
                WHERE sn."Year" >= %s
                  AND sn."Year" <= %s
                  AND sr."Slug" = %s
                """,
                (start_year, end_year, series_slug),
            )
            row = cur.fetchone()
            return row[0] if row else 0
