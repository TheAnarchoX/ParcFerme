"""
Tests for EntityResolver scoring-based matching methods.

These tests verify the new resolve_*_with_scoring methods that use
the multi-signal matching framework.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from ingestion.entity_resolver import EntityResolver
from ingestion.matching import ConfidenceLevel
from ingestion.models import (
    Driver,
    DriverAlias,
    Team,
    TeamAlias,
    Circuit,
    CircuitAlias,
    PendingMatchEntityType,
)


@pytest.fixture
def mock_repository():
    """Create a mock repository."""
    repo = MagicMock()
    repo.get_all_drivers.return_value = []
    repo.get_all_teams.return_value = []
    repo.get_all_series.return_value = []
    repo.get_all_circuits.return_value = []
    repo.get_all_driver_aliases.return_value = []
    repo.get_all_team_aliases.return_value = []
    repo.get_all_series_aliases.return_value = []
    repo.get_all_circuit_aliases.return_value = []
    repo.create_pending_match.return_value = uuid4()
    return repo


@pytest.fixture
def resolver_with_drivers(mock_repository):
    """Create resolver pre-populated with sample drivers."""
    verstappen = Driver(
        id=uuid4(),
        first_name="Max",
        last_name="Verstappen",
        slug="max-verstappen",
        abbreviation="VER",
        nationality="NED",
        driver_number=1,
        openf1_driver_number=1,
    )
    hamilton = Driver(
        id=uuid4(),
        first_name="Lewis",
        last_name="Hamilton",
        slug="lewis-hamilton",
        abbreviation="HAM",
        nationality="GBR",
        driver_number=44,
        openf1_driver_number=44,
    )
    antonelli = Driver(
        id=uuid4(),
        first_name="Andrea Kimi",
        last_name="Antonelli",
        slug="andrea-kimi-antonelli",
        abbreviation="ANT",
        nationality="ITA",
        driver_number=12,
        openf1_driver_number=12,
    )

    mock_repository.get_all_drivers.return_value = [verstappen, hamilton, antonelli]
    mock_repository.get_all_driver_aliases.return_value = [
        DriverAlias(
            id=uuid4(),
            driver_id=antonelli.id,
            alias_name="Kimi Antonelli",
            alias_slug="kimi-antonelli",
            source="OpenF1-2024",
        )
    ]

    resolver = EntityResolver(repository=mock_repository)
    return resolver, mock_repository, {
        "verstappen": verstappen,
        "hamilton": hamilton,
        "antonelli": antonelli,
    }


@pytest.fixture
def resolver_with_teams(mock_repository):
    """Create resolver pre-populated with sample teams."""
    red_bull = Team(
        id=uuid4(),
        name="Red Bull Racing",
        slug="red-bull-racing",
        primary_color="3671C6",
    )
    mercedes = Team(
        id=uuid4(),
        name="Mercedes",
        slug="mercedes",
        primary_color="00D2BE",
    )

    mock_repository.get_all_teams.return_value = [red_bull, mercedes]
    mock_repository.get_all_team_aliases.return_value = []

    resolver = EntityResolver(repository=mock_repository)
    return resolver, mock_repository, {
        "red_bull": red_bull,
        "mercedes": mercedes,
    }


@pytest.fixture
def resolver_with_circuits(mock_repository):
    """Create resolver pre-populated with sample circuits."""
    silverstone = Circuit(
        id=uuid4(),
        name="Silverstone",
        slug="silverstone",
        location="Silverstone",
        country="United Kingdom",
        country_code="GB",
    )
    monaco = Circuit(
        id=uuid4(),
        name="Monaco",
        slug="monaco",
        location="Monte Carlo",
        country="Monaco",
        country_code="MC",
    )

    mock_repository.get_all_circuits.return_value = [silverstone, monaco]
    mock_repository.get_all_circuit_aliases.return_value = []

    resolver = EntityResolver(repository=mock_repository)
    return resolver, mock_repository, {
        "silverstone": silverstone,
        "monaco": monaco,
    }


class TestResolveDriverWithScoring:
    """Test resolve_driver_with_scoring method."""

    def test_high_confidence_match(self, resolver_with_drivers):
        """Test high confidence match returns driver directly."""
        resolver, mock_repo, drivers = resolver_with_drivers

        result = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        assert result.matched is True
        assert result.entity_id == drivers["verstappen"].id
        # Should not create pending match for high confidence
        mock_repo.create_pending_match.assert_not_called()

    def test_match_by_abbreviation_requires_more_context(self, resolver_with_drivers):
        """Test that abbreviation alone isn't enough for high confidence match.
        
        The matching system requires multiple signals. Abbreviation and driver
        number together score 0.3 (0.15 each), which is below the 0.5 threshold.
        """
        resolver, mock_repo, drivers = resolver_with_drivers

        result = resolver.resolve_driver_with_scoring(
            full_name="",
            first_name="",
            last_name="",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        # Score of 0.3 is below threshold, so matched=False
        assert result.matched is False
        assert result.score == pytest.approx(0.3, abs=0.01)

    def test_match_by_driver_number_requires_more_context(self, resolver_with_drivers):
        """Test that driver number alone isn't enough for a match."""
        resolver, mock_repo, drivers = resolver_with_drivers

        result = resolver.resolve_driver_with_scoring(
            full_name="",
            first_name="",
            last_name="",
            driver_number=44,
            abbreviation=None,
            source="test",
        )

        # Driver number alone only scores 0.15
        assert result.matched is False
        assert result.score == pytest.approx(0.15, abs=0.01)

    def test_no_match_with_empty_cache(self, mock_repository):
        """Test no match when cache is empty."""
        mock_repository.get_all_drivers.return_value = []
        resolver = EntityResolver(repository=mock_repository)

        result = resolver.resolve_driver_with_scoring(
            full_name="Unknown Driver",
            first_name="Unknown",
            last_name="Driver",
            driver_number=99,
            abbreviation="UNK",
            source="test",
        )

        assert result.matched is False
        assert result.confidence == ConfidenceLevel.NO_MATCH


