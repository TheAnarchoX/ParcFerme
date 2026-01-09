"""
Database models for Parc Fermé ingestion.

These Pydantic models represent the racing domain entities that will be
synced to PostgreSQL. They mirror the C# models in ParcFerme.Api.Models.
"""

from datetime import date, datetime
from enum import Enum, IntEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

# =========================
# Enums
# =========================


class SessionType(IntEnum):
    """Type of racing session."""

    FP1 = 0
    FP2 = 1
    FP3 = 2
    QUALIFYING = 3
    SPRINT_QUALIFYING = 4
    SPRINT = 5
    RACE = 6
    WARMUP = 7
    # MotoGP-specific
    MOTO3_RACE = 8
    MOTO2_RACE = 9
    MOTOGP_RACE = 10


class SessionStatus(IntEnum):
    """Status of a session."""

    SCHEDULED = 0
    IN_PROGRESS = 1
    COMPLETED = 2
    CANCELLED = 3
    DELAYED = 4


class ResultStatus(IntEnum):
    """Result status for an entrant."""

    FINISHED = 0
    DNF = 1
    DNS = 2
    DSQ = 3
    NC = 4  # Not Classified


# =========================
# Domain Models
# =========================


class Series(BaseModel):
    """Racing series (F1, MotoGP, IndyCar, WEC)."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    slug: str
    logo_url: str | None = None


class Season(BaseModel):
    """A season within a series (e.g., 'F1 2024')."""

    id: UUID = Field(default_factory=uuid4)
    series_id: UUID
    year: int


class Circuit(BaseModel):
    """A racing circuit/track."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    slug: str
    location: str
    country: str
    country_code: str | None = None
    layout_map_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    length_meters: int | None = None


class Round(BaseModel):
    """A race weekend (e.g., '2024 British Grand Prix')."""

    id: UUID = Field(default_factory=uuid4)
    season_id: UUID
    circuit_id: UUID
    name: str
    slug: str
    round_number: int
    date_start: date
    date_end: date
    openf1_meeting_key: int | None = None


class Session(BaseModel):
    """A single session within a round (FP1, Qualifying, Race, etc.)."""

    id: UUID = Field(default_factory=uuid4)
    round_id: UUID
    type: SessionType
    start_time_utc: datetime
    status: SessionStatus = SessionStatus.SCHEDULED
    openf1_session_key: int | None = None


class Driver(BaseModel):
    """A driver in the database."""

    id: UUID = Field(default_factory=uuid4)
    first_name: str
    last_name: str
    slug: str
    abbreviation: str | None = None
    nationality: str | None = None
    headshot_url: str | None = None
    driver_number: int | None = None
    openf1_driver_number: int | None = None


class DriverAlias(BaseModel):
    """Historical alias for a driver (name variations, previous names)."""

    id: UUID = Field(default_factory=uuid4)
    driver_id: UUID
    alias_name: str
    alias_slug: str
    series_id: UUID | None = None
    driver_number: int | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    source: str | None = None


