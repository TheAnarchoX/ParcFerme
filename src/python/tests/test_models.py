"""Tests for the domain models."""

from datetime import date, datetime
from uuid import UUID

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
    slugify,
)


class TestSeriesModel:
    """Tests for the Series model."""

    def test_create_series(self) -> None:
        """Test creating a Series with required fields."""
        series = Series(name="Formula 1", slug="formula-1")
        assert series.name == "Formula 1"
        assert series.slug == "formula-1"
        assert isinstance(series.id, UUID)

    def test_series_optional_fields(self) -> None:
        """Test Series optional fields default to None."""
        series = Series(name="MotoGP", slug="motogp")
        assert series.logo_url is None


class TestSeasonModel:
    """Tests for the Season model."""

    def test_create_season(self) -> None:
        """Test creating a Season."""
        series = Series(name="Formula 1", slug="formula-1")
        season = Season(series_id=series.id, year=2024)
        assert season.year == 2024
        assert season.series_id == series.id


class TestCircuitModel:
    """Tests for the Circuit model."""

    def test_create_circuit_minimal(self) -> None:
        """Test creating a Circuit with minimal fields."""
        circuit = Circuit(
            name="Silverstone",
            slug="silverstone",
            location="Northamptonshire",
            country="United Kingdom",
        )
        assert circuit.name == "Silverstone"
        assert circuit.country == "United Kingdom"
        assert circuit.latitude is None
        assert circuit.longitude is None

    def test_create_circuit_full(self) -> None:
        """Test creating a Circuit with all fields."""
        circuit = Circuit(
            name="Silverstone",
            slug="silverstone",
            location="Northamptonshire",
            country="United Kingdom",
            country_code="GBR",
            latitude=52.0733,
            longitude=-1.0147,
            length_meters=5891,
        )
        assert circuit.country_code == "GBR"
        assert circuit.latitude == 52.0733
        assert circuit.length_meters == 5891


class TestRoundModel:
    """Tests for the Round model."""

    def test_create_round(self) -> None:
        """Test creating a Round."""
        round_ = Round(
            season_id=UUID("12345678-1234-5678-1234-567812345678"),
            circuit_id=UUID("87654321-4321-8765-4321-876543218765"),
            name="British Grand Prix",
            slug="2024-british-grand-prix",
            round_number=12,
            date_start=date(2024, 7, 5),
            date_end=date(2024, 7, 7),
            openf1_meeting_key=1240,
        )
        assert round_.name == "British Grand Prix"
        assert round_.round_number == 12
        assert round_.openf1_meeting_key == 1240


class TestSessionModel:
    """Tests for the Session model."""

    def test_create_session(self) -> None:
        """Test creating a Session."""
        session = Session(
            round_id=UUID("12345678-1234-5678-1234-567812345678"),
            type=SessionType.RACE,
            start_time_utc=datetime(2024, 7, 7, 14, 0, 0),
            openf1_session_key=9500,
        )
        assert session.type == SessionType.RACE
        assert session.status == SessionStatus.SCHEDULED  # Default

    def test_session_types(self) -> None:
        """Test all session types."""
        assert SessionType.FP1.value == 0
        assert SessionType.FP2.value == 1
        assert SessionType.FP3.value == 2
        assert SessionType.QUALIFYING.value == 3
        assert SessionType.SPRINT_QUALIFYING.value == 4
        assert SessionType.SPRINT.value == 5
        assert SessionType.RACE.value == 6


class TestDriverModel:
    """Tests for the Driver model."""

    def test_create_driver(self) -> None:
        """Test creating a Driver."""
        driver = Driver(
            first_name="Max",
            last_name="Verstappen",
            slug="max-verstappen",
            abbreviation="VER",
            nationality="NED",
            driver_number=1,
        )
        assert driver.first_name == "Max"
        assert driver.abbreviation == "VER"
        assert driver.driver_number == 1


class TestTeamModel:
    """Tests for the Team model."""

    def test_create_team(self) -> None:
        """Test creating a Team."""
        team = Team(
            name="Red Bull Racing",
            slug="red-bull-racing",
            short_name="Red Bull",
            primary_color="3671C6",
        )
        assert team.name == "Red Bull Racing"
        assert team.primary_color == "3671C6"


class TestEntrantModel:
    """Tests for the Entrant model."""

    def test_create_entrant(self) -> None:
        """Test creating an Entrant."""
        entrant = Entrant(
            round_id=UUID("12345678-1234-5678-1234-567812345678"),
            driver_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            team_id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        )
        assert entrant.id is not None


class TestResultModel:
    """Tests for the Result model."""

    def test_create_result(self) -> None:
        """Test creating a Result."""
        result = Result(
            session_id=UUID("12345678-1234-5678-1234-567812345678"),
            entrant_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            position=1,
            grid_position=1,
            status=ResultStatus.FINISHED,
            points=25.0,
            laps=57,
            fastest_lap=True,
        )
        assert result.position == 1
        assert result.fastest_lap is True

    def test_result_statuses(self) -> None:
        """Test all result statuses."""
        assert ResultStatus.FINISHED.value == 0
        assert ResultStatus.DNF.value == 1
        assert ResultStatus.DNS.value == 2
        assert ResultStatus.DSQ.value == 3
        assert ResultStatus.NC.value == 4


class TestSlugify:
    """Tests for the slugify function."""

    def test_slugify_simple(self) -> None:
        """Test simple string slugification."""
        assert slugify("Hello World") == "hello-world"

    def test_slugify_special_chars(self) -> None:
        """Test slugify removes special characters."""
        assert slugify("Monaco (GP)!") == "monaco-gp"

    def test_slugify_consecutive_spaces(self) -> None:
        """Test slugify handles consecutive spaces."""
        assert slugify("Red   Bull    Racing") == "red-bull-racing"

    def test_slugify_leading_trailing(self) -> None:
        """Test slugify strips leading/trailing hyphens."""
        assert slugify("  Test  ") == "test"
        assert slugify("--test--") == "test"

    def test_slugify_unicode(self) -> None:
        """Test slugify handles unicode by removing non-ascii."""
        # Note: Current implementation removes non-ascii
        assert slugify("São Paulo") == "so-paulo"
