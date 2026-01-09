"""
Tests for string distance and similarity utilities.
"""

import pytest

from ingestion.matching.distance import (
    levenshtein_distance,
    normalized_levenshtein_similarity,
    jaro_similarity,
    jaro_winkler_similarity,
    damerau_levenshtein_distance,
    geo_distance_km,
    coordinate_proximity_score,
    containment_score,
)


class TestLevenshteinDistance:
    """Tests for Levenshtein (edit) distance."""
    
    def test_identical_strings(self) -> None:
        assert levenshtein_distance("hello", "hello") == 0
    
    def test_empty_strings(self) -> None:
        assert levenshtein_distance("", "") == 0
        assert levenshtein_distance("hello", "") == 5
        assert levenshtein_distance("", "world") == 5
    
    def test_single_substitution(self) -> None:
        assert levenshtein_distance("hello", "hallo") == 1
    
    def test_single_insertion(self) -> None:
        assert levenshtein_distance("hello", "helloo") == 1
    
    def test_single_deletion(self) -> None:
        assert levenshtein_distance("hello", "helo") == 1
    
    def test_multiple_edits(self) -> None:
        assert levenshtein_distance("kitten", "sitting") == 3
    
    def test_diacritics_from_ergast_import(self) -> None:
        """Test cases from Ergast import issues."""
        # Hülkenberg vs Hulkenberg - 1 substitution (ü→u)
        assert levenshtein_distance("Hulkenberg", "Hülkenberg") == 1
        
        # Pérez vs Perez
        assert levenshtein_distance("Perez", "Pérez") == 1
        
        # Räikkönen vs Raikkonen
        assert levenshtein_distance("Raikkonen", "Räikkönen") == 2


class TestNormalizedLevenshteinSimilarity:
    """Tests for normalized Levenshtein similarity."""
    
    def test_identical_strings(self) -> None:
        assert normalized_levenshtein_similarity("hello", "hello") == 1.0
    
    def test_completely_different(self) -> None:
        assert normalized_levenshtein_similarity("abc", "xyz") == 0.0
    
    def test_partial_match(self) -> None:
        # 1 edit out of 5 characters = 0.8 similarity
        result = normalized_levenshtein_similarity("hello", "hallo")
        assert result == pytest.approx(0.8)
    
    def test_empty_strings(self) -> None:
        assert normalized_levenshtein_similarity("", "") == 1.0
        assert normalized_levenshtein_similarity("hello", "") == 0.0


class TestJaroSimilarity:
    """Tests for Jaro similarity."""
    
    def test_identical_strings(self) -> None:
        assert jaro_similarity("hello", "hello") == 1.0
    
    def test_completely_different(self) -> None:
        result = jaro_similarity("abc", "xyz")
        assert result == 0.0
    
    def test_similar_strings(self) -> None:
        # MARTHA vs MARHTA should be ~0.944
        result = jaro_similarity("MARTHA", "MARHTA")
        assert result == pytest.approx(0.944, rel=0.01)
    
    def test_empty_strings(self) -> None:
        assert jaro_similarity("", "") == 1.0
        assert jaro_similarity("hello", "") == 0.0


class TestJaroWinklerSimilarity:
    """Tests for Jaro-Winkler similarity."""
    
    def test_identical_strings(self) -> None:
        assert jaro_winkler_similarity("Verstappen", "Verstappen") == 1.0
    
    def test_common_prefix_boost(self) -> None:
        # Jaro-Winkler should give higher score than Jaro for common prefix
        jaro = jaro_similarity("MARTHA", "MARHTA")
        jw = jaro_winkler_similarity("MARTHA", "MARHTA")
        assert jw > jaro
    
    def test_driver_name_variations(self) -> None:
        """Test realistic driver name scenarios."""
        # Very similar - should be high
        result = jaro_winkler_similarity("verstappen", "verstapen")
        assert result > 0.9
        
        # Same name different format
        result = jaro_winkler_similarity("max verstappen", "verstappen max")
        assert result > 0.6  # Reordering still somewhat similar


class TestDamerauLevenshteinDistance:
    """Tests for Damerau-Levenshtein distance (with transpositions)."""
    
    def test_identical_strings(self) -> None:
        assert damerau_levenshtein_distance("hello", "hello") == 0
    
    def test_transposition(self) -> None:
        # ab -> ba should be 1 (single transposition)
        assert damerau_levenshtein_distance("ab", "ba") == 1
        
        # Compare to regular Levenshtein which would be 2
        assert levenshtein_distance("ab", "ba") == 2


class TestGeoDistanceKm:
    """Tests for geographic distance calculations."""
    
    def test_same_point(self) -> None:
        result = geo_distance_km(51.5074, -0.1278, 51.5074, -0.1278)  # London
        assert result == pytest.approx(0.0, abs=0.001)
    
    def test_known_distance(self) -> None:
        # London to Paris is approximately 344 km
        london = (51.5074, -0.1278)
        paris = (48.8566, 2.3522)
        result = geo_distance_km(*london, *paris)
        assert result == pytest.approx(344, rel=0.05)  # 5% tolerance
    
    def test_circuit_same_location(self) -> None:
        # Two points on Silverstone circuit (should be < 5km)
        point1 = (52.0786, -1.0169)  # Approx Silverstone
        point2 = (52.0750, -1.0200)  # Nearby point
        result = geo_distance_km(*point1, *point2)
        assert result < 5


class TestCoordinateProximityScore:
    """Tests for coordinate proximity scoring."""
    
    def test_same_point(self) -> None:
        result = coordinate_proximity_score(51.5, -0.1, 51.5, -0.1)
        assert result == 1.0
    
    def test_beyond_max_distance(self) -> None:
        # London to Paris is ~344km, way beyond 10km default
        result = coordinate_proximity_score(51.5074, -0.1278, 48.8566, 2.3522)
        assert result == 0.0
    
    def test_missing_coordinates(self) -> None:
        assert coordinate_proximity_score(None, -0.1, 51.5, -0.1) == 0.0
        assert coordinate_proximity_score(51.5, None, 51.5, -0.1) == 0.0
        assert coordinate_proximity_score(51.5, -0.1, None, -0.1) == 0.0
        assert coordinate_proximity_score(51.5, -0.1, 51.5, None) == 0.0
    
    def test_within_range(self) -> None:
        # 5km apart with 10km max = 0.5 score
        # Using approximate coordinates 5km apart
        lat1, lon1 = 51.5074, -0.1278
        # Move roughly 5km north (about 0.045 degrees latitude)
        lat2, lon2 = 51.5524, -0.1278
        result = coordinate_proximity_score(lat1, lon1, lat2, lon2)
        assert 0.4 < result < 0.6


class TestContainmentScore:
    """Tests for string containment scoring."""
    
    def test_exact_containment(self) -> None:
        assert containment_score("Red Bull", "Oracle Red Bull Racing") == 1.0
    
    def test_reverse_containment(self) -> None:
        assert containment_score("Oracle Red Bull Racing", "Red Bull") == 1.0
    
    def test_word_overlap(self) -> None:
        # "Red Bull" and "Red Bull Racing" - 2/2 words from needle
        result = containment_score("Red Bull", "Red Bull Racing")
        assert result == 1.0  # All words match
    
    def test_partial_word_overlap(self) -> None:
        # Some words match
        result = containment_score("Red Bull Racing", "Ferrari Racing")
        assert 0.0 < result < 1.0  # Only "Racing" matches
    
    def test_no_overlap(self) -> None:
        assert containment_score("Ferrari", "Mercedes") == 0.0
    
    def test_empty_string(self) -> None:
        assert containment_score("", "Hello") == 0.0
