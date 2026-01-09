"""
Round (race weekend) matcher with multi-signal confidence scoring.

Signals:
- Exact name match (0.25)
- Circuit match (0.25)
- Date match (0.25)
- Round number + year (0.15)
- Fuzzy name similarity (0.10)

Rounds are unique challenges because they:
1. Have sponsor names in official titles that change yearly
2. May span multiple days (weekend events)
3. Have names like "British Grand Prix" that repeat across years
4. Need year context to disambiguate
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from ingestion.matching.core import EntityMatcher, SignalConfig
from ingestion.matching.normalization import (
    normalize_name,
    normalize_grand_prix,
    strip_sponsor_text,
)
from ingestion.matching.distance import (
    jaro_winkler_similarity,
    normalized_levenshtein_similarity,
)


@dataclass
class RoundData:
    """Incoming round/event data for matching.
    
    Represents a race weekend from a data source.
    """
    name: str  # May include sponsor names
    year: int
    round_number: int | None = None
    circuit_id: UUID | None = None  # If already resolved
    circuit_name: str | None = None  # For matching if circuit not resolved
    date_start: date | None = None
    date_end: date | None = None
    country: str | None = None  # Helps with circuit matching


@dataclass
class RoundCandidate:
    """A round entity from the database to match against."""
    id: UUID
    name: str
    slug: str
    season_id: UUID
    season_year: int
    round_number: int
    circuit_id: UUID
    circuit_name: str | None = None
    date_start: date | None = None
    date_end: date | None = None


class RoundMatcher(EntityMatcher[RoundCandidate, RoundData]):
    """Match incoming round data against existing rounds.
    
    Signal weights (total = 1.0):
    - exact_name: 0.25 - Name match after stripping sponsors
    - circuit: 0.25 - Same circuit is very strong signal
    - date: 0.25 - Date proximity is definitive
    - round_number_year: 0.15 - Round X of Year Y
    - fuzzy_similarity: 0.10 - Catches naming variations
    
    Challenges handled:
    - "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025" vs "Chinese Grand Prix"
    - Same race name across different years
    - Sprint weekend vs regular weekend naming variations
    - Pre-season testing events
    
    Example usage:
        candidates = [
            RoundCandidate(id=..., name="Chinese Grand Prix", season_year=2025, ...),
            RoundCandidate(id=..., name="Japanese Grand Prix", season_year=2025, ...),
        ]
        matcher = RoundMatcher(candidates)
        
        result = matcher.match(RoundData(
            name="FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025",
            year=2025,
            round_number=4,
        ))
        print(result.confidence)  # ConfidenceLevel.HIGH
    """
    
    def _configure_signals(self) -> list[SignalConfig]:
        """Configure round matching signals."""
        return [
            SignalConfig("exact_name", 0.25, self._check_exact_name),
            SignalConfig("circuit", 0.25, self._check_circuit),
            SignalConfig("date", 0.25, self._check_date),
            SignalConfig("round_number_year", 0.15, self._check_round_number_year),
            SignalConfig("fuzzy_similarity", 0.10, self._check_fuzzy_similarity),
        ]
    
    def _extract_id(self, entity: RoundCandidate) -> UUID:
        """Extract round ID."""
        return entity.id
    
    def _pre_filter(self, entity: RoundCandidate) -> bool:
        """Quick rejection filter based on year."""
        if not self._incoming_data:
            return True
        
        # Year must match (rounds are year-specific)
        if entity.season_year != self._incoming_data.year:
            return False
        
        # Exact circuit ID match is an easy pass
        if (self._incoming_data.circuit_id and 
            entity.circuit_id == self._incoming_data.circuit_id):
            return True
        
        # Date overlap check (if dates available)
        if self._incoming_data.date_start and entity.date_start:
            # Allow 7 days tolerance for calendar shifts
            date_diff = abs((self._incoming_data.date_start - entity.date_start).days)
            if date_diff <= 7:
                return True
        
        # Name similarity check
        incoming_clean = normalize_grand_prix(self._incoming_data.name)
        candidate_clean = normalize_grand_prix(entity.name)
        
        # Word overlap
        incoming_words = set(incoming_clean.lower().split())
        candidate_words = set(candidate_clean.lower().split())
        if incoming_words & candidate_words:
            return True
        
        # Fuzzy similarity
        incoming_norm = normalize_name(incoming_clean)
        candidate_norm = normalize_name(candidate_clean)
        similarity = jaro_winkler_similarity(incoming_norm, candidate_norm)
        return similarity > 0.5
    
    def _check_exact_name(self, entity: RoundCandidate) -> tuple[bool, float, str | None]:
        """Check for exact name match after stripping sponsors."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Clean both names of sponsor text
        incoming_clean = normalize_grand_prix(self._incoming_data.name)
        candidate_clean = normalize_grand_prix(entity.name)
        
        # Normalize for comparison
        incoming_norm = normalize_name(incoming_clean)
        candidate_norm = normalize_name(candidate_clean)
        
        # Exact match
        if incoming_norm == candidate_norm:
            return (True, 1.0, f"'{incoming_clean}' exact match")
        
        # Check if one contains the other
        if incoming_norm in candidate_norm:
            return (True, 0.8, f"'{incoming_clean}' contained in '{candidate_clean}'")
        if candidate_norm in incoming_norm:
            return (True, 0.8, f"'{candidate_clean}' contained in '{incoming_clean}'")
        
        return (False, 0.0, f"'{incoming_clean}' != '{candidate_clean}'")
    
    def _check_circuit(self, entity: RoundCandidate) -> tuple[bool, float, str | None]:
        """Check for circuit match."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Direct ID match is definitive
        if self._incoming_data.circuit_id:
            if self._incoming_data.circuit_id == entity.circuit_id:
                return (True, 1.0, "Circuit ID match")
            else:
                return (False, 0.0, "Circuit ID mismatch")
        
        # Name-based matching if no ID
        if self._incoming_data.circuit_name and entity.circuit_name:
            incoming_norm = normalize_name(self._incoming_data.circuit_name)
            candidate_norm = normalize_name(entity.circuit_name)
            
            if incoming_norm == candidate_norm:
                return (True, 1.0, f"Circuit name match: {entity.circuit_name}")
            
            # Fuzzy match for circuit names
            similarity = jaro_winkler_similarity(incoming_norm, candidate_norm)
            if similarity > 0.85:
                return (True, similarity, f"Circuit fuzzy match: {similarity:.2f}")
        
        # No circuit info to compare
        return (False, 0.0, "No circuit info to compare")
    
    def _check_date(self, entity: RoundCandidate) -> tuple[bool, float, str | None]:
        """Check for date proximity."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        if not self._incoming_data.date_start or not entity.date_start:
            return (False, 0.0, "No date info to compare")
        
        # Calculate days difference
        date_diff = abs((self._incoming_data.date_start - entity.date_start).days)
        
        # Exact date match
        if date_diff == 0:
            return (True, 1.0, f"Exact date match: {entity.date_start}")
        
        # Within 1-2 days (same weekend)
        if date_diff <= 2:
            return (True, 0.9, f"Same weekend: {date_diff} days apart")
        
        # Within a week (could be rescheduled)
        if date_diff <= 7:
            score = 0.8 - (date_diff - 2) * 0.1
            return (True, max(score, 0.4), f"Within week: {date_diff} days apart")
        
        # More than a week apart
        return (False, 0.0, f"Too far apart: {date_diff} days")
    
    def _check_round_number_year(self, entity: RoundCandidate) -> tuple[bool, float, str | None]:
        """Check for round number and year match."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Year is already checked in pre_filter, but confirm
        if entity.season_year != self._incoming_data.year:
            return (False, 0.0, f"Year mismatch: {entity.season_year} vs {self._incoming_data.year}")
        
        # Round number match
        if self._incoming_data.round_number is not None:
            if entity.round_number == self._incoming_data.round_number:
                return (True, 1.0, f"Round {entity.round_number} of {entity.season_year}")
            
            # Adjacent round numbers (off by one)
            if abs(entity.round_number - self._incoming_data.round_number) == 1:
                return (True, 0.5, f"Adjacent round: {entity.round_number} vs {self._incoming_data.round_number}")
            
            return (False, 0.2, f"Round mismatch: {entity.round_number} vs {self._incoming_data.round_number}")
        
        # No round number, just year match
        return (True, 0.4, f"Year match only: {entity.season_year}")
    
    def _check_fuzzy_similarity(self, entity: RoundCandidate) -> tuple[bool, float, str | None]:
        """Check fuzzy name similarity."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Clean and normalize names
        incoming_clean = normalize_grand_prix(self._incoming_data.name)
        candidate_clean = normalize_grand_prix(entity.name)
        
        incoming_norm = normalize_name(incoming_clean)
        candidate_norm = normalize_name(candidate_clean)
        
        # Calculate similarity using Jaro-Winkler
        jw_sim = jaro_winkler_similarity(incoming_norm, candidate_norm)
        
        # Also calculate Levenshtein similarity
        lev_sim = normalized_levenshtein_similarity(incoming_norm, candidate_norm)
        
        # Use the higher of the two
        similarity = max(jw_sim, lev_sim)
        
        if similarity >= 0.9:
            return (True, 1.0, f"Very high similarity: {similarity:.2f}")
        elif similarity >= 0.7:
            return (True, similarity, f"Good similarity: {similarity:.2f}")
        elif similarity >= 0.5:
            return (True, similarity * 0.8, f"Moderate similarity: {similarity:.2f}")
        else:
            return (False, similarity, f"Low similarity: {similarity:.2f}")


def find_best_round_match(
    incoming: RoundData,
    candidates: list[RoundCandidate],
) -> tuple[RoundCandidate | None, float, list[dict]]:
    """Find the best matching round from candidates.
    
    Convenience function for one-off matching without creating a matcher.
    
    Args:
        incoming: Incoming round data
        candidates: List of candidate rounds
        
    Returns:
        Tuple of (best_match, score, signals)
    """
    if not candidates:
        return (None, 0.0, [])
    
    matcher = RoundMatcher(candidates)
    result = matcher.match(incoming)
    
    signals = [
        {
            "name": s.name,
            "weight": s.weight,
            "score": s.score,
            "matched": s.matched,
            "raw_score": s.raw_score,
            "details": s.details,
        }
        for s in result.signals
    ]
    
    return (result.matched_entity, result.score, signals)
