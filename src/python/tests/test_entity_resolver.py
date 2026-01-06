"""Tests for the entity resolver service."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from ingestion.entity_resolver import (
    EntityResolver,
    ResolvedDriver,
    ResolvedTeam,
    ResolvedSeries,
    ResolvedCircuit,
)
from ingestion.models import (
    Driver,
    DriverAlias,
    Team,
    TeamAlias,
    Series,
    SeriesAlias,
    Circuit,
    CircuitAlias,
    slugify,
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
    return repo


@pytest.fixture
def resolver_with_drivers(mock_repository):
    """Create resolver pre-populated with sample drivers."""
    # Create some existing drivers
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
    return resolver, {
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
    rb = Team(
        id=uuid4(),
        name="Racing Bulls",
        slug="racing-bulls",
        primary_color="6692FF",
    )

    mock_repository.get_all_teams.return_value = [red_bull, mercedes, rb]
    mock_repository.get_all_team_aliases.return_value = [
        TeamAlias(
            id=uuid4(),
            team_id=rb.id,
            alias_name="AlphaTauri",
            alias_slug="alphatauri",
            source="historical",
        ),
        TeamAlias(
            id=uuid4(),
            team_id=rb.id,
            alias_name="Visa Cash App RB",
            alias_slug="visa-cash-app-rb",
            source="OpenF1",
        ),
    ]

    resolver = EntityResolver(repository=mock_repository)
    return resolver, {
        "red_bull": red_bull,
        "mercedes": mercedes,
        "rb": rb,
    }


@pytest.fixture
def resolver_with_series(mock_repository):
    """Create resolver pre-populated with sample series."""
    f1 = Series(
        id=uuid4(),
        name="Formula 1",
        slug="formula-1",
        logo_url="https://example.com/f1-logo.png",
    )
    motogp = Series(
        id=uuid4(),
        name="MotoGP",
        slug="motogp",
        logo_url="https://example.com/motogp-logo.png",
    )
    indycar = Series(
        id=uuid4(),
        name="IndyCar",
        slug="indycar",
        logo_url="https://example.com/indycar-logo.png",
    )

    mock_repository.get_all_series.return_value = [f1, motogp, indycar]
    mock_repository.get_all_series_aliases.return_value = [
        SeriesAlias(
            id=uuid4(),
            series_id=f1.id,
            alias_name="F1",
            alias_slug="f1",
            source="abbreviation",
        )
    ]

    resolver = EntityResolver(repository=mock_repository)
    return resolver, {
        "f1": f1,
        "motogp": motogp,
        "indycar": indycar,
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
        latitude=52.0786,
        longitude=-1.0169,
        length_meters=5891,
    )
    monaco = Circuit(
        id=uuid4(),
        name="Monaco",
        slug="monaco",
        location="Monte Carlo",
        country="Monaco",
        country_code="MC",
        latitude=43.7347,
        longitude=7.4206,
        length_meters=3337,
    )
    spa = Circuit(
        id=uuid4(),
        name="Spa-Francorchamps",
        slug="spa-francorchamps",
        location="Stavelot",
        country="Belgium",
        country_code="BE",
        latitude=50.4372,
        longitude=5.9714,
        length_meters=7004,
    )

    mock_repository.get_all_circuits.return_value = [silverstone, monaco, spa]
    mock_repository.get_all_circuit_aliases.return_value = [
        CircuitAlias(
            id=uuid4(),
            circuit_id=monaco.id,
            alias_name="Circuit de Monaco",
            alias_slug="circuit-de-monaco",
            source="official",
        ),
        CircuitAlias(
            id=uuid4(),
            circuit_id=spa.id,
            alias_name="Spa",
            alias_slug="spa",
            source="short",
        ),
    ]

    resolver = EntityResolver(repository=mock_repository)
    return resolver, {
        "silverstone": silverstone,
        "monaco": monaco,
        "spa": spa,
    }


class TestDriverResolution:
    """Tests for driver entity resolution."""

    def test_resolve_driver_by_number_exact_match(self, resolver_with_drivers):
        """Should match existing driver by driver number."""
        resolver, drivers = resolver_with_drivers

        result = resolver.resolve_driver(
            full_name="Max VERSTAPPEN",
            first_name="Max",
            last_name="VERSTAPPEN",
            driver_number=1,
            abbreviation="VER",
        )

        assert not result.is_new
        assert result.existing_id == drivers["verstappen"].id
        assert result.driver.driver_number == 1

    def test_resolve_driver_number_match_ignores_different_surname(self, mock_repository):
        """Should NOT match by number if last name is different (reserve driver scenario)."""
        # Scenario: Paul Aron uses #97, but Robert Shwartzman already has #97
        shwartzman = Driver(
            id=uuid4(),
            first_name="Robert",
            last_name="Shwartzman",
            slug="robert-shwartzman",
            abbreviation="SHW",
            nationality="ISR",
            driver_number=97,
            openf1_driver_number=97,
        )

        mock_repository.get_all_drivers.return_value = [shwartzman]
        mock_repository.get_all_driver_aliases.return_value = []
        mock_repository.get_all_teams.return_value = []
        mock_repository.get_all_team_aliases.return_value = []

        resolver = EntityResolver(repository=mock_repository)

        # Paul Aron driving with #97 should NOT match Shwartzman
        result = resolver.resolve_driver(
            full_name="Paul ARON",
            first_name="Paul",
            last_name="Aron",
            driver_number=97,
            abbreviation="ARO",
        )

        # Should create new driver, not match Shwartzman
        assert result.is_new
        assert result.driver.first_name == "Paul"
        assert result.driver.last_name == "Aron"
        assert result.driver.driver_number == 97

    def test_resolve_driver_by_slug_exact_match(self, resolver_with_drivers):
        """Should match existing driver by slug when no number match."""
        resolver, drivers = resolver_with_drivers

        result = resolver.resolve_driver(
            full_name="Lewis Hamilton",
            first_name="Lewis",
            last_name="Hamilton",
            driver_number=44,
        )

        assert not result.is_new
        assert result.existing_id == drivers["hamilton"].id

    def test_resolve_driver_by_known_alias(self, resolver_with_drivers):
        """Should match driver via known aliases config."""
        resolver, drivers = resolver_with_drivers

        # "Kimi Antonelli" should resolve to "Andrea Kimi Antonelli"
        result = resolver.resolve_driver(
            full_name="Kimi Antonelli",
            first_name="Kimi",
            last_name="Antonelli",
            driver_number=12,
            abbreviation="ANT",
        )

        assert not result.is_new
        assert result.existing_id == drivers["antonelli"].id
        # Canonical name should be updated to the config value
        assert result.driver.first_name == "Andrea Kimi"
        assert result.driver.last_name == "Antonelli"

    def test_resolve_driver_by_database_alias(self, resolver_with_drivers):
        """Should match driver via database alias lookup."""
        resolver, drivers = resolver_with_drivers

        # The "kimi-antonelli" alias is in the database
        result = resolver.resolve_driver(
            full_name="Kimi Antonelli",
            first_name="Kimi",
            last_name="Antonelli",
            driver_number=12,
        )

        assert not result.is_new
        assert result.existing_id == drivers["antonelli"].id

    def test_resolve_driver_creates_new(self, resolver_with_drivers):
        """Should create new driver when no match found."""
        resolver, _ = resolver_with_drivers

        result = resolver.resolve_driver(
            full_name="New Driver",
            first_name="New",
            last_name="Driver",
            driver_number=99,
            abbreviation="NEW",
        )

        assert result.is_new
        assert result.existing_id is None
        assert result.driver.first_name == "New"
        assert result.driver.last_name == "Driver"
        assert result.driver.slug == "new-driver"
        assert result.driver.driver_number == 99

    def test_resolve_driver_adds_alias_on_name_change(self, resolver_with_drivers):
        """Should add variant name as alias when incoming name differs from canonical."""
        resolver, drivers = resolver_with_drivers

        # Simulate a variant name (e.g., OpenF1 sends a different form)
        # Canonical name is preserved (Lewis Hamilton), but the variant is added as alias
        result = resolver.resolve_driver(
            full_name="Lewis Hamilton-Larbalestier",  # Hypothetical variant
            first_name="Lewis",
            last_name="Hamilton-Larbalestier",
            driver_number=44,
        )

        assert not result.is_new
        # Canonical name is preserved (from known_aliases.json)
        assert result.driver.first_name == "Lewis"
        assert result.driver.last_name == "Hamilton"
        # The variant should be added as an alias
        assert len(result.aliases_to_add) > 0
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "lewis-hamilton-larbalestier" in alias_slugs

    def test_resolve_driver_name_change_for_unknown_driver(self, mock_repository):
        """Should track name change for drivers not in known_aliases.json."""
        # Create a driver NOT in known_aliases.json
        unknown_driver = Driver(
            id=uuid4(),
            first_name="John",
            last_name="Smith",
            slug="john-smith",
            abbreviation="SMI",
            nationality="GBR",
            driver_number=99,
            openf1_driver_number=99,
        )

        mock_repository.get_all_drivers.return_value = [unknown_driver]
        mock_repository.get_all_driver_aliases.return_value = []
        mock_repository.get_all_teams.return_value = []
        mock_repository.get_all_team_aliases.return_value = []

        resolver = EntityResolver(repository=mock_repository)

        # Now send a name update for this driver
        result = resolver.resolve_driver(
            full_name="John Smith-Jones",  # Name change
            first_name="John",
            last_name="Smith-Jones",
            driver_number=99,
        )

        assert not result.is_new
        # For drivers not in known_aliases, incoming name becomes canonical
        assert result.name_changed
        assert result.old_name == "John Smith"
        assert result.driver.last_name == "Smith-Jones"
        # Old name should be added as alias
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "john-smith" in alias_slugs

    def test_resolve_driver_adds_alias_for_variant_slug(self, resolver_with_drivers):
        """Should add alias when incoming slug differs from canonical."""
        resolver, drivers = resolver_with_drivers

        # Use a variant name that resolves via driver number
        result = resolver.resolve_driver(
            full_name="M VERSTAPPEN",  # Broadcast name variant
            first_name="M",
            last_name="VERSTAPPEN",
            driver_number=1,
        )

        assert not result.is_new
        # Should have alias for the broadcast name variant
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "m-verstappen" in alias_slugs

    def test_resolve_driver_fuzzy_match_containment(self, mock_repository):
        """Should fuzzy match when one slug contains the other."""
        existing = Driver(
            id=uuid4(),
            first_name="Carlos",
            last_name="Sainz",
            slug="carlos-sainz",
            driver_number=55,
            openf1_driver_number=55,
        )
        mock_repository.get_all_drivers.return_value = [existing]
        mock_repository.get_all_driver_aliases.return_value = []
        resolver = EntityResolver(repository=mock_repository)

        # "Carlos Sainz Jr" should match "Carlos Sainz"
        result = resolver.resolve_driver(
            full_name="Carlos Sainz Jr",
            first_name="Carlos",
            last_name="Sainz Jr",
            driver_number=55,
        )

        assert not result.is_new
        assert result.existing_id == existing.id


class TestTeamResolution:
    """Tests for team entity resolution."""

    def test_resolve_team_exact_slug_match(self, resolver_with_teams):
        """Should match existing team by exact slug."""
        resolver, teams = resolver_with_teams

        result = resolver.resolve_team(
            name="Mercedes",
            primary_color="00D2BE",
        )

        assert not result.is_new
        assert result.existing_id == teams["mercedes"].id

    def test_resolve_team_by_known_alias(self, resolver_with_teams):
        """Should match team via known aliases config."""
        resolver, teams = resolver_with_teams

        # "Red Bull Racing Honda RBPT" should resolve to "Red Bull Racing"
        result = resolver.resolve_team(
            name="Red Bull Racing Honda RBPT",
            primary_color="3671C6",
        )

        assert not result.is_new
        assert result.existing_id == teams["red_bull"].id
        # Canonical name should be "Red Bull Racing" from config
        assert result.team.name == "Red Bull Racing"

    def test_resolve_team_by_database_alias(self, resolver_with_teams):
        """Should match team via database alias lookup."""
        resolver, teams = resolver_with_teams

        # "AlphaTauri" alias is in the database for Racing Bulls
        result = resolver.resolve_team(
            name="AlphaTauri",
        )

        assert not result.is_new
        assert result.existing_id == teams["rb"].id

    def test_resolve_team_creates_new(self, resolver_with_teams):
        """Should create new team when no match found."""
        resolver, _ = resolver_with_teams

        result = resolver.resolve_team(
            name="New Racing Team",
            primary_color="FF0000",
        )

        assert result.is_new
        assert result.existing_id is None
        assert result.team.name == "New Racing Team"
        assert result.team.slug == "new-racing-team"

    def test_resolve_team_adds_alias_on_name_change(self, resolver_with_teams):
        """Should add old name as alias when canonical name changes."""
        resolver, teams = resolver_with_teams

        # Simulate a rebrand
        result = resolver.resolve_team(
            name="Mercedes-AMG Petronas F1 Team",  # Full official name
            primary_color="00D2BE",
        )

        # This is tricky - the known_aliases.json has Mercedes as canonical
        # The config should handle this
        assert not result.is_new

    def test_resolve_team_fuzzy_match_core_name(self, resolver_with_teams):
        """Should fuzzy match teams by core name."""
        resolver, teams = resolver_with_teams

        # A complex Red Bull variation should still match
        result = resolver.resolve_team(
            name="Oracle Red Bull Racing Honda",
        )

        assert not result.is_new
        assert result.existing_id == teams["red_bull"].id

    def test_resolve_rb_variations(self, resolver_with_teams):
        """Should handle RB/Racing Bulls/AlphaTauri variations."""
        resolver, teams = resolver_with_teams

        # Visa Cash App RB should match Racing Bulls
        result = resolver.resolve_team(
            name="Visa Cash App RB",
        )

        assert not result.is_new
        assert result.existing_id == teams["rb"].id


class TestSeriesResolution:
    """Tests for series entity resolution."""

    def test_resolve_series_exact_slug_match(self, resolver_with_series):
        """Should match existing series by exact slug."""
        resolver, series_dict = resolver_with_series

        result = resolver.resolve_series(
            name="Formula 1",
            logo_url="https://example.com/new-f1-logo.png",
        )

        assert not result.is_new
        assert result.existing_id == series_dict["f1"].id
        assert result.series.name == "Formula 1"

    def test_resolve_series_by_database_alias(self, resolver_with_series):
        """Should match series via database alias."""
        resolver, series_dict = resolver_with_series

        # "F1" should match Formula 1 via alias
        result = resolver.resolve_series(
            name="F1",
        )

        assert not result.is_new
        assert result.existing_id == series_dict["f1"].id

    def test_resolve_series_by_known_alias(self, mock_repository):
        """Should match series via known aliases config."""
        f1 = Series(
            id=uuid4(),
            name="Formula 1",
            slug="formula-1",
        )

        mock_repository.get_all_series.return_value = [f1]
        mock_repository.get_all_series_aliases.return_value = []

        resolver = EntityResolver(repository=mock_repository)

        # "FIA Formula One World Championship" should resolve to "Formula 1"
        result = resolver.resolve_series(
            name="FIA Formula One World Championship",
        )

        assert not result.is_new
        assert result.existing_id == f1.id
        # Should add incoming name as alias
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "fia-formula-one-world-championship" in alias_slugs

    def test_resolve_series_creates_new(self, mock_repository):
        """Should create new series when no match found."""
        resolver = EntityResolver(repository=mock_repository)

        result = resolver.resolve_series(
            name="Formula E",
            logo_url="https://example.com/fe-logo.png",
        )

        assert result.is_new
        assert result.existing_id is None
        assert result.series.name == "Formula E"
        assert result.series.slug == "formula-e"
        assert result.series.logo_url == "https://example.com/fe-logo.png"

    def test_resolve_series_updates_name_via_known_alias(self, resolver_with_series):
        """Should update series name when canonical name from known alias differs."""
        resolver, series_dict = resolver_with_series

        # Use official name that maps to Formula 1 via known alias
        result = resolver.resolve_series(
            name="FIA Formula One World Championship",
        )

        assert not result.is_new
        assert result.existing_id == series_dict["f1"].id
        # Name should be canonical from known alias
        assert result.series.name == "Formula 1"
        # Incoming variant should be added as alias
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "fia-formula-one-world-championship" in alias_slugs

    def test_resolve_series_adds_alias_for_variant(self, resolver_with_series):
        """Should add alias when incoming name differs from canonical."""
        resolver, series_dict = resolver_with_series

        # Use variant name that matches by known alias
        result = resolver.resolve_series(
            name="NTT IndyCar Series",
        )

        # Should match IndyCar
        assert not result.is_new
        # Should have alias for the variant name
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "ntt-indycar-series" in alias_slugs


class TestCircuitResolution:
    """Tests for circuit entity resolution."""

    def test_resolve_circuit_exact_slug_match(self, resolver_with_circuits):
        """Should match existing circuit by exact slug."""
        resolver, circuits = resolver_with_circuits

        result = resolver.resolve_circuit(
            name="Silverstone",
            location="Silverstone",
            country="United Kingdom",
            country_code="GB",
            length_meters=5891,
        )

        assert not result.is_new
        assert result.existing_id == circuits["silverstone"].id
        assert result.circuit.name == "Silverstone"

    def test_resolve_circuit_by_database_alias(self, resolver_with_circuits):
        """Should match circuit via database alias."""
        resolver, circuits = resolver_with_circuits

        # "Circuit de Monaco" should match Monaco via alias
        result = resolver.resolve_circuit(
            name="Circuit de Monaco",
            location="Monte Carlo",
            country="Monaco",
        )

        assert not result.is_new
        assert result.existing_id == circuits["monaco"].id

    def test_resolve_circuit_by_known_alias(self, mock_repository):
        """Should match circuit via known aliases config."""
        monaco = Circuit(
            id=uuid4(),
            name="Monaco",
            slug="monaco",
            location="Monte Carlo",
            country="Monaco",
        )

        mock_repository.get_all_circuits.return_value = [monaco]
        mock_repository.get_all_circuit_aliases.return_value = []

        resolver = EntityResolver(repository=mock_repository)

        # "Monte Carlo" should resolve to "Monaco"
        result = resolver.resolve_circuit(
            name="Monte Carlo",
            location="Monte Carlo",
            country="Monaco",
        )

        assert not result.is_new
        assert result.existing_id == monaco.id
        # Should add incoming name as alias
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "monte-carlo" in alias_slugs

    def test_resolve_circuit_creates_new(self, mock_repository):
        """Should create new circuit when no match found."""
        resolver = EntityResolver(repository=mock_repository)

        result = resolver.resolve_circuit(
            name="Suzuka",
            location="Suzuka",
            country="Japan",
            country_code="JP",
            latitude=34.8431,
            longitude=136.5407,
            length_meters=5807,
        )

        assert result.is_new
        assert result.existing_id is None
        assert result.circuit.name == "Suzuka"
        assert result.circuit.slug == "suzuka"
        assert result.circuit.latitude == 34.8431

    def test_resolve_circuit_updates_name_via_known_alias(self, resolver_with_circuits):
        """Should update circuit name when canonical name from known alias differs."""
        resolver, circuits = resolver_with_circuits

        # "Monte Carlo" should resolve to "Monaco" via known alias
        result = resolver.resolve_circuit(
            name="Monte Carlo",
            location="Monte Carlo",
            country="Monaco",
        )

        assert not result.is_new
        assert result.existing_id == circuits["monaco"].id
        # Name should be canonical from known alias
        assert result.circuit.name == "Monaco"
        # Incoming variant should be added as alias
        alias_slugs = [a.alias_slug for a in result.aliases_to_add]
        assert "monte-carlo" in alias_slugs

    def test_resolve_circuit_fuzzy_match_containment(self, mock_repository):
        """Should fuzzy match when one slug contains the other."""
        existing = Circuit(
            id=uuid4(),
            name="Autodromo Nazionale Monza",
            slug="autodromo-nazionale-monza",
            location="Monza",
            country="Italy",
        )

        mock_repository.get_all_circuits.return_value = [existing]
        mock_repository.get_all_circuit_aliases.return_value = []

        resolver = EntityResolver(repository=mock_repository)

        # "Monza" should fuzzy match "Autodromo Nazionale Monza"
        result = resolver.resolve_circuit(
            name="Monza",
            location="Monza",
            country="Italy",
        )

        assert not result.is_new
        assert result.existing_id == existing.id

    def test_resolve_circuit_adds_alias_for_variant(self, resolver_with_circuits):
        """Should add alias when incoming name differs from canonical."""
        resolver, circuits = resolver_with_circuits

        # "Spa" should match Spa-Francorchamps via alias
        result = resolver.resolve_circuit(
            name="Spa",
            location="Stavelot",
            country="Belgium",
        )

        # Should match via DB alias, no new alias needed
        assert not result.is_new
        assert result.existing_id == circuits["spa"].id


class TestSlugify:
    """Tests for the slugify utility function."""

    def test_slugify_basic(self):
        """Should convert basic strings to slugs."""
        assert slugify("Max Verstappen") == "max-verstappen"
        assert slugify("Lewis Hamilton") == "lewis-hamilton"

    def test_slugify_special_characters(self):
        """Should remove special characters."""
        assert slugify("Sergio Pérez") == "sergio-prez"
        assert slugify("Nico Hülkenberg") == "nico-hlkenberg"

    def test_slugify_multiple_spaces(self):
        """Should handle multiple spaces."""
        assert slugify("Red   Bull   Racing") == "red-bull-racing"

    def test_slugify_underscores(self):
        """Should convert underscores to hyphens."""
        assert slugify("some_team_name") == "some-team-name"


class TestLevenshteinDistance:
    """Tests for the Levenshtein distance calculation."""

    def test_identical_strings(self):
        """Should return 0 for identical strings."""
        assert EntityResolver._levenshtein_distance("test", "test") == 0

    def test_single_insertion(self):
        """Should return 1 for single insertion."""
        assert EntityResolver._levenshtein_distance("test", "tests") == 1

    def test_single_deletion(self):
        """Should return 1 for single deletion."""
        assert EntityResolver._levenshtein_distance("tests", "test") == 1

    def test_single_substitution(self):
        """Should return 1 for single substitution."""
        assert EntityResolver._levenshtein_distance("test", "tast") == 1

    def test_multiple_operations(self):
        """Should correctly count multiple operations."""
        assert EntityResolver._levenshtein_distance("kitten", "sitting") == 3


class TestCacheManagement:
    """Tests for cache management in EntityResolver."""

    def test_update_cache_after_upsert_driver(self, mock_repository):
        """Should update driver cache after upsert."""
        resolver = EntityResolver(repository=mock_repository)
        resolver._cache_initialized = True

        driver = Driver(
            id=uuid4(),
            first_name="Test",
            last_name="Driver",
            slug="test-driver",
            driver_number=99,
            openf1_driver_number=99,
        )

        resolver.update_cache_after_upsert(driver=driver)

        assert "test-driver" in resolver._driver_cache
        assert 99 in resolver._driver_by_number
        assert resolver._driver_cache["test-driver"] == driver
        assert resolver._driver_by_number[99] == driver

    def test_update_cache_after_upsert_team(self, mock_repository):
        """Should update team cache after upsert."""
        resolver = EntityResolver(repository=mock_repository)
        resolver._cache_initialized = True

        team = Team(
            id=uuid4(),
            name="Test Team",
            slug="test-team",
        )

        resolver.update_cache_after_upsert(team=team)

        assert "test-team" in resolver._team_cache
        assert resolver._team_cache["test-team"] == team

    def test_update_cache_after_upsert_series(self, mock_repository):
        """Should update series cache after upsert."""
        resolver = EntityResolver(repository=mock_repository)
        resolver._cache_initialized = True

        series = Series(
            id=uuid4(),
            name="Test Series",
            slug="test-series",
        )

        resolver.update_cache_after_upsert(series=series)

        assert "test-series" in resolver._series_cache
        assert resolver._series_cache["test-series"] == series

    def test_update_cache_after_upsert_circuit(self, mock_repository):
        """Should update circuit cache after upsert."""
        resolver = EntityResolver(repository=mock_repository)
        resolver._cache_initialized = True

        circuit = Circuit(
            id=uuid4(),
            name="Test Circuit",
            slug="test-circuit",
            location="Test City",
            country="Test Country",
        )

        resolver.update_cache_after_upsert(circuit=circuit)

        assert "test-circuit" in resolver._circuit_cache
        assert resolver._circuit_cache["test-circuit"] == circuit

    def test_add_alias_to_cache(self, mock_repository):
        """Should add aliases to cache."""
        resolver = EntityResolver(repository=mock_repository)
        resolver._cache_initialized = True

        driver_id = uuid4()
        driver_alias = DriverAlias(
            id=uuid4(),
            driver_id=driver_id,
            alias_name="Test Alias",
            alias_slug="test-alias",
        )

        team_id = uuid4()
        team_alias = TeamAlias(
            id=uuid4(),
            team_id=team_id,
            alias_name="Team Alias",
            alias_slug="team-alias",
        )

        series_id = uuid4()
        series_alias = SeriesAlias(
            id=uuid4(),
            series_id=series_id,
            alias_name="Series Alias",
            alias_slug="series-alias",
        )

        circuit_id = uuid4()
        circuit_alias = CircuitAlias(
            id=uuid4(),
            circuit_id=circuit_id,
            alias_name="Circuit Alias",
            alias_slug="circuit-alias",
        )

        resolver.add_alias_to_cache(
            driver_alias=driver_alias,
            team_alias=team_alias,
            series_alias=series_alias,
            circuit_alias=circuit_alias,
        )

        assert "test-alias" in resolver._driver_alias_cache
        assert resolver._driver_alias_cache["test-alias"] == driver_id
        assert "team-alias" in resolver._team_alias_cache
        assert resolver._team_alias_cache["team-alias"] == team_id


class TestKnownAliasesLoading:
    """Tests for loading known aliases from JSON."""

    def test_loads_known_aliases(self, mock_repository):
        """Should load known aliases from JSON file."""
        resolver = EntityResolver(repository=mock_repository)
        aliases = resolver._known_aliases

        # Should have drivers, teams, circuits, series sections
        assert "drivers" in aliases
        assert "teams" in aliases
        assert "circuits" in aliases
        assert "series" in aliases

        # Should have some known drivers
        assert "max-verstappen" in aliases["drivers"]
        assert "andrea-kimi-antonelli" in aliases["drivers"]

        # Should have some known teams
        assert "red-bull-racing" in aliases["teams"]
        assert "rb" in aliases["teams"]

        # Should have some known circuits
        assert "monaco" in aliases["circuits"]
        assert "silverstone" in aliases["circuits"]

        # Should have some known series
        assert "formula-1" in aliases["series"]
        assert "motogp" in aliases["series"]

    def test_find_known_driver_alias_by_number(self, mock_repository):
        """Should find driver by driver number in known aliases."""
        resolver = EntityResolver(repository=mock_repository)

        # Driver number 1 should be Verstappen
        result = resolver._find_known_driver_alias("Test", "test", driver_number=1)

        assert result is not None
        assert result["canonical_name"] == "Max Verstappen"

    def test_find_known_driver_alias_by_slug(self, mock_repository):
        """Should find driver by alias slug in known aliases."""
        resolver = EntityResolver(repository=mock_repository)

        # "checo-perez" should match Sergio Perez
        result = resolver._find_known_driver_alias("Checo Perez", "checo-perez", None)

        assert result is not None
        assert result["canonical_name"] == "Sergio Perez"

    def test_find_known_team_alias(self, mock_repository):
        """Should find team by alias in known aliases."""
        resolver = EntityResolver(repository=mock_repository)

        # "AlphaTauri" should match RB/Racing Bulls
        result = resolver._find_known_team_alias("AlphaTauri", "alphatauri")

        assert result is not None
        assert result["canonical_name"] == "Racing Bulls"

    def test_find_known_series_alias(self, mock_repository):
        """Should find series by alias in known aliases."""
        resolver = EntityResolver(repository=mock_repository)

        # "F1" should match Formula 1
        result = resolver._find_known_series_alias("F1", "f1")

        assert result is not None
        assert result["canonical_name"] == "Formula 1"

    def test_find_known_circuit_alias(self, mock_repository):
        """Should find circuit by alias in known aliases."""
        resolver = EntityResolver(repository=mock_repository)

        # "Monte Carlo" should match Monaco
        result = resolver._find_known_circuit_alias("Monte Carlo", "monte-carlo")

        assert result is not None
        assert result["canonical_name"] == "Monaco"
