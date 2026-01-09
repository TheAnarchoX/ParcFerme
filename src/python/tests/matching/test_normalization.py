"""
Tests for name normalization utilities.
"""

import pytest

from ingestion.matching.normalization import (
    normalize_name,
    normalize_for_slug,
    strip_sponsor_text,
    normalize_grand_prix,
    normalize_team_name,
    normalize_circuit_name,
    expand_circuit_abbreviation,
    extract_name_parts,
)


class TestNormalizeName:
    """Tests for Unicode/diacritics normalization."""
    
    def test_basic_lowercase(self) -> None:
        assert normalize_name("Max Verstappen") == "max verstappen"
    
    def test_preserves_spaces(self) -> None:
        assert normalize_name("Max  Verstappen") == "max  verstappen"
    
    def test_strips_whitespace(self) -> None:
        assert normalize_name("  Max Verstappen  ") == "max verstappen"
    
    # Known edge cases from Ergast import
    def test_hulkenberg_umlaut(self) -> None:
        """Hülkenberg → Hulkenberg (from ROADMAP.md Issue 1)."""
        assert normalize_name("Nico Hülkenberg") == "nico hulkenberg"
    
    def test_perez_accent(self) -> None:
        """Pérez → Perez (from ROADMAP.md Issue 1)."""
        assert normalize_name("Sergio Pérez") == "sergio perez"
    
    def test_raikkonen_umlauts(self) -> None:
        """Räikkönen → Raikkonen (from ROADMAP.md Issue 1)."""
        assert normalize_name("Kimi Räikkönen") == "kimi raikkonen"
    
    def test_gutierrez_accent(self) -> None:
        """Gutiérrez → Gutierrez."""
        assert normalize_name("Esteban Gutiérrez") == "esteban gutierrez"
    
    def test_vergne_accent(self) -> None:
        """Jean-Éric Vergne → jean-eric vergne."""
        assert normalize_name("Jean-Éric Vergne") == "jean-eric vergne"
    
    def test_multiple_diacritics(self) -> None:
        """Test name with multiple diacritics."""
        assert normalize_name("Sébastien Ogier") == "sebastien ogier"
    
    def test_already_normalized(self) -> None:
        """Already ASCII should be unchanged."""
        assert normalize_name("max verstappen") == "max verstappen"


class TestNormalizeForSlug:
    """Tests for slug normalization."""
    
    def test_basic_slug(self) -> None:
        assert normalize_for_slug("Max Verstappen") == "max-verstappen"
    
    def test_removes_special_chars(self) -> None:
        assert normalize_for_slug("McLaren F1 Team") == "mclaren-f1-team"
    
    def test_diacritics_and_slug(self) -> None:
        assert normalize_for_slug("Nico Hülkenberg") == "nico-hulkenberg"
    
    def test_consecutive_hyphens(self) -> None:
        assert normalize_for_slug("Red  Bull   Racing") == "red-bull-racing"


class TestStripSponsorText:
    """Tests for sponsor text removal from event names."""
    
    def test_full_f1_name(self) -> None:
        """Test case from ROADMAP.md Issue 5."""
        result = strip_sponsor_text("FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025")
        assert result == "Chinese Grand Prix"
    
    def test_lenovo_sponsor(self) -> None:
        result = strip_sponsor_text("FORMULA 1 LENOVO JAPANESE GRAND PRIX 2025")
        assert result == "Japanese Grand Prix"
    
    def test_aramco_sponsor(self) -> None:
        result = strip_sponsor_text("FORMULA 1 ARAMCO BRITISH GRAND PRIX 2025")
        assert result == "British Grand Prix"
    
    def test_multiple_sponsors(self) -> None:
        result = strip_sponsor_text("FORMULA 1 EMIRATES ROLEX AUSTRALIAN GRAND PRIX 2025")
        # Should strip all sponsors
        assert "emirates" not in result.lower()
        assert "rolex" not in result.lower()
    
    def test_no_sponsors(self) -> None:
        result = strip_sponsor_text("Monaco Grand Prix")
        assert result == "Monaco Grand Prix"
    
    def test_formula_one_variations(self) -> None:
        assert "formula" not in strip_sponsor_text("Formula One Australian Grand Prix").lower()
        assert "f1" not in strip_sponsor_text("F1 Australian Grand Prix").lower()


