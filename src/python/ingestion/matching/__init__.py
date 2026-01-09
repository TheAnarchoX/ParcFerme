"""
Entity Matching Framework for ParcFerme ingestion.

This module provides a multi-signal confidence scoring system for matching
incoming data to existing canonical entities. It replaces the sequential
matching approach with a score-based system that handles real-world data
messiness from multiple sources (OpenF1, Ergast, community contributions).

Key components:
- MatchResult: Result of a match operation with confidence scoring
- EntityMatcher: Base class for all entity matchers
- DriverMatcher: Match drivers with signals for name, number, nationality
- TeamMatcher: Match teams with signals for name, color, era
- CircuitMatcher: Match circuits with signals for name, location, coordinates

Usage:
    from ingestion.matching import DriverMatcher, MatchResult, ConfidenceLevel

    matcher = DriverMatcher(existing_drivers)
    result = matcher.match(incoming_driver_data)
    
    if result.confidence == ConfidenceLevel.HIGH:
        # Auto-match
        pass
    elif result.confidence == ConfidenceLevel.MEDIUM:
        # Auto-match with alias creation
        pass
    elif result.confidence == ConfidenceLevel.LOW:
        # Flag for review
        pass
    else:
        # Create new entity
        pass
"""

from ingestion.matching.core import (
    ConfidenceLevel,
    MatchResult,
    MatchSignal,
    EntityMatcher,
)
from ingestion.matching.normalization import (
    normalize_name,
    normalize_team_name,
    normalize_circuit_name,
    strip_sponsor_text,
)
from ingestion.matching.distance import (
    levenshtein_distance,
    jaro_winkler_similarity,
    normalized_levenshtein_similarity,
    geo_distance_km,
)
from ingestion.matching.drivers import DriverMatcher
from ingestion.matching.teams import TeamMatcher
from ingestion.matching.circuits import CircuitMatcher
from ingestion.matching.rounds import RoundMatcher

__all__ = [
    # Core types
    "ConfidenceLevel",
    "MatchResult",
    "MatchSignal",
    "EntityMatcher",
    # Normalization
    "normalize_name",
    "normalize_team_name",
    "normalize_circuit_name",
    "strip_sponsor_text",
    # Distance/similarity utilities
    "levenshtein_distance",
    "jaro_winkler_similarity",
    "normalized_levenshtein_similarity",
    "geo_distance_km",
    # Entity matchers
    "DriverMatcher",
    "TeamMatcher",
    "CircuitMatcher",
    "RoundMatcher",
]
