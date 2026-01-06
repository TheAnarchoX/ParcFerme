"""Tests for the sync service."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from ingestion.clients.openf1 import (
    OpenF1Client,
    OpenF1Driver,
    OpenF1Meeting,
    OpenF1Session,
)
from ingestion.models import (
    Series,
    SessionStatus,
    SessionType,
    slugify,
)
from ingestion.repository import RacingRepository
from ingestion.sync import OpenF1SyncService


# Test fixtures
@pytest.fixture
def mock_meeting() -> OpenF1Meeting:
    """Create a mock OpenF1 meeting."""
    return OpenF1Meeting(
        meeting_key=1229,
        meeting_name="Bahrain Grand Prix",
        meeting_official_name="FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2024",
        country_name="Bahrain",
        circuit_short_name="Bahrain International Circuit",
        date_start=datetime(2024, 2, 29, 10, 30, tzinfo=UTC),
        year=2024,
        location="Sakhir",
    )


@pytest.fixture
def mock_sessions() -> list[OpenF1Session]:
    """Create mock OpenF1 sessions."""
    return [
        OpenF1Session(
            session_key=9470,
            meeting_key=1229,
            session_name="Practice 1",
            session_type="Practice 1",
            date_start=datetime(2024, 2, 29, 10, 30, tzinfo=UTC),
            date_end=datetime(2024, 2, 29, 11, 30, tzinfo=UTC),
            country_name="Bahrain",
            circuit_short_name="Bahrain",
            year=2024,
        ),
        OpenF1Session(
            session_key=9471,
            meeting_key=1229,
            session_name="Qualifying",
            session_type="Qualifying",
            date_start=datetime(2024, 3, 1, 15, 0, tzinfo=UTC),
            date_end=datetime(2024, 3, 1, 16, 0, tzinfo=UTC),
            country_name="Bahrain",
            circuit_short_name="Bahrain",
            year=2024,
        ),
        OpenF1Session(
            session_key=9472,
            meeting_key=1229,
            session_name="Race",
            session_type="Race",
            date_start=datetime(2024, 3, 2, 15, 0, tzinfo=UTC),
            date_end=datetime(2024, 3, 2, 17, 0, tzinfo=UTC),
            country_name="Bahrain",
            circuit_short_name="Bahrain",
            year=2024,
        ),
    ]


@pytest.fixture
def mock_drivers() -> list[OpenF1Driver]:
    """Create mock OpenF1 drivers."""
    return [
        OpenF1Driver(
            driver_number=1,
            session_key=9472,
            meeting_key=1229,
            broadcast_name="M VERSTAPPEN",
            full_name="Max VERSTAPPEN",
            first_name="Max",
            last_name="VERSTAPPEN",
            name_acronym="VER",
            team_name="Red Bull Racing",
            team_colour="3671C6",
            country_code="NED",
        ),
        OpenF1Driver(
            driver_number=44,
            session_key=9472,
            meeting_key=1229,
            broadcast_name="L HAMILTON",
            full_name="Lewis HAMILTON",
            first_name="Lewis",
            last_name="HAMILTON",
            name_acronym="HAM",
            team_name="Mercedes",
            team_colour="27F4D2",
            country_code="GBR",
        ),
    ]


class TestSlugify:
    """Tests for the slugify utility."""

    def test_basic_slugify(self) -> None:
        """Test basic string slugification."""
        assert slugify("Bahrain Grand Prix") == "bahrain-grand-prix"

    def test_slugify_special_characters(self) -> None:
        """Test slugify removes special characters."""
        assert slugify("Monaco (Monte Carlo)") == "monaco-monte-carlo"

    def test_slugify_multiple_spaces(self) -> None:
        """Test slugify handles multiple spaces."""
        assert slugify("Red  Bull   Racing") == "red-bull-racing"

    def test_slugify_already_slug(self) -> None:
        """Test slugify on already slugified string."""
        assert slugify("already-a-slug") == "already-a-slug"

    def test_slugify_uppercase(self) -> None:
        """Test slugify lowercases input."""
        assert slugify("MAX VERSTAPPEN") == "max-verstappen"


class TestSessionTypeMapping:
    """Tests for session type mapping."""

    def test_map_race_session(self) -> None:
        """Test mapping Race session type."""
        from ingestion.models import OPENF1_SESSION_TYPE_MAP

        assert OPENF1_SESSION_TYPE_MAP["Race"] == SessionType.RACE

    def test_map_qualifying_session(self) -> None:
        """Test mapping Qualifying session type."""
        from ingestion.models import OPENF1_SESSION_TYPE_MAP

        assert OPENF1_SESSION_TYPE_MAP["Qualifying"] == SessionType.QUALIFYING

    def test_map_practice_sessions(self) -> None:
        """Test mapping Practice session types."""
        from ingestion.models import OPENF1_SESSION_TYPE_MAP

        assert OPENF1_SESSION_TYPE_MAP["Practice 1"] == SessionType.FP1
        assert OPENF1_SESSION_TYPE_MAP["Practice 2"] == SessionType.FP2
        assert OPENF1_SESSION_TYPE_MAP["Practice 3"] == SessionType.FP3

    def test_map_sprint_sessions(self) -> None:
        """Test mapping Sprint session types."""
        from ingestion.models import OPENF1_SESSION_TYPE_MAP

        assert OPENF1_SESSION_TYPE_MAP["Sprint"] == SessionType.SPRINT
        assert OPENF1_SESSION_TYPE_MAP["Sprint Qualifying"] == SessionType.SPRINT_QUALIFYING


class TestOpenF1SyncService:
    """Tests for the OpenF1SyncService."""

    def test_determine_session_status_completed(self) -> None:
        """Test session status determination for completed sessions."""
        service = OpenF1SyncService()
        session = OpenF1Session(
            session_key=9472,
            meeting_key=1229,
            session_name="Race",
            session_type="Race",
            date_start=datetime(2020, 1, 1, 15, 0, tzinfo=UTC),  # Past date
            date_end=datetime(2020, 1, 1, 17, 0, tzinfo=UTC),
            country_name="Test",
            circuit_short_name="Test",
            year=2020,
        )
        status = service._determine_session_status(session)
        assert status == SessionStatus.COMPLETED

    def test_determine_session_status_scheduled(self) -> None:
        """Test session status determination for future sessions."""
        service = OpenF1SyncService()
        session = OpenF1Session(
            session_key=9472,
            meeting_key=1229,
            session_name="Race",
            session_type="Race",
            date_start=datetime(2030, 1, 1, 15, 0, tzinfo=UTC),  # Future date
            date_end=None,
            country_name="Test",
            circuit_short_name="Test",
            year=2030,
        )
        status = service._determine_session_status(session)
        assert status == SessionStatus.SCHEDULED

    def test_map_session_type_known(self) -> None:
        """Test mapping known session types."""
        service = OpenF1SyncService()
        assert service._map_session_type("Race") == SessionType.RACE
        assert service._map_session_type("Qualifying") == SessionType.QUALIFYING
        assert service._map_session_type("Practice 1") == SessionType.FP1

    def test_map_session_type_unknown(self) -> None:
        """Test mapping unknown session types defaults to Race."""
        service = OpenF1SyncService()
        assert service._map_session_type("Unknown Session") == SessionType.RACE

    @patch.object(RacingRepository, "get_series_by_slug")
    @patch.object(RacingRepository, "upsert_series")
    def test_ensure_f1_series_creates_new(
        self, mock_upsert: MagicMock, mock_get: MagicMock
    ) -> None:
        """Test that F1 series is created when it doesn't exist."""
        mock_get.return_value = None
        expected_id = uuid4()
        mock_upsert.return_value = expected_id

        service = OpenF1SyncService()
        repo = MagicMock(spec=RacingRepository)
        repo.get_series_by_slug = mock_get
        repo.upsert_series = mock_upsert

        series_id = service._ensure_f1_series(repo)

        assert series_id == expected_id
        mock_upsert.assert_called_once()

    @patch.object(RacingRepository, "get_series_by_slug")
    def test_ensure_f1_series_returns_existing(self, mock_get: MagicMock) -> None:
        """Test that existing F1 series is returned."""
        existing_series = Series(
            id=uuid4(),
            name="Formula 1",
            slug="formula-1",
        )
        mock_get.return_value = existing_series

        service = OpenF1SyncService()
        repo = MagicMock(spec=RacingRepository)
        repo.get_series_by_slug = mock_get

        series_id = service._ensure_f1_series(repo)

        assert series_id == existing_series.id

    def test_get_or_create_driver(self, mock_drivers: list[OpenF1Driver]) -> None:
        """Test driver creation from OpenF1 data."""
        expected_id = uuid4()

        repo = MagicMock(spec=RacingRepository)
        repo.get_driver_by_slug.return_value = None
        repo.upsert_driver.return_value = expected_id
        repo.get_all_drivers.return_value = []
        repo.get_all_driver_aliases.return_value = []
        repo.get_all_teams.return_value = []
        repo.get_all_team_aliases.return_value = []

        service = OpenF1SyncService(repository=repo)
        service._ensure_clients()  # Initialize entity resolver
        driver_id = service._get_or_create_driver(repo, mock_drivers[0])

        assert driver_id == expected_id
        repo.upsert_driver.assert_called_once()

        # Verify the driver was created with correct data
        call_args = repo.upsert_driver.call_args[0][0]
        assert call_args.first_name == "Max"
        assert call_args.last_name == "Verstappen"  # Canonical from known_aliases
        assert call_args.abbreviation == "VER"

    def test_get_or_create_team(self, mock_drivers: list[OpenF1Driver]) -> None:
        """Test team creation from OpenF1 driver data."""
        expected_id = uuid4()

        repo = MagicMock(spec=RacingRepository)
        repo.get_team_by_slug.return_value = None
        repo.upsert_team.return_value = expected_id
        repo.get_all_drivers.return_value = []
        repo.get_all_driver_aliases.return_value = []
        repo.get_all_teams.return_value = []
        repo.get_all_team_aliases.return_value = []

        service = OpenF1SyncService(repository=repo)
        service._ensure_clients()  # Initialize entity resolver
        team_id = service._get_or_create_team(repo, mock_drivers[0])

        assert team_id == expected_id
        repo.upsert_team.assert_called_once()

        # Verify the team was created with correct data
        call_args = repo.upsert_team.call_args[0][0]
        assert call_args.name == "Red Bull Racing"
        assert call_args.primary_color == "3671C6"

    def test_get_or_create_circuit(self, mock_meeting: OpenF1Meeting) -> None:
        """Test circuit creation from meeting data."""
        expected_id = uuid4()

        repo = MagicMock(spec=RacingRepository)
        repo.get_circuit_by_slug.return_value = None
        repo.upsert_circuit.return_value = expected_id

        service = OpenF1SyncService()
        circuit_id = service._get_or_create_circuit(repo, mock_meeting)

        assert circuit_id == expected_id
        repo.upsert_circuit.assert_called_once()

        # Verify the circuit was created with correct data
        call_args = repo.upsert_circuit.call_args[0][0]
        assert call_args.country == "Bahrain"

    def test_caching_prevents_duplicate_lookups(self, mock_drivers: list[OpenF1Driver]) -> None:
        """Test that caching prevents repeated database lookups."""
        expected_id = uuid4()

        repo = MagicMock(spec=RacingRepository)
        repo.get_driver_by_slug.return_value = None
        repo.upsert_driver.return_value = expected_id
        repo.get_all_drivers.return_value = []
        repo.get_all_driver_aliases.return_value = []
        repo.get_all_teams.return_value = []
        repo.get_all_team_aliases.return_value = []

        service = OpenF1SyncService(repository=repo)
        service._ensure_clients()  # Initialize entity resolver

        # First call should hit the database
        driver_id1 = service._get_or_create_driver(repo, mock_drivers[0])
        # Second call should use cache
        driver_id2 = service._get_or_create_driver(repo, mock_drivers[0])

        assert driver_id1 == driver_id2 == expected_id
        # Should only have called upsert once
        assert repo.upsert_driver.call_count == 1


