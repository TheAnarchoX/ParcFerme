"""
Database repository for upserting racing data.

Uses psycopg3 for PostgreSQL operations with proper connection pooling
and upsert semantics (INSERT ... ON CONFLICT DO UPDATE).
"""

from contextlib import contextmanager
from datetime import date, datetime
from typing import Any, Generator
from uuid import UUID

import psycopg  # type: ignore
from psycopg.rows import dict_row  # type: ignore
import structlog  # type: ignore

from ingestion.config import settings
from ingestion.models import (
    Circuit,
    Driver,
    Entrant,
    Result,
    ResultStatus,
    Round,
    Season,
    Series,
    Session,
    SessionStatus,
    SessionType,
    Team,
)

logger = structlog.get_logger()


class RacingRepository:
    """Repository for racing data operations.

    Provides upsert semantics - entities are inserted if new,
    or updated if they already exist (based on unique constraints).
    """

    def __init__(self, connection_string: str | None = None) -> None:
        self.connection_string = connection_string or settings.database_url
        self._pool: psycopg.ConnectionPool | None = None

    def connect(self) -> None:
        """Initialize the connection pool."""
        self._pool = psycopg.ConnectionPool(
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
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
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
                return UUID(row["Id"]) if row else series.id

    def get_series_by_slug(self, slug: str) -> Series | None:
        """Get a series by its slug."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    'SELECT "Id", "Name", "Slug", "LogoUrl" FROM "Series" WHERE "Slug" = %s',
                    (slug,),
                )
                row = cur.fetchone()
                if row:
                    return Series(
                        id=UUID(row["Id"]),
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
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
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
                return UUID(row["Id"]) if row else season.id

    def get_season(self, series_id: UUID, year: int) -> Season | None:
        """Get a season by series and year."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    'SELECT "Id", "SeriesId", "Year" FROM "Seasons" WHERE "SeriesId" = %s AND "Year" = %s',
                    (str(series_id), year),
                )
                row = cur.fetchone()
                if row:
                    return Season(
                        id=UUID(row["Id"]),
                        series_id=UUID(row["SeriesId"]),
                        year=row["Year"],
                    )
                return None

    # =========================
    # Circuit Operations
    # =========================

    def upsert_circuit(self, circuit: Circuit) -> UUID:
        """Upsert a circuit and return its ID."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Circuits" ("Id", "Name", "Slug", "Location", "Country", 
                                           "CountryCode", "LayoutMapUrl", "Latitude", "Longitude", "LengthMeters")
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
                return UUID(row["Id"]) if row else circuit.id

    def get_circuit_by_slug(self, slug: str) -> Circuit | None:
        """Get a circuit by its slug."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "Name", "Slug", "Location", "Country", "CountryCode",
                              "LayoutMapUrl", "Latitude", "Longitude", "LengthMeters"
                       FROM "Circuits" WHERE "Slug" = %s''',
                    (slug,),
                )
                row = cur.fetchone()
                if row:
                    return Circuit(
                        id=UUID(row["Id"]),
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
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Rounds" ("Id", "SeasonId", "CircuitId", "Name", "Slug", 
                                         "RoundNumber", "DateStart", "DateEnd", "OpenF1MeetingKey")
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
                return UUID(row["Id"]) if row else round_.id

    def get_round_by_meeting_key(self, meeting_key: int) -> Round | None:
        """Get a round by its OpenF1 meeting key."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "SeasonId", "CircuitId", "Name", "Slug", "RoundNumber",
                              "DateStart", "DateEnd", "OpenF1MeetingKey"
                       FROM "Rounds" WHERE "OpenF1MeetingKey" = %s''',
                    (meeting_key,),
                )
                row = cur.fetchone()
                if row:
                    return Round(
                        id=UUID(row["Id"]),
                        season_id=UUID(row["SeasonId"]),
                        circuit_id=UUID(row["CircuitId"]),
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
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Sessions" ("Id", "RoundId", "Type", "StartTimeUtc", "Status", "OpenF1SessionKey")
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
                return UUID(row["Id"]) if row else session.id

    def get_session_by_key(self, session_key: int) -> Session | None:
        """Get a session by its OpenF1 session key."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "RoundId", "Type", "StartTimeUtc", "Status", "OpenF1SessionKey"
                       FROM "Sessions" WHERE "OpenF1SessionKey" = %s''',
                    (session_key,),
                )
                row = cur.fetchone()
                if row:
                    return Session(
                        id=UUID(row["Id"]),
                        round_id=UUID(row["RoundId"]),
                        type=SessionType(row["Type"]),
                        start_time_utc=row["StartTimeUtc"],
                        status=SessionStatus(row["Status"]),
                        openf1_session_key=row["OpenF1SessionKey"],
                    )
                return None

    # =========================
    # Driver Operations
    # =========================

    def upsert_driver(self, driver: Driver) -> UUID:
        """Upsert a driver and return its ID."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Drivers" ("Id", "FirstName", "LastName", "Slug", "Abbreviation", 
                                          "Nationality", "HeadshotUrl")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("Slug") DO UPDATE SET
                        "FirstName" = EXCLUDED."FirstName",
                        "LastName" = EXCLUDED."LastName",
                        "Abbreviation" = EXCLUDED."Abbreviation",
                        "Nationality" = EXCLUDED."Nationality",
                        "HeadshotUrl" = EXCLUDED."HeadshotUrl"
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
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return UUID(row["Id"]) if row else driver.id

    def get_driver_by_slug(self, slug: str) -> Driver | None:
        """Get a driver by slug."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "FirstName", "LastName", "Slug", "Abbreviation", 
                              "Nationality", "HeadshotUrl"
                       FROM "Drivers" WHERE "Slug" = %s''',
                    (slug,),
                )
                row = cur.fetchone()
                if row:
                    return Driver(
                        id=UUID(row["Id"]),
                        first_name=row["FirstName"],
                        last_name=row["LastName"],
                        slug=row["Slug"],
                        abbreviation=row["Abbreviation"],
                        nationality=row["Nationality"],
                        headshot_url=row["HeadshotUrl"],
                    )
                return None

    # =========================
    # Team Operations
    # =========================

    def upsert_team(self, team: Team) -> UUID:
        """Upsert a team and return its ID."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Teams" ("Id", "Name", "Slug", "ShortName", "LogoUrl", "PrimaryColor")
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
                return UUID(row["Id"]) if row else team.id

    def get_team_by_slug(self, slug: str) -> Team | None:
        """Get a team by slug."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "Name", "Slug", "ShortName", "LogoUrl", "PrimaryColor"
                       FROM "Teams" WHERE "Slug" = %s''',
                    (slug,),
                )
                row = cur.fetchone()
                if row:
                    return Team(
                        id=UUID(row["Id"]),
                        name=row["Name"],
                        slug=row["Slug"],
                        short_name=row["ShortName"],
                        logo_url=row["LogoUrl"],
                        primary_color=row["PrimaryColor"],
                    )
                return None

    # =========================
    # Entrant Operations
    # =========================

    def upsert_entrant(self, entrant: Entrant) -> UUID:
        """Upsert an entrant and return its ID."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Entrants" ("Id", "RoundId", "DriverId", "TeamId", "CarNumber")
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT ("RoundId", "DriverId") DO UPDATE SET
                        "TeamId" = EXCLUDED."TeamId",
                        "CarNumber" = EXCLUDED."CarNumber"
                    RETURNING "Id"
                    """,
                    (
                        str(entrant.id),
                        str(entrant.round_id),
                        str(entrant.driver_id),
                        str(entrant.team_id),
                        entrant.car_number,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return UUID(row["Id"]) if row else entrant.id

    def get_entrant(self, round_id: UUID, driver_id: UUID) -> Entrant | None:
        """Get an entrant by round and driver."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "RoundId", "DriverId", "TeamId", "CarNumber"
                       FROM "Entrants" WHERE "RoundId" = %s AND "DriverId" = %s''',
                    (str(round_id), str(driver_id)),
                )
                row = cur.fetchone()
                if row:
                    return Entrant(
                        id=UUID(row["Id"]),
                        round_id=UUID(row["RoundId"]),
                        driver_id=UUID(row["DriverId"]),
                        team_id=UUID(row["TeamId"]),
                        car_number=row["CarNumber"],
                    )
                return None

    def get_entrant_by_driver_number(self, round_id: UUID, car_number: int) -> Entrant | None:
        """Get an entrant by round and car number."""
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    '''SELECT "Id", "RoundId", "DriverId", "TeamId", "CarNumber"
                       FROM "Entrants" WHERE "RoundId" = %s AND "CarNumber" = %s''',
                    (str(round_id), car_number),
                )
                row = cur.fetchone()
                if row:
                    return Entrant(
                        id=UUID(row["Id"]),
                        round_id=UUID(row["RoundId"]),
                        driver_id=UUID(row["DriverId"]),
                        team_id=UUID(row["TeamId"]),
                        car_number=row["CarNumber"],
                    )
                return None

    # =========================
    # Result Operations
    # =========================

    def upsert_result(self, result: Result) -> UUID:
        """Upsert a result and return its ID.

        ⚠️ SPOILER DATA - This contains race results.
        """
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO "Results" ("Id", "SessionId", "EntrantId", "Position", "GridPosition",
                                          "Status", "Points", "Time", "Laps", "FastestLap")
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
                        f"{result.time_milliseconds} milliseconds" if result.time_milliseconds else None,
                        result.laps,
                        result.fastest_lap,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return UUID(row["Id"]) if row else result.id

    # =========================
    # Bulk Operations
    # =========================

    def bulk_upsert_sessions(self, sessions: list[Session]) -> list[UUID]:
        """Upsert multiple sessions in a single transaction."""
        ids: list[UUID] = []
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                for session in sessions:
                    cur.execute(
                        """
                        INSERT INTO "Sessions" ("Id", "RoundId", "Type", "StartTimeUtc", "Status", "OpenF1SessionKey")
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
                    ids.append(UUID(row["Id"]) if row else session.id)
                conn.commit()
        return ids

    def bulk_upsert_results(self, results: list[Result]) -> list[UUID]:
        """Upsert multiple results in a single transaction.

        ⚠️ SPOILER DATA - This contains race results.
        """
        ids: list[UUID] = []
        with self._get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                for result in results:
                    cur.execute(
                        """
                        INSERT INTO "Results" ("Id", "SessionId", "EntrantId", "Position", "GridPosition",
                                              "Status", "Points", "Time", "Laps", "FastestLap")
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
                            f"{result.time_milliseconds} milliseconds" if result.time_milliseconds else None,
                            result.laps,
                            result.fastest_lap,
                        ),
                    )
                    row = cur.fetchone()
                    ids.append(UUID(row["Id"]) if row else result.id)
                conn.commit()
        return ids
