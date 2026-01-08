"""
OpenF1 Data Source Adapter.

Adapts the OpenF1 API client to the BaseDataSource interface,
transforming OpenF1-specific data models to our generic SourceXxx models.
"""

from datetime import UTC, datetime, timezone

import structlog  # type: ignore

from ingestion.clients.openf1 import (
    OpenF1ApiError,
    OpenF1Client,
    OpenF1Driver,
    OpenF1Meeting,
    OpenF1Session as OpenF1SessionResponse,
    OpenF1SessionResult,
)
from ingestion.sources.base import (
    BaseDataSource,
    DataSourceError,
    DataSourceRateLimited,
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


# Mapping from OpenF1 session names to our SourceSessionType
OPENF1_SESSION_TYPE_MAP: dict[str, SourceSessionType] = {
    "Practice 1": SourceSessionType.PRACTICE_1,
    "Practice 2": SourceSessionType.PRACTICE_2,
    "Practice 3": SourceSessionType.PRACTICE_3,
    "Qualifying": SourceSessionType.QUALIFYING,
    "Sprint Qualifying": SourceSessionType.SPRINT_QUALIFYING,
    "Sprint Shootout": SourceSessionType.SPRINT_QUALIFYING,
    "Sprint": SourceSessionType.SPRINT,
    "Race": SourceSessionType.RACE,
}


class OpenF1DataSource(BaseDataSource):
    """OpenF1 API data source adapter.
    
    Wraps the OpenF1Client and transforms its data to generic SourceXxx models.
    """
    
    source_name = "OpenF1"
    default_series_slug = "formula-1"
    default_series_name = "Formula 1"
    
    # OpenF1 has reliable data from 2023 onwards
    RELIABLE_START_YEAR = 2023
    
    def __init__(self, client: OpenF1Client | None = None) -> None:
        self._client = client
        self._owns_client = False
    
    def _ensure_client(self) -> OpenF1Client:
        """Ensure the API client is available."""
        if self._client is None:
            self._client = OpenF1Client()
            self._owns_client = True
        return self._client
    
    def close(self) -> None:
        """Close the API client if we own it."""
        if self._owns_client and self._client:
            self._client.close()
            self._client = None
    
    def get_available_years(self) -> list[int]:
        """Get years for which OpenF1 has data.
        
        OpenF1 typically has data from 2023 onwards (reliable).
        Some 2022 data exists but may be incomplete.
        """
        current_year = datetime.now(UTC).year
        return list(range(self.RELIABLE_START_YEAR, current_year + 1))
    
    def get_meetings(self, year: int) -> list[SourceMeeting]:
        """Get all meetings for a year from OpenF1."""
        client = self._ensure_client()
        
        try:
            openf1_meetings = client.get_meetings(year)
        except OpenF1ApiError as e:
            if e.status_code == 429:
                raise DataSourceRateLimited(e.message, self.source_name) from e
            if e.status_code and e.status_code >= 500:
                raise DataSourceUnavailable(e.message, self.source_name) from e
            raise DataSourceError(e.message, self.source_name) from e
        
        return [self._convert_meeting(m) for m in openf1_meetings]
    
    def _convert_meeting(self, meeting: OpenF1Meeting) -> SourceMeeting:
        """Convert OpenF1Meeting to SourceMeeting."""
        circuit = SourceCircuit(
            name=meeting.circuit_short_name,
            short_name=meeting.circuit_short_name,
            country=meeting.country_name,
            location=meeting.location,
            source_id=str(meeting.circuit_key) if meeting.circuit_key else None,
        )
        
        return SourceMeeting(
            name=meeting.meeting_name,
            official_name=meeting.meeting_official_name,
            year=meeting.year,
            round_number=None,  # OpenF1 doesn't provide round numbers
            date_start=meeting.date_start.date(),
            date_end=None,  # Will be calculated from sessions
            circuit=circuit,
            source_id=str(meeting.meeting_key),
        )
    
    def get_circuit(self, source_id: str) -> SourceCircuit | None:
        """Get circuit by circuit_key.
        
        OpenF1 doesn't have a dedicated circuits endpoint, so we fetch
        meeting data to extract circuit info.
        """
        # This would require fetching a meeting - not directly supported
        # For OpenF1, circuit info is embedded in meeting/session responses
        return None
    
    def get_sessions(self, meeting_source_id: str) -> list[SourceSession]:
        """Get all sessions for a meeting."""
        client = self._ensure_client()
        meeting_key = int(meeting_source_id)
        
        try:
            openf1_sessions = client.get_sessions_for_meeting(meeting_key)
        except OpenF1ApiError as e:
            raise DataSourceError(e.message, self.source_name) from e
        
        return [self._convert_session(s) for s in openf1_sessions]
    
    def _convert_session(self, session: OpenF1SessionResponse) -> SourceSession:
        """Convert OpenF1Session to SourceSession."""
        session_type = OPENF1_SESSION_TYPE_MAP.get(
            session.session_name, SourceSessionType.RACE
        )
        
        # Determine status based on dates
        now = datetime.now(UTC)
        date_start = session.date_start
        if date_start.tzinfo is None:
            date_start = date_start.replace(tzinfo=UTC)
        
        if session.date_end:
            date_end = session.date_end
            if date_end.tzinfo is None:
                date_end = date_end.replace(tzinfo=UTC)
            if date_end < now:
                status = SourceSessionStatus.COMPLETED
            elif date_start <= now:
                status = SourceSessionStatus.IN_PROGRESS
            else:
                status = SourceSessionStatus.SCHEDULED
        else:
            status = SourceSessionStatus.COMPLETED if date_start < now else SourceSessionStatus.SCHEDULED
        
        return SourceSession(
            session_type=session_type,
            start_time=date_start,
            end_time=session.date_end,
            status=status,
            source_id=str(session.session_key),
        )
    
    def get_entrants(self, meeting_source_id: str) -> list[SourceEntrant]:
        """Get all entrants for a meeting."""
        client = self._ensure_client()
        meeting_key = int(meeting_source_id)
        
        try:
            openf1_drivers = client.get_drivers_for_meeting(meeting_key)
        except OpenF1ApiError as e:
            raise DataSourceError(e.message, self.source_name) from e
        
        entrants = []
        for driver in openf1_drivers:
            if not driver.team_name:
                # Skip drivers without teams (reserve/test drivers)
                continue
            
            source_driver = self._convert_driver(driver)
            source_team = self._convert_team(driver)
            
            entrants.append(SourceEntrant(
                driver=source_driver,
                team=source_team,
                car_number=driver.driver_number,
            ))
        
        return entrants
    
    def _convert_driver(self, driver: OpenF1Driver) -> SourceDriver:
        """Convert OpenF1Driver to SourceDriver."""
        return SourceDriver(
            first_name=driver.first_name or "",
            last_name=driver.last_name or "",
            abbreviation=driver.name_acronym,
            country_code=driver.country_code,
            driver_number=driver.driver_number,
            headshot_url=driver.headshot_url,
            source_id=str(driver.driver_number),  # OpenF1 uses driver_number as ID
        )
    
    def _convert_team(self, driver: OpenF1Driver) -> SourceTeam:
        """Convert team info from OpenF1Driver to SourceTeam."""
        return SourceTeam(
            name=driver.team_name or "",
            primary_color=f"#{driver.team_colour}" if driver.team_colour else None,
            source_id=None,  # OpenF1 doesn't have team IDs
        )
    
    def get_results(
        self,
        session_source_id: str,
        session_type: SourceSessionType,
    ) -> list[SourceResult]:
        """Get results for a session."""
        client = self._ensure_client()
        session_key = int(session_source_id)
        
        # Try session_result endpoint first (has more data)
        try:
            session_results = client.get_session_results(session_key)
            if session_results:
                return [self._convert_session_result(r) for r in session_results]
        except OpenF1ApiError:
            pass
        
        # Fall back to positions endpoint
        try:
            positions = client.get_final_positions(session_key)
            fastest_lap_driver = client.get_fastest_lap_driver(session_key)
            
            results = []
            for driver_number, position in positions.items():
                results.append(SourceResult(
                    position=position,
                    status=SourceResultStatus.FINISHED,
                    driver_number=driver_number,
                    fastest_lap=(driver_number == fastest_lap_driver),
                ))
            return results
        except OpenF1ApiError as e:
            logger.warning("Failed to get results", session_key=session_key, error=e.message)
            return []
    
    def _convert_session_result(self, result: OpenF1SessionResult) -> SourceResult:
        """Convert OpenF1SessionResult to SourceResult."""
        # Determine status
        if result.dsq:
            status = SourceResultStatus.DSQ
        elif result.dns:
            status = SourceResultStatus.DNS
        elif result.dnf:
            status = SourceResultStatus.DNF
        else:
            status = SourceResultStatus.FINISHED
        
        # Handle duration (can be single value or array for qualifying)
        time_ms = None
        if result.duration is not None:
            if isinstance(result.duration, list):
                # For qualifying, take the best time (last non-None Q time)
                for t in reversed(result.duration):
                    if t is not None:
                        time_ms = int(t * 1000)
                        break
            else:
                time_ms = int(result.duration * 1000)
        
        return SourceResult(
            position=result.position,
            status=status,
            laps=result.number_of_laps,
            time_milliseconds=time_ms,
            driver_number=result.driver_number,
        )
    
    def get_all_circuits(self) -> list[SourceCircuit]:
        """OpenF1 doesn't have a bulk circuits endpoint."""
        raise NotImplementedError("OpenF1 doesn't support bulk circuit fetch")
    
    def get_all_drivers(self) -> list[SourceDriver]:
        """OpenF1 doesn't have a bulk drivers endpoint."""
        raise NotImplementedError("OpenF1 doesn't support bulk driver fetch")
    
    def get_all_teams(self) -> list[SourceTeam]:
        """OpenF1 doesn't have a bulk teams endpoint."""
        raise NotImplementedError("OpenF1 doesn't support bulk team fetch")
