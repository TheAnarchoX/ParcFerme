"""Tests for the OpenF1 API client."""

from datetime import datetime
from unittest.mock import MagicMock, patch

from ingestion.clients.openf1 import (
    OpenF1Client,
    OpenF1Driver,
    OpenF1Meeting,
    OpenF1Session,
)

# Sample API responses for mocking
MOCK_MEETINGS_RESPONSE = [
    {
        "meeting_key": 1229,
        "meeting_name": "Bahrain Grand Prix",
        "meeting_official_name": "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2024",
        "country_name": "Bahrain",
        "circuit_short_name": "Bahrain",
        "date_start": "2024-02-29T10:30:00+00:00",
        "year": 2024,
        "circuit_key": 63,
        "location": "Sakhir",
    },
    {
        "meeting_key": 1230,
        "meeting_name": "Saudi Arabian Grand Prix",
        "meeting_official_name": "FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2024",
        "country_name": "Saudi Arabia",
        "circuit_short_name": "Jeddah",
        "date_start": "2024-03-07T13:30:00+00:00",
        "year": 2024,
        "circuit_key": 64,
        "location": "Jeddah",
    },
]

MOCK_SESSIONS_RESPONSE = [
    {
        "session_key": 9472,
        "meeting_key": 1229,
        "session_name": "Race",
        "session_type": "Race",
        "date_start": "2024-03-02T15:00:00+00:00",
        "date_end": "2024-03-02T17:00:00+00:00",
        "country_name": "Bahrain",
        "circuit_short_name": "Bahrain",
        "year": 2024,
    },
    {
        "session_key": 9471,
        "meeting_key": 1229,
        "session_name": "Qualifying",
        "session_type": "Qualifying",
        "date_start": "2024-03-01T15:00:00+00:00",
        "date_end": "2024-03-01T16:00:00+00:00",
        "country_name": "Bahrain",
        "circuit_short_name": "Bahrain",
        "year": 2024,
    },
]

MOCK_DRIVERS_RESPONSE = [
    {
        "driver_number": 1,
        "session_key": 9472,
        "meeting_key": 1229,
        "broadcast_name": "M VERSTAPPEN",
        "full_name": "Max VERSTAPPEN",
        "first_name": "Max",
        "last_name": "VERSTAPPEN",
        "name_acronym": "VER",
        "team_name": "Red Bull Racing",
        "team_colour": "3671C6",
        "headshot_url": "https://www.formula1.com/content/dam/fom-website/drivers/M/MAXVER01.png",
        "country_code": "NED",
    },
    {
        "driver_number": 44,
        "session_key": 9472,
        "meeting_key": 1229,
        "broadcast_name": "L HAMILTON",
        "full_name": "Lewis HAMILTON",
        "first_name": "Lewis",
        "last_name": "HAMILTON",
        "name_acronym": "HAM",
        "team_name": "Mercedes",
        "team_colour": "27F4D2",
        "headshot_url": "https://www.formula1.com/content/dam/fom-website/drivers/L/LEWHAM01.png",
        "country_code": "GBR",
    },
]

MOCK_POSITIONS_RESPONSE = [
    {
        "session_key": 9472,
        "meeting_key": 1229,
        "driver_number": 1,
        "position": 2,
        "date": "2024-03-02T16:30:00+00:00",
    },
    {
        "session_key": 9472,
        "meeting_key": 1229,
        "driver_number": 44,
        "position": 3,
        "date": "2024-03-02T16:30:00+00:00",
    },
    {
        "session_key": 9472,
        "meeting_key": 1229,
        "driver_number": 1,
        "position": 1,
        "date": "2024-03-02T17:00:00+00:00",
    },
    {
        "session_key": 9472,
        "meeting_key": 1229,
        "driver_number": 44,
        "position": 7,
        "date": "2024-03-02T17:00:00+00:00",
    },
]


