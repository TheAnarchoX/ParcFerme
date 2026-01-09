"""
Circuit matcher with multi-signal confidence scoring.

Signals:
- Exact name match (0.30)
- Location/city match (0.25)
- Country match (0.15)
- Fuzzy similarity (0.15)
- Coordinates proximity (0.15)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from ingestion.matching.core import EntityMatcher, SignalConfig
from ingestion.matching.normalization import (
    normalize_name,
    normalize_circuit_name,
    expand_circuit_abbreviation,
    CIRCUIT_ABBREVIATIONS,
)
from ingestion.matching.distance import (
    jaro_winkler_similarity,
    normalized_levenshtein_similarity,
    coordinate_proximity_score,
    containment_score,
)


@dataclass
class CircuitData:
    """Incoming circuit data for matching.
    
    All fields except name are optional.
    """
    name: str
    short_name: str | None = None
    location: str | None = None  # City name
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@dataclass
class CircuitCandidate:
    """A circuit entity from the database to match against."""
    id: UUID
    name: str
    slug: str
    short_name: str | None = None
    location: str | None = None  # City name
    country: str | None = None
    country_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class CircuitMatcher(EntityMatcher[CircuitCandidate, CircuitData]):
    """Match incoming circuit data against existing circuits.
    
    Signal weights (total = 1.0):
    - exact_name: 0.30 - Exact match is highly reliable
    - location_city: 0.25 - City name is very distinctive
    - country: 0.15 - Helps narrow down
    - fuzzy_similarity: 0.15 - Catches variations in naming
    - coordinates: 0.15 - Geographic proximity is definitive
    
    Handles complex scenarios:
    - "Circuit of the Americas" vs "COTA" vs "Austin"
    - "Autódromo Hermanos Rodríguez" vs "Mexico City" vs "Mexican Grand Prix"
    - "Circuit de Monaco" vs "Monte Carlo Street Circuit" vs "Monaco"
    
    Example usage:
        candidates = [
            CircuitCandidate(id=..., name="Circuit of the Americas", location="Austin", ...),
            CircuitCandidate(id=..., name="Silverstone Circuit", location="Silverstone", ...),
        ]
        matcher = CircuitMatcher(candidates)
        
        result = matcher.match(CircuitData(name="COTA", country="USA"))
        print(result.confidence)  # ConfidenceLevel.HIGH
    """
    
    def _configure_signals(self) -> list[SignalConfig]:
        """Configure circuit matching signals."""
        return [
            SignalConfig("exact_name", 0.30, self._check_exact_name),
            SignalConfig("location_city", 0.25, self._check_location_city),
            SignalConfig("country", 0.15, self._check_country),
            SignalConfig("fuzzy_similarity", 0.15, self._check_fuzzy_similarity),
            SignalConfig("coordinates", 0.15, self._check_coordinates),
        ]
    
    def _extract_id(self, entity: CircuitCandidate) -> UUID:
        """Extract circuit ID."""
        return entity.id
    
    def _pre_filter(self, entity: CircuitCandidate) -> bool:
        """Quick rejection filter."""
        if not self._incoming_data:
            return True
        
        # If coordinates are very close, include
        if (self._incoming_data.latitude and self._incoming_data.longitude and
            entity.latitude and entity.longitude):
            score = coordinate_proximity_score(
                self._incoming_data.latitude, self._incoming_data.longitude,
                entity.latitude, entity.longitude,
                max_distance_km=50.0,  # More lenient for pre-filter
            )
            if score > 0.5:
                return True
        
        # Country check
        if self._incoming_data.country and entity.country:
            incoming_country = normalize_name(self._incoming_data.country)
            candidate_country = normalize_name(entity.country)
            if incoming_country == candidate_country:
                return True
        
        # Normalize names
        incoming_norm = normalize_circuit_name(self._incoming_data.name)
        candidate_norm = normalize_circuit_name(entity.name)
        
        # Check abbreviation expansion
        expanded = expand_circuit_abbreviation(self._incoming_data.name)
        if expanded:
            expanded_norm = normalize_circuit_name(expanded)
            if expanded_norm in candidate_norm or candidate_norm in expanded_norm:
                return True
        
        # Word overlap check
        incoming_words = set(incoming_norm.split())
        candidate_words = set(candidate_norm.split())
        
        if incoming_words & candidate_words:
            return True
        
        # Fuzzy check
        similarity = jaro_winkler_similarity(incoming_norm, candidate_norm)
        return similarity > 0.4
    
    def _check_exact_name(self, entity: CircuitCandidate) -> tuple[bool, float, str | None]:
        """Check for exact name match after normalization."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Try raw normalized match
        incoming_raw = normalize_name(self._incoming_data.name)
        candidate_raw = normalize_name(entity.name)
        
        if incoming_raw == candidate_raw:
            return (True, 1.0, f"Exact match: {entity.name}")
        
        # Try circuit-specific normalization
        incoming_norm = normalize_circuit_name(self._incoming_data.name)
        candidate_norm = normalize_circuit_name(entity.name)
        
        if incoming_norm == candidate_norm:
            return (True, 0.95, f"Exact normalized match: {entity.name}")
        
        # Check abbreviation expansion
        expanded = expand_circuit_abbreviation(self._incoming_data.name)
        if expanded:
            expanded_norm = normalize_circuit_name(expanded)
            if expanded_norm == candidate_norm:
                return (True, 0.9, f"Abbreviation match: {self._incoming_data.name} → {entity.name}")
        
        # Check if candidate has known abbreviation matching incoming
        for full_name, abbreviations in CIRCUIT_ABBREVIATIONS.items():
            full_norm = normalize_circuit_name(full_name)
            if candidate_norm == full_norm:
                # Candidate is a known circuit - check if incoming matches any alias
                if incoming_norm in [normalize_name(a) for a in abbreviations]:
                    return (True, 0.9, f"Known alias match: {entity.name}")
        
        # Short name match
        if self._incoming_data.short_name and entity.short_name:
            if normalize_name(self._incoming_data.short_name) == normalize_name(entity.short_name):
                return (True, 0.85, f"Short name match: {entity.short_name}")
        
        return (False, 0.0, "No exact match")
    
    def _check_location_city(self, entity: CircuitCandidate) -> tuple[bool, float, str | None]:
        """Check if location/city matches.
        
        Very important signal - city names are distinctive.
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Check incoming name against candidate location
        incoming_norm = normalize_name(self._incoming_data.name)
        candidate_location = normalize_name(entity.location or "")
        
        if candidate_location and candidate_location in incoming_norm:
            return (True, 1.0, f"Location in name: {entity.location}")
        
        # Check incoming location against candidate location
        if self._incoming_data.location:
            incoming_location = normalize_name(self._incoming_data.location)
            
            if incoming_location == candidate_location:
                return (True, 1.0, f"Exact location match: {entity.location}")
            
            if candidate_location and (
                incoming_location in candidate_location or
                candidate_location in incoming_location
            ):
                return (True, 0.9, f"Location containment: {entity.location}")
            
            # Fuzzy location match
            if candidate_location:
                similarity = jaro_winkler_similarity(incoming_location, candidate_location)
                if similarity >= 0.85:
                    return (True, similarity, f"Similar location ({similarity:.2f})")
        
        # Check if incoming name is a known location alias
        for full_name, abbreviations in CIRCUIT_ABBREVIATIONS.items():
            if entity.name.lower() in full_name.lower() or full_name.lower() in entity.name.lower():
                # Check if incoming matches a location alias
                if incoming_norm in [normalize_name(a) for a in abbreviations]:
                    return (True, 0.85, f"Location alias: {self._incoming_data.name}")
        
        return (False, 0.0, "No location match")
    
    def _check_country(self, entity: CircuitCandidate) -> tuple[bool, float, str | None]:
        """Check if country matches."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_country = self._incoming_data.country
        
        if not incoming_country:
            return (False, 0.0, "No country data in incoming")
        
        candidate_country = entity.country
        candidate_code = entity.country_code
        
        if not candidate_country and not candidate_code:
            return (False, 0.0, "No country data in candidate")
        
        incoming_norm = normalize_name(incoming_country)
        
        # Check against full country name
        if candidate_country:
            candidate_norm = normalize_name(candidate_country)
            if incoming_norm == candidate_norm:
                return (True, 1.0, f"Country match: {candidate_country}")
        
        # Check against country code
        if candidate_code:
            code_norm = normalize_name(candidate_code)
            if incoming_norm == code_norm:
                return (True, 1.0, f"Country code match: {candidate_code}")
        
        # Handle common country variations
        country_aliases = {
            "usa": ["united states", "us", "america", "united states of america"],
            "uk": ["united kingdom", "gb", "gbr", "great britain", "britain", "england"],
            "uae": ["united arab emirates", "abu dhabi", "dubai"],
            "netherlands": ["holland", "ned", "nl"],
            "korea": ["south korea", "kor", "republic of korea"],
        }
        
        for canonical, aliases in country_aliases.items():
            all_variants = [canonical] + aliases
            all_norm = [normalize_name(v) for v in all_variants]
            
            candidate_matches = (
                (candidate_country and normalize_name(candidate_country) in all_norm) or
                (candidate_code and normalize_name(candidate_code) in all_norm)
            )
            incoming_matches = incoming_norm in all_norm
            
            if candidate_matches and incoming_matches:
                return (True, 1.0, f"Country alias match: {entity.country}")
        
        return (False, 0.0, f"No match: {incoming_country}")
    
    def _check_fuzzy_similarity(self, entity: CircuitCandidate) -> tuple[bool, float, str | None]:
        """Check fuzzy string similarity."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_norm = normalize_circuit_name(self._incoming_data.name)
        candidate_norm = normalize_circuit_name(entity.name)
        
        if not incoming_norm or not candidate_norm:
            return (False, 0.0, "Missing name data")
        
        # Also try with short names
        scores = [jaro_winkler_similarity(incoming_norm, candidate_norm)]
        
        if entity.short_name:
            short_norm = normalize_name(entity.short_name)
            scores.append(jaro_winkler_similarity(incoming_norm, short_norm))
        
        if self._incoming_data.short_name:
            incoming_short = normalize_name(self._incoming_data.short_name)
            scores.append(jaro_winkler_similarity(incoming_short, candidate_norm))
        
        similarity = max(scores)
        
        if similarity >= 0.95:
            return (True, 1.0, f"Very high similarity: {similarity:.3f}")
        elif similarity >= 0.85:
            return (True, similarity, f"High similarity: {similarity:.3f}")
        elif similarity >= 0.7:
            return (False, similarity * 0.7, f"Moderate similarity: {similarity:.3f}")
        else:
            return (False, 0.0, f"Low similarity: {similarity:.3f}")
    
    def _check_coordinates(self, entity: CircuitCandidate) -> tuple[bool, float, str | None]:
        """Check geographic proximity using coordinates.
        
        Circuits are at fixed locations, so coordinate matching is definitive.
        Max distance of 10km accounts for different points on the same circuit.
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_lat = self._incoming_data.latitude
        incoming_lon = self._incoming_data.longitude
        candidate_lat = entity.latitude
        candidate_lon = entity.longitude
        
        if not all([incoming_lat, incoming_lon, candidate_lat, candidate_lon]):
            return (False, 0.0, "Missing coordinate data")
        
        score = coordinate_proximity_score(
            incoming_lat, incoming_lon,
            candidate_lat, candidate_lon,
            max_distance_km=10.0,
        )
        
        if score >= 0.95:
            return (True, 1.0, f"Very close coordinates (< 500m)")
        elif score >= 0.7:
            return (True, score, f"Close coordinates: {score:.2f}")
        elif score > 0:
            return (False, score * 0.5, f"Within range: {score:.2f}")
        else:
            return (False, 0.0, "Too far apart (> 10km)")


