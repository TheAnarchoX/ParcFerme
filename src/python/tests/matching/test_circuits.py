"""
Tests for CircuitMatcher with known edge cases.
"""

import pytest
from uuid import uuid4

from ingestion.matching import (
    CircuitMatcher,
    ConfidenceLevel,
)
from ingestion.matching.circuits import (
    CircuitData,
    CircuitCandidate,
    match_circuit,
)


@pytest.fixture
def circuit_candidates() -> list[CircuitCandidate]:
    """Create test circuit candidates including edge cases from ROADMAP.md Issue 4."""
    return [
        CircuitCandidate(
            id=uuid4(),
            name="Circuit of the Americas",
            slug="circuit-of-the-americas",
            short_name="COTA",
            location="Austin",
            country="USA",
            country_code="US",
            latitude=30.1328,
            longitude=-97.6411,
        ),
        CircuitCandidate(
            id=uuid4(),
            name="Autódromo Hermanos Rodríguez",
            slug="autodromo-hermanos-rodriguez",
            short_name="Mexico City",
            location="Mexico City",
            country="Mexico",
            country_code="MX",
            latitude=19.4042,
            longitude=-99.0907,
        ),
        CircuitCandidate(
            id=uuid4(),
            name="Circuit de Monaco",
            slug="circuit-de-monaco",
            short_name="Monaco",
            location="Monte Carlo",
            country="Monaco",
            country_code="MC",
            latitude=43.7347,
            longitude=7.4206,
        ),
        CircuitCandidate(
            id=uuid4(),
            name="Silverstone Circuit",
            slug="silverstone-circuit",
            short_name="Silverstone",
            location="Silverstone",
            country="United Kingdom",
            country_code="GB",
            latitude=52.0786,
            longitude=-1.0169,
        ),
        CircuitCandidate(
            id=uuid4(),
            name="Circuit de Spa-Francorchamps",
            slug="circuit-de-spa-francorchamps",
            short_name="Spa",
            location="Stavelot",
            country="Belgium",
            country_code="BE",
            latitude=50.4372,
            longitude=5.9714,
        ),
        CircuitCandidate(
            id=uuid4(),
            name="Suzuka International Racing Course",
            slug="suzuka-international-racing-course",
            short_name="Suzuka",
            location="Suzuka",
            country="Japan",
            country_code="JP",
            latitude=34.8431,
            longitude=136.5412,
        ),
    ]


class TestCircuitMatcherExactMatch:
    """Tests for exact circuit matches."""
    
    def test_exact_name_match(self, circuit_candidates: list[CircuitCandidate]) -> None:
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Silverstone Circuit"))
        
        # Without country/coordinates, we only get 70% (name, location, fuzzy)
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Silverstone Circuit"
    
    def test_exact_with_coordinates(self, circuit_candidates: list[CircuitCandidate]) -> None:
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(
            name="Silverstone Circuit",
            latitude=52.0786,
            longitude=-1.0169,
        ))
        
        # Without country, we get 85% (name + location + fuzzy + coords, but not country)
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.score >= 0.85