class TestNormalizeGrandPrix:
    """Tests for Grand Prix name normalization."""
    
    def test_gp_prefix(self) -> None:
        assert normalize_grand_prix("GP de Monaco") == "Monaco Grand Prix"
    
    def test_gran_premio(self) -> None:
        result = normalize_grand_prix("Gran Premio de España")
        assert "grand prix" in result.lower()
    
    def test_already_normalized(self) -> None:
        result = normalize_grand_prix("Japanese Grand Prix")
        assert result == "Japanese Grand Prix"
    
    def test_strips_sponsors_too(self) -> None:
        result = normalize_grand_prix("FORMULA 1 HEINEKEN DUTCH GRAND PRIX 2025")
        assert "heineken" not in result.lower()
        assert "formula" not in result.lower()


class TestNormalizeTeamName:
    """Tests for team name normalization."""
    
    def test_oracle_red_bull(self) -> None:
        """Test case from ROADMAP.md Issue 3."""
        result = normalize_team_name("Oracle Red Bull Racing")
        assert "oracle" not in result
        assert "red bull" in result
    
    def test_scuderia_ferrari(self) -> None:
        """Test case from ROADMAP.md Issue 3."""
        result = normalize_team_name("Scuderia Ferrari Mission Winnow")
        assert "scuderia" not in result
        assert "mission winnow" not in result
        assert "ferrari" in result
    
    def test_mclaren_f1_team(self) -> None:
        result = normalize_team_name("McLaren F1 Team")
        assert "f1 team" not in result
        assert "mclaren" in result
    
    def test_plain_name(self) -> None:
        result = normalize_team_name("Ferrari")
        assert result == "ferrari"
    
    def test_visa_cash_app_rb(self) -> None:
        result = normalize_team_name("Visa Cash App RB F1 Team")
        # Should strip sponsor prefix
        assert "visa cash app" not in result


class TestNormalizeCircuitName:
    """Tests for circuit name normalization."""
    
    def test_autodromo(self) -> None:
        """Test case from ROADMAP.md Issue 4."""
        result = normalize_circuit_name("Autódromo Hermanos Rodríguez")
        assert "autodromo" not in result
        assert "rodriguez" in result  # Diacritics stripped
    
    def test_circuit_prefix(self) -> None:
        result = normalize_circuit_name("Circuit of the Americas")
        assert "circuit" not in result
        assert "americas" in result
    
    def test_silverstone_suffix(self) -> None:
        result = normalize_circuit_name("Silverstone Circuit")
        assert "circuit" not in result
        assert "silverstone" in result
    
    def test_international_circuit(self) -> None:
        result = normalize_circuit_name("Bahrain International Circuit")
        assert "international circuit" not in result
        assert "bahrain" in result
    
    def test_plain_name(self) -> None:
        result = normalize_circuit_name("Spa-Francorchamps")
        assert result == "spa-francorchamps"


class TestExpandCircuitAbbreviation:
    """Tests for circuit abbreviation expansion."""
    
    def test_cota(self) -> None:
        """Test case from ROADMAP.md Issue 4."""
        result = expand_circuit_abbreviation("COTA")
        assert result is not None
        assert "americas" in result.lower()
    
    def test_austin(self) -> None:
        result = expand_circuit_abbreviation("Austin")
        assert result is not None
        assert "americas" in result.lower()
    
    def test_spa(self) -> None:
        result = expand_circuit_abbreviation("Spa")
        assert result is not None
        assert "spa-francorchamps" in result.lower()
    
    def test_unknown_abbreviation(self) -> None:
        result = expand_circuit_abbreviation("XYZ")
        assert result is None
    
    def test_melbourne(self) -> None:
        result = expand_circuit_abbreviation("Melbourne")
        assert result is not None
        assert "albert park" in result.lower()


class TestExtractNameParts:
    """Tests for extracting first/last name from full name."""
    
    def test_simple_name(self) -> None:
        first, last = extract_name_parts("Max Verstappen")
        assert first == "Max"
        assert last == "Verstappen"
    
    def test_multiple_first_names(self) -> None:
        first, last = extract_name_parts("Charles Leclerc")
        assert first == "Charles"
        assert last == "Leclerc"
    
    def test_hyphenated_last_name(self) -> None:
        first, last = extract_name_parts("Jean-Éric Vergne")
        assert first == "Jean-Éric"
        assert last == "Vergne"
    
    def test_suffix_sr(self) -> None:
        first, last = extract_name_parts("Carlos Sainz Sr")
        assert first == "Carlos"
        assert last == "Sainz"
    
    def test_suffix_jr(self) -> None:
        first, last = extract_name_parts("Carlos Sainz Jr")
        assert first == "Carlos"
        assert last == "Sainz"
    
    def test_comma_format(self) -> None:
        first, last = extract_name_parts("Verstappen, Max")
        assert first == "Max"
        assert last == "Verstappen"
    
    def test_single_name(self) -> None:
        first, last = extract_name_parts("Pelé")
        assert first == ""
        assert last == "Pelé"