class Team(BaseModel):
    """A team/constructor in the database."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    slug: str
    short_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None


class TeamAlias(BaseModel):
    """Historical alias for a team (name variations, rebrands)."""

    id: UUID = Field(default_factory=uuid4)
    team_id: UUID
    alias_name: str
    alias_slug: str
    series_id: UUID | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    source: str | None = None


class SeriesAlias(BaseModel):
    """Historical alias for a series (name variations, rebrands)."""

    id: UUID = Field(default_factory=uuid4)
    series_id: UUID
    alias_name: str
    alias_slug: str
    logo_url: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    source: str | None = None


class CircuitAlias(BaseModel):
    """Historical alias for a circuit (name variations, title sponsor changes)."""

    id: UUID = Field(default_factory=uuid4)
    circuit_id: UUID
    alias_name: str
    alias_slug: str
    valid_from: date | None = None
    valid_until: date | None = None
    source: str | None = None


class Entrant(BaseModel):
    """Links a driver to a team for a specific round."""

    id: UUID = Field(default_factory=uuid4)
    round_id: UUID
    driver_id: UUID
    team_id: UUID


class Result(BaseModel):
    """
    Session result for an entrant.

    ⚠️ SPOILER DATA - Must be protected by Spoiler Shield.
    """

    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    entrant_id: UUID
    position: int | None = None
    grid_position: int | None = None
    status: ResultStatus = ResultStatus.FINISHED
    status_detail: str | None = None  # e.g., "Engine", "Collision", "+1 Lap"
    points: float | None = None
    time_milliseconds: int | None = None
    laps: int | None = None
    fastest_lap: bool = False
    fastest_lap_number: int | None = None
    fastest_lap_rank: int | None = None
    fastest_lap_time: str | None = None  # e.g., "1:27.452"
    fastest_lap_speed: str | None = None  # e.g., "218.300" km/h
    # Qualifying-specific times
    q1_time: str | None = None
    q2_time: str | None = None
    q3_time: str | None = None


# =========================
# Ingestion Support Models
# =========================


class PendingMatchEntityType(int, Enum):
    """Entity types that can have pending matches.
    
    Values match C# enum PendingMatchEntityType in Models/PendingMatch.cs
    """
    DRIVER = 0
    TEAM = 1
    CIRCUIT = 2
    ROUND = 3
    
    @classmethod
    def from_string(cls, value: str) -> "PendingMatchEntityType":
        """Convert string name to enum value."""
        mapping = {"driver": cls.DRIVER, "team": cls.TEAM, "circuit": cls.CIRCUIT, "round": cls.ROUND}
        return mapping.get(value.lower(), cls.DRIVER)
    
    def to_string(self) -> str:
        """Convert enum to lowercase string name."""
        return self.name.lower()


class PendingMatchStatus(int, Enum):
    """Resolution status for pending matches.
    
    Values match C# enum PendingMatchStatus in Models/PendingMatch.cs
    """
    PENDING = 0
    APPROVED = 1
    REJECTED = 2
    MERGED = 3
    
    @classmethod
    def from_string(cls, value: str) -> "PendingMatchStatus":
        """Convert string name to enum value."""
        mapping = {"pending": cls.PENDING, "approved": cls.APPROVED, "rejected": cls.REJECTED, "merged": cls.MERGED}
        return mapping.get(value.lower(), cls.PENDING)
    
    def to_string(self) -> str:
        """Convert enum to lowercase string name."""
        return self.name.lower()


class PendingMatchResolution(int, Enum):
    """Resolution action taken for a pending match.
    
    Values match C# enum PendingMatchResolution in Models/PendingMatch.cs
    """
    MATCH_EXISTING = 0
    CREATE_NEW = 1
    SKIP = 2
    
    @classmethod
    def from_string(cls, value: str) -> "PendingMatchResolution":
        """Convert string name to enum value."""
        mapping = {"match_existing": cls.MATCH_EXISTING, "create_new": cls.CREATE_NEW, "skip": cls.SKIP}
        return mapping.get(value.lower(), cls.MATCH_EXISTING)
    
    def to_string(self) -> str:
        """Convert enum to lowercase string name."""
        return self.name.lower()


class PendingMatch(BaseModel):
    """
    A pending entity match that needs human review.
    
    Used when the matching engine has medium-low confidence (0.5-0.7)
    about whether incoming data matches an existing entity.
    """

    id: UUID = Field(default_factory=uuid4)
    entity_type: PendingMatchEntityType
    incoming_name: str
    incoming_data_json: str | None = None
    candidate_entity_id: UUID | None = None
    candidate_entity_name: str | None = None
    match_score: float
    signals_json: str | None = None
    source: str
    status: PendingMatchStatus = PendingMatchStatus.PENDING
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    resolution: PendingMatchResolution | None = None
    resolution_notes: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())


# =========================
# OpenF1 -> Domain Mappings
# =========================


# Map OpenF1 session_type strings to our SessionType enum
OPENF1_SESSION_TYPE_MAP: dict[str, SessionType] = {
    "Practice 1": SessionType.FP1,
    "Practice 2": SessionType.FP2,
    "Practice 3": SessionType.FP3,
    "Qualifying": SessionType.QUALIFYING,
    "Sprint Qualifying": SessionType.SPRINT_QUALIFYING,
    "Sprint Shootout": SessionType.SPRINT_QUALIFYING,
    "Sprint": SessionType.SPRINT,
    "Race": SessionType.RACE,
}


def slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    import re

    # Convert to lowercase
    slug = text.lower()
    # Replace spaces and underscores with hyphens
    slug = re.sub(r"[\s_]+", "-", slug)
    # Remove non-alphanumeric characters except hyphens
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    # Remove consecutive hyphens
    slug = re.sub(r"-+", "-", slug)
    # Strip leading/trailing hyphens
    slug = slug.strip("-")
    return slug
