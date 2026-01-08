"""
Base data source interface for racing data ingestion.

This module defines the abstract protocol that all data sources must implement.
Each data source (OpenF1, Ergast, community scrapers) adapts external data
formats to our internal SourceXxx models, which are then mapped to domain
entities by the sync services.

The source models are intentionally flat and simple - they represent what
the source provides, not our internal domain model complexity.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import IntEnum
from typing import Any


class DataSourceError(Exception):
    """Base exception for data source errors."""

    def __init__(self, message: str, source: str, retryable: bool = False):
        self.message = message
        self.source = source
        self.retryable = retryable
        super().__init__(f"[{source}] {message}")


class DataSourceUnavailable(DataSourceError):
    """Raised when a data source is unavailable (API down, DB connection failed)."""

    def __init__(self, message: str, source: str):
        super().__init__(message, source, retryable=True)


class DataSourceRateLimited(DataSourceError):
    """Raised when a data source rate limits our requests."""

    def __init__(self, message: str, source: str, retry_after: int | None = None):
        super().__init__(message, source, retryable=True)
        self.retry_after = retry_after


# =============================================================================
# Source Models - Generic representations from external data sources
# =============================================================================


@dataclass
class SourceCircuit:
    """Circuit data from an external source.
    
    This is a source-agnostic representation of a circuit.
    The sync service will match this to existing circuits or create new ones.
    """
    name: str
    short_name: str | None = None  # For matching (e.g., "Silverstone" vs "Silverstone Circuit")
    location: str | None = None
    country: str | None = None
    country_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    altitude: int | None = None  # meters above sea level
    length_meters: int | None = None
    wikipedia_url: str | None = None
    
    # Source-specific identifiers (for correlation during import)
    source_id: str | None = None  # e.g., "albert_park" for Ergast, circuit_key for OpenF1


@dataclass
class SourceDriver:
    """Driver data from an external source."""
    first_name: str
    last_name: str
    abbreviation: str | None = None  # e.g., "HAM", "VER"
    nationality: str | None = None
    country_code: str | None = None
    driver_number: int | None = None
    date_of_birth: date | None = None
    headshot_url: str | None = None
    wikipedia_url: str | None = None
    
    # Source-specific identifiers
    source_id: str | None = None  # e.g., "hamilton" for Ergast, driver_number for OpenF1
    
    @property
    def full_name(self) -> str:
        """Full name for display and matching."""
        return f"{self.first_name} {self.last_name}"


@dataclass
class SourceTeam:
    """Team/constructor data from an external source."""
    name: str
    short_name: str | None = None
    nationality: str | None = None
    primary_color: str | None = None  # Hex color code
    logo_url: str | None = None
    wikipedia_url: str | None = None
    
    # Source-specific identifiers
    source_id: str | None = None  # e.g., "mclaren" for Ergast


@dataclass
class SourceMeeting:
    """Meeting (race weekend) data from an external source.
    
    Represents a single race weekend that contains one or more sessions.
    """
    name: str
    official_name: str | None = None
    year: int
    round_number: int | None = None  # Can be null for testing events
    date_start: date
    date_end: date | None = None
    wikipedia_url: str | None = None
    
    # Circuit info (either reference or inline data)
    circuit: SourceCircuit | None = None
    circuit_source_id: str | None = None  # If circuit is provided separately
    
    # Source-specific identifiers
    source_id: str | None = None  # e.g., raceId for Ergast, meeting_key for OpenF1


class SourceSessionType(IntEnum):
    """Session type enumeration for source data."""
    PRACTICE_1 = 0
    PRACTICE_2 = 1
    PRACTICE_3 = 2
    QUALIFYING = 3
    SPRINT_QUALIFYING = 4
    SPRINT = 5
    RACE = 6
    WARMUP = 7


class SourceSessionStatus(IntEnum):
    """Session status for source data."""
    SCHEDULED = 0
    IN_PROGRESS = 1
    COMPLETED = 2
    CANCELLED = 3


@dataclass
class SourceSession:
    """Session data from an external source."""
    session_type: SourceSessionType
    start_time: datetime
    end_time: datetime | None = None
    status: SourceSessionStatus = SourceSessionStatus.SCHEDULED
    
    # Source-specific identifiers
    source_id: str | None = None  # e.g., session_key for OpenF1


class SourceResultStatus(IntEnum):
    """Result status for source data."""
    FINISHED = 0
    DNF = 1
    DNS = 2
    DSQ = 3
    NC = 4  # Not Classified


@dataclass
class SourceResult:
    """Result data from an external source.
    
    Can represent race results, qualifying results, or sprint results.
    """
    position: int | None = None  # Can be null for DNS
    grid_position: int | None = None
    status: SourceResultStatus = SourceResultStatus.FINISHED
    status_detail: str | None = None  # e.g., "Engine", "Collision", "+1 Lap"
    points: float | None = None
    laps: int | None = None
    time_milliseconds: int | None = None
    fastest_lap: bool = False
    fastest_lap_number: int | None = None
    fastest_lap_rank: int | None = None
    fastest_lap_time: str | None = None
    fastest_lap_speed: str | None = None
    
    # Qualifying-specific
    q1_time: str | None = None
    q2_time: str | None = None
    q3_time: str | None = None
    
    # Driver/Team identification (one of these sets should be provided)
    driver_number: int | None = None  # For OpenF1
    driver_source_id: str | None = None  # For Ergast (driverRef)
    team_source_id: str | None = None  # For Ergast (constructorRef)


@dataclass
class SourceEntrant:
    """Entrant (driver-team pairing for a round) from an external source."""
    driver: SourceDriver | None = None
    team: SourceTeam | None = None
    driver_source_id: str | None = None
    team_source_id: str | None = None
    car_number: int | None = None


@dataclass
class SourceMeetingData:
    """Complete meeting data including sessions, entrants, and results.
    
    This is the main data structure returned by data sources for a single
    race weekend. It contains all the information needed to sync that weekend.
    """
    meeting: SourceMeeting
    sessions: list[SourceSession] = field(default_factory=list)
    entrants: list[SourceEntrant] = field(default_factory=list)
    results_by_session: dict[str, list[SourceResult]] = field(default_factory=dict)
    # Key is session source_id -> list of results


# =============================================================================
# Data Source Protocol
# =============================================================================


class BaseDataSource(ABC):
    """Abstract base class for racing data sources.
    
    Each data source (OpenF1, Ergast, etc.) must implement this interface
    to provide racing data in a standardized format.
    
    The data source is responsible for:
    1. Connecting to the external data (API, database, files)
    2. Fetching data based on query parameters
    3. Transforming external formats to SourceXxx models
    4. Handling errors and rate limiting
    
    The sync service handles:
    1. Entity resolution (matching to existing DB records)
    2. Alias creation
    3. Database upserts
    4. Caching
    """
    
    # Source name for logging and error messages
    source_name: str = "unknown"
    
    # Series this source provides data for (e.g., "formula-1", "motogp")
    default_series_slug: str = "formula-1"
    default_series_name: str = "Formula 1"
    
    @abstractmethod
    def get_available_years(self) -> list[int]:
        """Get list of years for which data is available.
        
        Returns:
            List of years (e.g., [1950, 1951, ..., 2024])
        """
        pass
    
    @abstractmethod
    def get_meetings(self, year: int) -> list[SourceMeeting]:
        """Get all meetings (race weekends) for a given year.
        
        Args:
            year: The season year
            
        Returns:
            List of meetings sorted by date
            
        Raises:
            DataSourceError: If the data cannot be fetched
        """
        pass
    
    @abstractmethod
    def get_circuit(self, source_id: str) -> SourceCircuit | None:
        """Get circuit details by source-specific ID.
        
        Args:
            source_id: The source-specific circuit identifier
            
        Returns:
            Circuit data or None if not found
        """
        pass
    
    @abstractmethod
    def get_sessions(self, meeting_source_id: str) -> list[SourceSession]:
        """Get all sessions for a meeting.
        
        Args:
            meeting_source_id: The source-specific meeting identifier
            
        Returns:
            List of sessions for the meeting
        """
        pass
    
    @abstractmethod
    def get_entrants(self, meeting_source_id: str) -> list[SourceEntrant]:
        """Get all entrants (driver-team pairings) for a meeting.
        
        Args:
            meeting_source_id: The source-specific meeting identifier
            
        Returns:
            List of entrants for the meeting
        """
        pass
    
    @abstractmethod
    def get_results(
        self,
        session_source_id: str,
        session_type: SourceSessionType,
    ) -> list[SourceResult]:
        """Get results for a session.
        
        Args:
            session_source_id: The source-specific session identifier
            session_type: The type of session (for sources that key results by type)
            
        Returns:
            List of results for the session
        """
        pass
    
    def get_meeting_data(self, meeting_source_id: str, include_results: bool = True) -> SourceMeetingData | None:
        """Get complete data for a meeting including sessions, entrants, and results.
        
        This is a convenience method that fetches all related data for a meeting.
        Data sources may override this for more efficient fetching.
        
        Args:
            meeting_source_id: The source-specific meeting identifier
            include_results: Whether to fetch result data
            
        Returns:
            Complete meeting data or None if meeting not found
        """
        # Get meeting details
        sessions = self.get_sessions(meeting_source_id)
        if not sessions:
            return None
        
        entrants = self.get_entrants(meeting_source_id)
        
        results_by_session: dict[str, list[SourceResult]] = {}
        if include_results:
            for session in sessions:
                if session.source_id and session.status == SourceSessionStatus.COMPLETED:
                    results = self.get_results(session.source_id, session.session_type)
                    if results:
                        results_by_session[session.source_id] = results
        
        # Note: Meeting info would need to be passed in or fetched separately
        # This method is mostly meant to be overridden by subclasses
        raise NotImplementedError("Subclasses should override get_meeting_data")
    
    def get_all_circuits(self) -> list[SourceCircuit]:
        """Get all circuits from this source.
        
        Useful for bulk import of reference data.
        
        Returns:
            List of all circuits
        """
        raise NotImplementedError("Subclass must implement get_all_circuits")
    
    def get_all_drivers(self) -> list[SourceDriver]:
        """Get all drivers from this source.
        
        Useful for bulk import of reference data.
        
        Returns:
            List of all drivers
        """
        raise NotImplementedError("Subclass must implement get_all_drivers")
    
    def get_all_teams(self) -> list[SourceTeam]:
        """Get all teams from this source.
        
        Useful for bulk import of reference data.
        
        Returns:
            List of all teams
        """
        raise NotImplementedError("Subclass must implement get_all_teams")
    
    # Context manager support
    def __enter__(self) -> "BaseDataSource":
        return self
    
    def __exit__(self, *args: Any) -> None:
        self.close()
    
    def close(self) -> None:
        """Close any open connections."""
        pass
