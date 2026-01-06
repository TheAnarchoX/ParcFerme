"""OpenF1 API client for fetching F1 data."""

from datetime import datetime
from typing import Any

import httpx  # type: ignore
import structlog  # type: ignore
from pydantic import BaseModel  # type: ignore
from tenacity import retry, stop_after_attempt, wait_exponential  # type: ignore

from ingestion.config import settings

logger = structlog.get_logger()


class OpenF1ApiError(Exception):
    """Raised when the OpenF1 API returns an error or is unavailable."""

    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class OpenF1Session(BaseModel):
    """Session data from OpenF1 API."""

    session_key: int
    meeting_key: int
    session_name: str
    session_type: str
    date_start: datetime
    date_end: datetime | None = None
    country_name: str
    circuit_short_name: str
    year: int
    circuit_key: int | None = None
    location: str | None = None


class OpenF1Meeting(BaseModel):
    """Meeting (race weekend) data from OpenF1 API."""

    meeting_key: int
    meeting_name: str
    meeting_official_name: str
    country_name: str
    circuit_short_name: str
    date_start: datetime
    year: int
    circuit_key: int | None = None
    location: str | None = None


class OpenF1Driver(BaseModel):
    """Driver data from OpenF1 API."""

    driver_number: int
    session_key: int
    meeting_key: int
    broadcast_name: str
    full_name: str
    first_name: str | None = None
    last_name: str | None = None
    name_acronym: str
    team_name: str
    team_colour: str | None = None
    headshot_url: str | None = None
    country_code: str | None = None


class OpenF1Position(BaseModel):
    """Position data from OpenF1 API (race results)."""

    session_key: int
    meeting_key: int
    driver_number: int
    position: int
    date: datetime


class OpenF1Lap(BaseModel):
    """Lap data from OpenF1 API."""

    session_key: int
    meeting_key: int
    driver_number: int
    lap_number: int
    lap_duration: float | None = None
    is_pit_out_lap: bool = False
    duration_sector_1: float | None = None
    duration_sector_2: float | None = None
    duration_sector_3: float | None = None


class OpenF1Stint(BaseModel):
    """Stint data (tyre compound info) from OpenF1 API."""

    session_key: int
    meeting_key: int
    driver_number: int
    stint_number: int
    lap_start: int
    lap_end: int | None = None
    compound: str | None = None
    tyre_age_at_start: int | None = None