class TestCircuitMatcherAbbreviations:
    """Tests for circuit abbreviation matching - edge cases from ROADMAP.md Issue 4."""
    
    def test_cota_abbreviation(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'COTA' should match 'Circuit of the Americas'."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="COTA"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)
        assert result.matched_entity.name == "Circuit of the Americas"
    
    def test_austin_city_name(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Austin' should match 'Circuit of the Americas'."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Austin"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)
        assert result.matched_entity.name == "Circuit of the Americas"
    
    def test_spa_short(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Spa' should match 'Circuit de Spa-Francorchamps'."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Spa"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)
        assert "Spa" in result.matched_entity.name
    
    def test_monte_carlo(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Monte Carlo' should match 'Circuit de Monaco'."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Monte Carlo"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)
        assert result.matched_entity.name == "Circuit de Monaco"
    
    def test_monaco_short(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Monaco' should match 'Circuit de Monaco'."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Monaco"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW)
        assert result.matched_entity.name == "Circuit de Monaco"


class TestCircuitMatcherDiacritics:
    """Tests for diacritic handling in circuit names."""
    
    def test_mexico_without_accents(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Autodromo Hermanos Rodriguez' (ASCII) should match the accented version."""
        matcher = CircuitMatcher(circuit_candidates)
        # Provide country to boost confidence above threshold
        result = matcher.match(CircuitData(
            name="Autodromo Hermanos Rodriguez",
            country="Mexico",
        ))
        
        # Now with name + country, we have enough signals for LOW+ confidence
        assert result.confidence != ConfidenceLevel.NO_MATCH
        assert "Rodríguez" in result.matched_entity.name
    
    def test_mexico_city_location(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """'Mexico City' should match the Mexican circuit."""
        matcher = CircuitMatcher(circuit_candidates)
        # Just "Mexico City" as name will match via location signal
        result = matcher.match(CircuitData(
            name="Mexico City",
            country="Mexico",  # Add country for better confidence
        ))
        
        assert result.confidence != ConfidenceLevel.NO_MATCH
        assert "Hermanos" in result.matched_entity.name


class TestCircuitMatcherLocationCity:
    """Tests for location/city-based matching."""
    
    def test_city_in_name(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Location name in incoming should match."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(
            name="Some Austin Circuit",
            country="USA",
        ))
        
        # Austin should match COTA
        location_signal = result.get_signal("location_city")
        assert location_signal is not None
    
    def test_location_field_match(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Explicit location field should match."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(
            name="Unknown Track",
            location="Suzuka",
            country="Japan",
        ))
        
        assert result.matched_entity.short_name == "Suzuka"


class TestCircuitMatcherCountry:
    """Tests for country-based matching."""
    
    def test_country_helps_disambiguate(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Country should help narrow down possibilities."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(
            name="Grand Prix Circuit",
            country="Belgium",
        ))
        
        country_signal = result.get_signal("country")
        assert country_signal is not None
        # Should favor Belgian circuit
        assert result.matched_entity.country == "Belgium"
    
    def test_country_alias_uk(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """UK/GBR/United Kingdom aliases should work."""
        matcher = CircuitMatcher(circuit_candidates)
        
        # Try with "UK" 
        result = matcher.match(CircuitData(
            name="Silverstone",
            country="UK",
        ))
        
        assert result.matched_entity.name == "Silverstone Circuit"
        country_signal = result.get_signal("country")
        assert country_signal is not None
        assert country_signal.score == 1.0
    
    def test_country_alias_usa(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """USA/US/United States aliases should work."""
        matcher = CircuitMatcher(circuit_candidates)
        
        result = matcher.match(CircuitData(
            name="Austin",
            country="United States",
        ))
        
        assert result.matched_entity.name == "Circuit of the Americas"


class TestCircuitMatcherCoordinates:
    """Tests for coordinate-based matching."""
    
    def test_exact_coordinates(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Exact coordinates should be definitive."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(
            name="Unknown Circuit",
            latitude=52.0786,
            longitude=-1.0169,
        ))
        
        coord_signal = result.get_signal("coordinates")
        assert coord_signal is not None
        assert coord_signal.score >= 0.9
        assert result.matched_entity.name == "Silverstone Circuit"
    
    def test_nearby_coordinates(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Nearby coordinates (within 10km) should match."""
        matcher = CircuitMatcher(circuit_candidates)
        
        # Slightly offset from Silverstone (about 5km)
        result = matcher.match(CircuitData(
            name="Some Circuit",
            latitude=52.08,
            longitude=-1.02,
        ))
        
        coord_signal = result.get_signal("coordinates")
        assert coord_signal is not None
        assert coord_signal.score > 0.0
    
    def test_missing_coordinates(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Missing coordinates should not cause errors."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Silverstone"))
        
        coord_signal = result.get_signal("coordinates")
        assert coord_signal is not None
        assert coord_signal.score == 0.0  # Missing data


class TestCircuitMatcherFuzzy:
    """Tests for fuzzy circuit name matching."""
    
    def test_minor_typo(self, circuit_candidates: list[CircuitCandidate]) -> None:
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Silvestone"))  # Typo
        
        assert result.matched_entity.name == "Silverstone Circuit"
    
    def test_different_prefix(self, circuit_candidates: list[CircuitCandidate]) -> None:
        """Different prefix/suffix should still match core name."""
        matcher = CircuitMatcher(circuit_candidates)
        result = matcher.match(CircuitData(name="Spa-Francorchamps Circuit"))
        
        assert "Spa" in result.matched_entity.name


class TestCircuitMatcherConvenienceFunction:
    """Tests for the match_circuit convenience function."""
    
    def test_match_circuit_found(self, circuit_candidates: list[CircuitCandidate]) -> None:
        result = match_circuit(
            CircuitData(name="Silverstone", country="UK"),  # Add country for better match
            circuit_candidates,
        )
        
        assert result is not None
        assert "Silverstone" in result.name
    
    def test_match_circuit_not_found(self, circuit_candidates: list[CircuitCandidate]) -> None:
        result = match_circuit(
            CircuitData(name="Nonexistent Raceway"),
            circuit_candidates,
        )
        
        assert result is None
    
    def test_match_circuit_empty_candidates(self) -> None:
        result = match_circuit(CircuitData(name="Silverstone"), [])
        assert result is None
