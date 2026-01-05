"""OpenF1 API client for fetching F1 data."""

from datetime import datetime
from typing import Any

import httpx # type: ignore
from pydantic import BaseModel # type: ignore
from tenacity import retry, stop_after_attempt, wait_exponential # type: ignore

from ingestion.config import settings


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


class OpenF1Meeting(BaseModel):
    """Meeting (race weekend) data from OpenF1 API."""

    meeting_key: int
    meeting_name: str
    meeting_official_name: str
    country_name: str
    circuit_short_name: str
    date_start: datetime
    year: int


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
        response = self._client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()  # type: ignore[no-any-return]

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

    def get_race_sessions(self, year: int) -> list[OpenF1Session]:
        """Convenience method to get only Race sessions."""
        return self.get_sessions(year, session_type="Race")


# Example usage
if __name__ == "__main__":
    with OpenF1Client() as client:
        meetings = client.get_meetings(2024)
        print(f"Found {len(meetings)} meetings in 2024")
        for meeting in meetings[:3]:
            print(f"  - {meeting.meeting_name} ({meeting.circuit_short_name})")