class TestSyncServiceIntegration:
    """Integration tests for the sync service (still using mocks but testing full flow)."""

    def test_sync_year_orchestration(
        self,
        mock_meeting: OpenF1Meeting,
        mock_sessions: list[OpenF1Session],
        mock_drivers: list[OpenF1Driver],
    ) -> None:
        """Test the full sync orchestration flow."""
        # Mock repository
        repo = MagicMock(spec=RacingRepository)
        repo.get_series_by_slug.return_value = None
        repo.upsert_series.return_value = uuid4()
        repo.get_season.return_value = None
        repo.upsert_season.return_value = uuid4()
        repo.get_circuit_by_slug.return_value = None
        repo.upsert_circuit.return_value = uuid4()
        repo.get_driver_by_slug.return_value = None
        repo.upsert_driver.return_value = uuid4()
        repo.get_team_by_slug.return_value = None
        repo.upsert_team.return_value = uuid4()
        repo.upsert_round.return_value = uuid4()
        repo.upsert_session.return_value = uuid4()
        repo.upsert_entrant.return_value = uuid4()
        repo.get_entrant_by_driver_number.return_value = None
        repo.bulk_upsert_results.return_value = []

        # Create mock API client
        api = MagicMock(spec=OpenF1Client)
        api.get_meetings.return_value = [mock_meeting]
        api.get_sessions_for_meeting.return_value = mock_sessions
        api.get_drivers_for_meeting.return_value = mock_drivers
        api.get_final_positions.return_value = {1: 1, 44: 7}
        api.get_fastest_lap_driver.return_value = 1

        service = OpenF1SyncService(api_client=api, repository=repo)

        # Run sync
        stats = service.sync_year(2024, include_results=False)

        # Verify stats
        assert stats["year"] == 2024
        assert stats["meetings_synced"] == 1
        assert "errors" in stats

        # Verify API was called correctly
        api.get_meetings.assert_called_once_with(2024)
        api.get_sessions_for_meeting.assert_called_once_with(mock_meeting.meeting_key)