class OpenF1Client:
    """Client for the OpenF1 API.

    Docs: https://openf1.org/

    ⚠️ IMPORTANT: Results data contains spoilers.
    Never expose raw results without spoiler protection.
    """

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or settings.openf1_base_url
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=30.0,
            headers={"User-Agent": "ParcFerme-Ingestion/0.1.0"},
        )

    def close(self) -> None:
        """Close the HTTP client connection.

        This method closes the underlying HTTP client and releases any associated resources.
        It should be called when the OpenF1 client is no longer needed to ensure proper
        cleanup of network connections.

        Returns:
            None
        """
        self._client.close()

    def __enter__(self) -> "OpenF1Client":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Make a GET request with retry logic."""
        try:
            response = self._client.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()  # type: ignore[no-any-return]
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 502:
                logger.error("OpenF1 API is down (502 Bad Gateway)", endpoint=endpoint)
                raise OpenF1ApiError(
                    "OpenF1 API is currently unavailable (502 Bad Gateway). "
                    "The service may be experiencing issues. Please try again later.",
                    status_code=502,
                ) from e
            elif status == 429:
                logger.warning("OpenF1 API rate limited (429)", endpoint=endpoint)
                raise OpenF1ApiError(
                    "OpenF1 API rate limit exceeded. Please wait before retrying.",
                    status_code=429,
                ) from e
            elif status >= 500:
                logger.error("OpenF1 API server error", status=status, endpoint=endpoint)
                raise OpenF1ApiError(
                    f"OpenF1 API server error ({status}). The service may be unavailable.",
                    status_code=status,
                ) from e
            else:
                logger.error("OpenF1 API error", status=status, endpoint=endpoint)
                raise OpenF1ApiError(
                    f"OpenF1 API request failed with status {status}",
                    status_code=status,
                ) from e
        except httpx.ConnectError as e:
            logger.error("Cannot connect to OpenF1 API", endpoint=endpoint, error=str(e))
            raise OpenF1ApiError(
                "Cannot connect to OpenF1 API. Check your internet connection.",
            ) from e
        except httpx.TimeoutException as e:
            logger.error("OpenF1 API request timed out", endpoint=endpoint)
            raise OpenF1ApiError(
                "OpenF1 API request timed out. The service may be slow or unavailable.",
            ) from e

    def health_check(self) -> dict[str, Any]:
        """Check if the OpenF1 API is available and responsive.

        Returns:
            Dict with status info including:
            - healthy: bool
            - status_code: int | None
            - response_time_ms: float | None
            - error: str | None
        """
        import time

        start = time.monotonic()
        try:
            # Try a minimal request - latest session
            response = self._client.get("/sessions", params={"session_key": "latest"})
            elapsed = (time.monotonic() - start) * 1000
            response.raise_for_status()
            return {
                "healthy": True,
                "status_code": response.status_code,
                "response_time_ms": round(elapsed, 2),
                "error": None,
            }
        except httpx.HTTPStatusError as e:
            elapsed = (time.monotonic() - start) * 1000
            return {
                "healthy": False,
                "status_code": e.response.status_code,
                "response_time_ms": round(elapsed, 2),
                "error": f"HTTP {e.response.status_code}: {e.response.reason_phrase}",
            }
        except httpx.ConnectError as e:
            return {
                "healthy": False,
                "status_code": None,
                "response_time_ms": None,
                "error": f"Connection failed: {e}",
            }
        except httpx.TimeoutException:
            return {
                "healthy": False,
                "status_code": None,
                "response_time_ms": None,
                "error": "Request timed out",
            }

    def get_sessions(self, year: int, session_type: str | None = None) -> list[OpenF1Session]:
        """Get all sessions for a year, optionally filtered by type.

        Args:
            year: Season year (e.g., 2024)
            session_type: Optional filter (Race, Qualifying, etc.)
        """
        params: dict[str, Any] = {"year": year}
        if session_type:
            params["session_type"] = session_type

        data = self._get("/sessions", params)
        return [OpenF1Session(**item) for item in data]

    def get_meetings(self, year: int) -> list[OpenF1Meeting]:
        """Get all meetings (race weekends) for a year.

        Use meeting_key to correlate sessions to a single weekend.
        """
        data = self._get("/meetings", params={"year": year})
        return [OpenF1Meeting(**item) for item in data]

    def get_meeting(self, meeting_key: int) -> OpenF1Meeting | None:
        """Get a specific meeting by its key."""
        data = self._get("/meetings", params={"meeting_key": meeting_key})
        if data:
            return OpenF1Meeting(**data[0])
        return None

    def get_race_sessions(self, year: int) -> list[OpenF1Session]:
        """Convenience method to get only Race sessions."""
        return self.get_sessions(year, session_type="Race")

    def get_session(self, session_key: int) -> OpenF1Session | None:
        """Get a specific session by its key."""
        data = self._get("/sessions", params={"session_key": session_key})
        if data:
            return OpenF1Session(**data[0])
        return None

    def get_sessions_for_meeting(self, meeting_key: int) -> list[OpenF1Session]:
        """Get all sessions for a specific meeting."""
        data = self._get("/sessions", params={"meeting_key": meeting_key})
        return [OpenF1Session(**item) for item in data]

    def get_drivers(self, session_key: int) -> list[OpenF1Driver]:
        """Get all drivers participating in a session.

        This returns driver info including team assignment for that session.
        Use this to build the Entrant records linking drivers to teams.
        """
        data = self._get("/drivers", params={"session_key": session_key})
        return [OpenF1Driver(**item) for item in data]

    def get_drivers_for_meeting(self, meeting_key: int) -> list[OpenF1Driver]:
        """Get all unique drivers for a meeting (race weekend).

        Fetches driver data from the first available session.
        """
        data = self._get("/drivers", params={"meeting_key": meeting_key})
        # Deduplicate by driver_number (same driver may appear multiple times)
        seen: set[int] = set()
        unique_drivers: list[OpenF1Driver] = []
        for item in data:
            driver = OpenF1Driver(**item)
            if driver.driver_number not in seen:
                seen.add(driver.driver_number)
                unique_drivers.append(driver)
        return unique_drivers

    def get_positions(self, session_key: int) -> list[OpenF1Position]:
        """Get position data for a session.

        ⚠️ SPOILER DATA - Contains race results.
        Returns chronological position updates. The final positions
        can be determined by taking the last entry per driver.
        """
        data = self._get("/position", params={"session_key": session_key})
        return [OpenF1Position(**item) for item in data]

    def get_final_positions(self, session_key: int) -> dict[int, int]:
        """Get the final position for each driver in a session.

        ⚠️ SPOILER DATA - Contains race results.

        Returns:
            Dict mapping driver_number -> final_position
        """
        positions = self.get_positions(session_key)
        # Group by driver, take the last (most recent) position
        final: dict[int, int] = {}
        for pos in positions:
            final[pos.driver_number] = pos.position
        return final

    def get_laps(self, session_key: int, driver_number: int | None = None) -> list[OpenF1Lap]:
        """Get lap data for a session, optionally filtered by driver."""
        params: dict[str, Any] = {"session_key": session_key}
        if driver_number is not None:
            params["driver_number"] = driver_number
        data = self._get("/laps", params=params)
        return [OpenF1Lap(**item) for item in data]

    def get_fastest_lap_driver(self, session_key: int) -> int | None:
        """Get the driver number who set the fastest lap in a session.

        Returns:
            The driver_number of the fastest lap holder, or None if no data.
        """
        laps = self.get_laps(session_key)
        if not laps:
            return None

        fastest: OpenF1Lap | None = None
        for lap in laps:
            if lap.lap_duration is not None and (
                fastest is None or lap.lap_duration < (fastest.lap_duration or float("inf"))
            ):
                fastest = lap
        return fastest.driver_number if fastest else None

    def get_stints(self, session_key: int, driver_number: int | None = None) -> list[OpenF1Stint]:
        """Get stint (tyre compound) data for a session."""
        params: dict[str, Any] = {"session_key": session_key}
        if driver_number is not None:
            params["driver_number"] = driver_number
        data = self._get("/stints", params=params)
        return [OpenF1Stint(**item) for item in data]


# Example usage
if __name__ == "__main__":
    with OpenF1Client() as client:
        meetings = client.get_meetings(2024)
        print(f"Found {len(meetings)} meetings in 2024")
        for meeting in meetings[:3]:
            print(f"  - {meeting.meeting_name} ({meeting.circuit_short_name})")
