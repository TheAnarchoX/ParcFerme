"""
Driver matcher with multi-signal confidence scoring.

Signals:
- Exact last name match (0.30)
- First name match (0.20)
- Driver number with date bounds (0.15)
- Abbreviation match (0.15)
- Nationality match (0.10)
- Fuzzy similarity (0.10)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

from ingestion.matching.core import EntityMatcher, SignalConfig
from ingestion.matching.normalization import normalize_name, extract_name_parts
from ingestion.matching.distance import (
    jaro_winkler_similarity,
    normalized_levenshtein_similarity,
)


@dataclass
class DriverData:
    """Incoming driver data for matching.
    
    All fields are optional except full_name.
    Matchers will use available data to score matches.
    """
    full_name: str
    first_name: str | None = None
    last_name: str | None = None
    driver_number: int | None = None
    abbreviation: str | None = None  # e.g., "VER", "HAM"
    nationality: str | None = None
    date_context: date | None = None  # For time-bounded number matching
    
    def __post_init__(self) -> None:
        """Extract name parts if not provided."""
        if not self.first_name or not self.last_name:
            first, last = extract_name_parts(self.full_name)
            self.first_name = self.first_name or first
            self.last_name = self.last_name or last


@dataclass
class DriverCandidate:
    """A driver entity from the database to match against.
    
    This should be populated from the Driver model or database records.
    """
    id: UUID
    first_name: str
    last_name: str
    slug: str
    driver_number: int | None = None
    abbreviation: str | None = None
    nationality: str | None = None
    # For time-bounded matching (e.g., historical numbers)
    number_valid_from: date | None = None
    number_valid_until: date | None = None


class DriverMatcher(EntityMatcher[DriverCandidate, DriverData]):
    """Match incoming driver data against existing drivers.
    
    Signal weights (total = 1.0):
    - last_name: 0.30 - Exact last name is most distinctive
    - first_name: 0.20 - First name helps disambiguate
    - driver_number: 0.15 - Strong signal but can change/be reused
    - abbreviation: 0.15 - Official 3-letter code
    - nationality: 0.10 - Helps disambiguate similar names
    - fuzzy_similarity: 0.10 - Catches typos and variations
    
    Example usage:
        candidates = [
            DriverCandidate(id=..., first_name="Max", last_name="Verstappen", ...),
            DriverCandidate(id=..., first_name="Sergio", last_name="Pérez", ...),
        ]
        matcher = DriverMatcher(candidates)
        
        result = matcher.match(DriverData(
            full_name="Sergio Perez",  # ASCII version
            driver_number=11,
        ))
        
        print(result.confidence)  # ConfidenceLevel.HIGH
        print(result.matched_entity.last_name)  # "Pérez"
    """
    
    def _configure_signals(self) -> list[SignalConfig]:
        """Configure driver matching signals."""
        return [
            SignalConfig("last_name", 0.30, self._check_last_name),
            SignalConfig("first_name", 0.20, self._check_first_name),
            SignalConfig("driver_number", 0.15, self._check_driver_number),
            SignalConfig("abbreviation", 0.15, self._check_abbreviation),
            SignalConfig("nationality", 0.10, self._check_nationality),
            SignalConfig("fuzzy_similarity", 0.10, self._check_fuzzy_similarity),
        ]
    
    def _extract_id(self, entity: DriverCandidate) -> UUID:
        """Extract driver ID."""
        return entity.id
    
    def _pre_filter(self, entity: DriverCandidate) -> bool:
        """Quick rejection: no point scoring if names are completely different."""
        if not self._incoming_data:
            return True
        
        # If we have a driver number and it matches exactly, include
        if (self._incoming_data.driver_number is not None and 
            entity.driver_number == self._incoming_data.driver_number):
            return True
        
        # Check if normalized last names share any characters
        incoming_last = normalize_name(self._incoming_data.last_name or "")
        candidate_last = normalize_name(entity.last_name)
        
        # If first character matches, include (common family names)
        if incoming_last and candidate_last and incoming_last[0] == candidate_last[0]:
            return True
        
        # If we have abbreviation match, include
        if (self._incoming_data.abbreviation and 
            entity.abbreviation and
            self._incoming_data.abbreviation.upper() == entity.abbreviation.upper()):
            return True
        
        # Otherwise, use Jaro-Winkler quick check
        if incoming_last and candidate_last:
            similarity = jaro_winkler_similarity(incoming_last, candidate_last)
            return similarity > 0.5
        
        return True  # Include if we can't determine
    
    def _check_last_name(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check last name match.
        
        Returns:
            (matched, score, details) where score is:
            - 1.0 for exact match (after normalization)
            - 0.7-0.99 for fuzzy match
            - 0.0 for no match
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming = normalize_name(self._incoming_data.last_name or "")
        candidate = normalize_name(entity.last_name)
        
        if not incoming or not candidate:
            return (False, 0.0, "Missing last name")
        
        # Exact match
        if incoming == candidate:
            return (True, 1.0, f"Exact match: {entity.last_name}")
        
        # Fuzzy match using Jaro-Winkler (good for names)
        similarity = jaro_winkler_similarity(incoming, candidate)
        
        if similarity >= 0.9:
            return (True, similarity, f"Near match ({similarity:.2f}): {entity.last_name}")
        elif similarity >= 0.7:
            return (False, similarity * 0.8, f"Partial match ({similarity:.2f}): {entity.last_name}")
        else:
            return (False, 0.0, f"No match ({similarity:.2f})")
    
    def _check_first_name(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check first name match."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming = normalize_name(self._incoming_data.first_name or "")
        candidate = normalize_name(entity.first_name)
        
        if not incoming or not candidate:
            return (False, 0.0, "Missing first name")
        
        # Exact match
        if incoming == candidate:
            return (True, 1.0, f"Exact match: {entity.first_name}")
        
        # Fuzzy match
        similarity = jaro_winkler_similarity(incoming, candidate)
        
        if similarity >= 0.9:
            return (True, similarity, f"Near match ({similarity:.2f}): {entity.first_name}")
        elif similarity >= 0.7:
            return (False, similarity * 0.8, f"Partial match ({similarity:.2f})")
        else:
            return (False, 0.0, f"No match ({similarity:.2f})")
    
    def _check_driver_number(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check driver number match with date bounds.
        
        Driver numbers can be:
        - Permanent numbers (2014+ F1)
        - Historical race numbers (changed per race/season)
        
        We check if the number matches AND if it's within valid date bounds.
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_num = self._incoming_data.driver_number
        candidate_num = entity.driver_number
        
        if incoming_num is None or candidate_num is None:
            return (False, 0.0, "Missing driver number")
        
        if incoming_num != candidate_num:
            return (False, 0.0, f"Number mismatch: {incoming_num} vs {candidate_num}")
        
        # Numbers match - now check date bounds if available
        date_context = self._incoming_data.date_context
        
        if date_context:
            # Check if within valid range
            if entity.number_valid_from and date_context < entity.number_valid_from:
                return (False, 0.3, f"Number {candidate_num} not valid yet at {date_context}")
            if entity.number_valid_until and date_context > entity.number_valid_until:
                return (False, 0.3, f"Number {candidate_num} expired at {date_context}")
        
        return (True, 1.0, f"Number match: #{candidate_num}")
    
    def _check_abbreviation(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check 3-letter abbreviation match (e.g., VER, HAM, PER)."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming = self._incoming_data.abbreviation
        candidate = entity.abbreviation
        
        if not incoming or not candidate:
            return (False, 0.0, "Missing abbreviation")
        
        incoming_upper = incoming.upper()
        candidate_upper = candidate.upper()
        
        if incoming_upper == candidate_upper:
            return (True, 1.0, f"Abbreviation match: {candidate_upper}")
        
        # Partial credit for 2/3 matching characters
        matches = sum(1 for a, b in zip(incoming_upper, candidate_upper) if a == b)
        if matches >= 2:
            return (False, 0.5, f"Partial abbreviation: {incoming_upper} vs {candidate_upper}")
        
        return (False, 0.0, f"No match: {incoming_upper} vs {candidate_upper}")
    
    def _check_nationality(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check nationality match."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming = self._incoming_data.nationality
        candidate = entity.nationality
        
        if not incoming or not candidate:
            return (False, 0.0, "Missing nationality")
        
        # Normalize country codes
        incoming_norm = incoming.upper().strip()
        candidate_norm = candidate.upper().strip()
        
        if incoming_norm == candidate_norm:
            return (True, 1.0, f"Nationality match: {candidate_norm}")
        
        # Handle common variations (e.g., "UK" vs "GBR", "USA" vs "US")
        country_aliases = {
            "UK": ["GBR", "GB", "GREAT BRITAIN", "BRITAIN", "UNITED KINGDOM"],
            "USA": ["US", "UNITED STATES", "AMERICA"],
            "NED": ["NL", "NETHERLANDS", "HOLLAND"],
            "GER": ["DE", "GERMANY", "DEUTSCHLAND"],
            "SUI": ["CH", "SWITZERLAND", "SCHWEIZ"],
            "ESP": ["ES", "SPAIN", "ESPANA"],
            "MEX": ["MX", "MEXICO"],
        }
        
        for canonical, aliases in country_aliases.items():
            all_variants = [canonical] + aliases
            if incoming_norm in all_variants and candidate_norm in all_variants:
                return (True, 1.0, f"Nationality match (alias): {candidate}")
        
        return (False, 0.0, f"No match: {incoming_norm} vs {candidate_norm}")
    
    def _check_fuzzy_similarity(self, entity: DriverCandidate) -> tuple[bool, float, str | None]:
        """Check overall fuzzy similarity of full name.
        
        Uses combined Jaro-Winkler on full name as final catchall.
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Build full names
        incoming_full = normalize_name(self._incoming_data.full_name)
        candidate_full = normalize_name(f"{entity.first_name} {entity.last_name}")
        
        if not incoming_full or not candidate_full:
            return (False, 0.0, "Missing name data")
        
        # Also try reversed name order
        candidate_reversed = normalize_name(f"{entity.last_name} {entity.first_name}")
        
        # Take best of normal and reversed
        similarity = max(
            jaro_winkler_similarity(incoming_full, candidate_full),
            jaro_winkler_similarity(incoming_full, candidate_reversed),
        )
        
        if similarity >= 0.95:
            return (True, 1.0, f"High similarity: {similarity:.3f}")
        elif similarity >= 0.85:
            return (True, similarity, f"Good similarity: {similarity:.3f}")
        elif similarity >= 0.7:
            return (False, similarity * 0.8, f"Moderate similarity: {similarity:.3f}")
        else:
            return (False, 0.0, f"Low similarity: {similarity:.3f}")


# Convenience function for quick matching
def match_driver(
    incoming: DriverData,
    candidates: list[DriverCandidate],
) -> DriverCandidate | None:
    """Quick helper to find best driver match above threshold.
    
    Args:
        incoming: Driver data to match
        candidates: List of candidate drivers
        
    Returns:
        Best matching driver or None if no good match
    """
    if not candidates:
        return None
    
    matcher = DriverMatcher(candidates)
    result = matcher.match(incoming)
    
    if result.confidence in (result.confidence.HIGH, result.confidence.MEDIUM):
        return result.matched_entity
    
    return None