class TestResolveTeamWithScoring:
    """Test resolve_team_with_scoring method."""

    def test_high_confidence_exact_match(self, resolver_with_teams):
        """Test exact team name match."""
        resolver, mock_repo, teams = resolver_with_teams

        result = resolver.resolve_team_with_scoring(
            name="Red Bull Racing",
            source="test",
        )

        assert result.matched is True
        assert result.entity_id == teams["red_bull"].id

    def test_partial_name_match(self, resolver_with_teams):
        """Test partial team name match."""
        resolver, mock_repo, teams = resolver_with_teams

        result = resolver.resolve_team_with_scoring(
            name="Red Bull",
            source="test",
        )

        assert result.matched is True
        assert result.entity_id == teams["red_bull"].id

    def test_no_match_returns_scoring_result(self, resolver_with_teams):
        """Test no match returns ScoringResult with matched=False."""
        resolver, mock_repo, teams = resolver_with_teams

        result = resolver.resolve_team_with_scoring(
            name="Unknown Racing Team",
            source="test",
        )

        assert result.matched is False


class TestResolveCircuitWithScoring:
    """Test resolve_circuit_with_scoring method."""

    def test_high_confidence_exact_match(self, resolver_with_circuits):
        """Test exact circuit name match."""
        resolver, mock_repo, circuits = resolver_with_circuits

        result = resolver.resolve_circuit_with_scoring(
            name="Silverstone",
            source="test",
        )

        assert result.matched is True
        assert result.entity_id == circuits["silverstone"].id

    def test_match_with_country(self, resolver_with_circuits):
        """Test matching with country info."""
        resolver, mock_repo, circuits = resolver_with_circuits

        result = resolver.resolve_circuit_with_scoring(
            name="Silverstone Circuit",
            country="United Kingdom",
            source="test",
        )

        assert result.matched is True
        assert result.entity_id == circuits["silverstone"].id

    def test_match_by_location_needs_review(self, resolver_with_circuits):
        """Test matching by location may trigger review.
        
        When the name doesn't quite match but location does, we get a
        LOW confidence match that needs human review.
        """
        resolver, mock_repo, circuits = resolver_with_circuits

        result = resolver.resolve_circuit_with_scoring(
            name="Monte Carlo Circuit",
            location="Monte Carlo",
            source="test",
        )

        # Match is found but needs review due to LOW confidence
        assert result.entity_id == circuits["monaco"].id
        assert result.needs_review is True

    def test_no_match_returns_scoring_result(self, resolver_with_circuits):
        """Test no match returns ScoringResult."""
        resolver, mock_repo, circuits = resolver_with_circuits

        result = resolver.resolve_circuit_with_scoring(
            name="Unknown Circuit",
            country="Unknown Country",
            source="test",
        )

        assert result.matched is False


class TestScoringResultStructure:
    """Test that ScoringResult has expected structure."""

    def test_scoring_result_fields(self, resolver_with_drivers):
        """Test ScoringResult has expected fields."""
        resolver, mock_repo, drivers = resolver_with_drivers

        result = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        # Check expected fields exist
        assert hasattr(result, 'matched')
        assert hasattr(result, 'entity_id')
        assert hasattr(result, 'entity_name')
        assert hasattr(result, 'confidence')
        assert hasattr(result, 'score')
        assert hasattr(result, 'signals')
        assert hasattr(result, 'needs_review')

    def test_signals_list_structure(self, resolver_with_drivers):
        """Test that signals list contains expected data."""
        resolver, mock_repo, drivers = resolver_with_drivers

        result = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        # Signals should be a list of dicts
        assert isinstance(result.signals, list)
        if len(result.signals) > 0:
            signal = result.signals[0]
            assert 'name' in signal
            assert 'weight' in signal
            assert 'score' in signal


class TestScoringMethodIntegration:
    """Integration tests for scoring methods with full resolver."""

    def test_caching_works_with_scoring(self, resolver_with_drivers):
        """Test that resolver caching works with scoring methods."""
        resolver, mock_repo, drivers = resolver_with_drivers

        # First call
        result1 = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        # Second call should use cached data
        result2 = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )

        assert result1.matched is True
        assert result2.matched is True
        assert result1.entity_id == result2.entity_id

    def test_multiple_entity_types(self, mock_repository):
        """Test scoring works for multiple entity types."""
        # Set up drivers
        verstappen = Driver(
            id=uuid4(),
            first_name="Max",
            last_name="Verstappen",
            slug="max-verstappen",
            abbreviation="VER",
            nationality="NED",
            driver_number=1,
            openf1_driver_number=1,
        )
        mock_repository.get_all_drivers.return_value = [verstappen]

        # Set up teams
        red_bull = Team(
            id=uuid4(),
            name="Red Bull Racing",
            slug="red-bull-racing",
            primary_color="3671C6",
        )
        mock_repository.get_all_teams.return_value = [red_bull]

        resolver = EntityResolver(repository=mock_repository)

        # Test driver matching
        driver_result = resolver.resolve_driver_with_scoring(
            full_name="Max Verstappen",
            first_name="Max",
            last_name="Verstappen",
            driver_number=1,
            abbreviation="VER",
            source="test",
        )
        assert driver_result.matched is True
        assert driver_result.entity_id == verstappen.id

        # Test team matching
        team_result = resolver.resolve_team_with_scoring(
            name="Red Bull Racing",
            source="test",
        )
        assert team_result.matched is True
        assert team_result.entity_id == red_bull.id