class TestOpenF1Client:
    """Tests for OpenF1Client."""

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_meetings(self, mock_client_class: MagicMock) -> None:
        """Test fetching meetings for a year."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_MEETINGS_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            meetings = client.get_meetings(2024)

        assert len(meetings) == 2
        assert meetings[0].meeting_key == 1229
        assert meetings[0].meeting_name == "Bahrain Grand Prix"
        assert meetings[0].country_name == "Bahrain"
        assert meetings[1].meeting_name == "Saudi Arabian Grand Prix"

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_sessions(self, mock_client_class: MagicMock) -> None:
        """Test fetching sessions for a year."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_SESSIONS_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            sessions = client.get_sessions(2024)

        assert len(sessions) == 2
        assert sessions[0].session_key == 9472
        assert sessions[0].session_type == "Race"
        assert sessions[1].session_type == "Qualifying"

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_sessions_filtered_by_type(self, mock_client_class: MagicMock) -> None:
        """Test fetching sessions filtered by type."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = [MOCK_SESSIONS_RESPONSE[0]]  # Only race
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            sessions = client.get_sessions(2024, session_type="Race")

        mock_client.get.assert_called_with(
            "/sessions", params={"year": 2024, "session_type": "Race"}
        )
        assert len(sessions) == 1
        assert sessions[0].session_type == "Race"

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_drivers(self, mock_client_class: MagicMock) -> None:
        """Test fetching drivers for a session."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_DRIVERS_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            drivers = client.get_drivers(9472)

        assert len(drivers) == 2
        assert drivers[0].driver_number == 1
        assert drivers[0].full_name == "Max VERSTAPPEN"
        assert drivers[0].team_name == "Red Bull Racing"
        assert drivers[1].driver_number == 44
        assert drivers[1].name_acronym == "HAM"

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_final_positions(self, mock_client_class: MagicMock) -> None:
        """Test getting final positions from position data."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_POSITIONS_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            final_positions = client.get_final_positions(9472)

        # Should return the last (most recent) position per driver
        assert final_positions[1] == 1  # Verstappen P1
        assert final_positions[44] == 7  # Hamilton P7

    @patch("ingestion.clients.openf1.httpx.Client")
    def test_get_drivers_for_meeting_deduplication(self, mock_client_class: MagicMock) -> None:
        """Test that drivers are deduplicated by driver number."""
        # Simulate same driver appearing multiple times (from different sessions)
        mock_client = MagicMock()
        mock_response = MagicMock()
        duplicate_drivers = MOCK_DRIVERS_RESPONSE + [MOCK_DRIVERS_RESPONSE[0]]
        mock_response.json.return_value = duplicate_drivers
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client

        with OpenF1Client() as client:
            drivers = client.get_drivers_for_meeting(1229)

        # Should deduplicate - only 2 unique drivers
        assert len(drivers) == 2


class TestOpenF1Models:
    """Tests for OpenF1 Pydantic models."""

    def test_meeting_model(self) -> None:
        """Test OpenF1Meeting model parsing."""
        meeting = OpenF1Meeting(**MOCK_MEETINGS_RESPONSE[0])
        assert meeting.meeting_key == 1229
        assert meeting.meeting_name == "Bahrain Grand Prix"
        assert meeting.year == 2024
        assert isinstance(meeting.date_start, datetime)

    def test_session_model(self) -> None:
        """Test OpenF1Session model parsing."""
        session = OpenF1Session(**MOCK_SESSIONS_RESPONSE[0])
        assert session.session_key == 9472
        assert session.session_type == "Race"
        assert session.meeting_key == 1229
        assert isinstance(session.date_start, datetime)

    def test_driver_model(self) -> None:
        """Test OpenF1Driver model parsing."""
        driver = OpenF1Driver(**MOCK_DRIVERS_RESPONSE[0])
        assert driver.driver_number == 1
        assert driver.full_name == "Max VERSTAPPEN"
        assert driver.name_acronym == "VER"
        assert driver.team_name == "Red Bull Racing"

    def test_driver_model_optional_fields(self) -> None:
        """Test OpenF1Driver handles optional fields."""
        minimal_driver = {
            "driver_number": 99,
            "session_key": 1234,
            "meeting_key": 1229,
            "broadcast_name": "TEST DRIVER",
            "full_name": "Test DRIVER",
            "name_acronym": "TST",
            "team_name": "Test Team",
        }
        driver = OpenF1Driver(**minimal_driver)
        assert driver.driver_number == 99
        assert driver.first_name is None
        assert driver.last_name is None
        assert driver.headshot_url is None