# Known circuit aliases and variations
CIRCUIT_LOCATION_MAPPINGS = {
    # Circuit name -> possible location references
    "circuit of the americas": ["austin", "cota", "texas"],
    "autódromo hermanos rodríguez": ["mexico city", "mexico"],
    "circuit de monaco": ["monte carlo", "monaco"],
    "marina bay street circuit": ["singapore", "marina bay"],
    "yas marina circuit": ["abu dhabi", "yas island"],
    "jeddah corniche circuit": ["jeddah", "saudi arabia"],
    "bahrain international circuit": ["sakhir", "bahrain"],
    "albert park circuit": ["melbourne", "albert park"],
    "suzuka international racing course": ["suzuka", "japan"],
    "circuit de spa-francorchamps": ["spa", "spa-francorchamps", "belgium"],
}


# Convenience function
def match_circuit(
    incoming: CircuitData,
    candidates: list[CircuitCandidate],
) -> CircuitCandidate | None:
    """Quick helper to find best circuit match above threshold.
    
    Args:
        incoming: Circuit data to match
        candidates: List of candidate circuits
        
    Returns:
        Best matching circuit or None if no good match
    """
    if not candidates:
        return None
    
    matcher = CircuitMatcher(candidates)
    result = matcher.match(incoming)
    
    if result.confidence in (result.confidence.HIGH, result.confidence.MEDIUM):
        return result.matched_entity
    
    return None
