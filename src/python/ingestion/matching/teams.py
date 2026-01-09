"""
Team matcher with multi-signal confidence scoring.

Signals:
- Exact name match (0.40)
- Name containment (0.20) - "Red Bull" in "Oracle Red Bull Racing"
- Fuzzy similarity (0.20)
- Primary color match (0.10)
- Year/era overlap (0.10)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

from ingestion.matching.core import EntityMatcher, SignalConfig
from ingestion.matching.normalization import normalize_name, normalize_team_name
from ingestion.matching.distance import (
    jaro_winkler_similarity,
    normalized_levenshtein_similarity,
    containment_score,
)


@dataclass
class TeamData:
    """Incoming team data for matching.
    
    All fields except name are optional.
    """
    name: str
    short_name: str | None = None
    primary_color: str | None = None  # Hex color, e.g., "#3671C6"
    year_context: int | None = None  # Year for era-based matching


@dataclass
class TeamCandidate:
    """A team entity from the database to match against."""
    id: UUID
    name: str
    slug: str
    short_name: str | None = None
    primary_color: str | None = None
    # Era bounds for handling rebrands
    active_from: int | None = None  # Year team started
    active_until: int | None = None  # Year team ended/rebranded (None if current)


class TeamMatcher(EntityMatcher[TeamCandidate, TeamData]):
    """Match incoming team data against existing teams.
    
    Signal weights (total = 1.0):
    - exact_name: 0.40 - Exact match is highly reliable
    - name_containment: 0.20 - Handles sponsor prefixes
    - fuzzy_similarity: 0.20 - Catches typos and minor variations
    - primary_color: 0.10 - Helps with rebrands keeping colors
    - year_overlap: 0.10 - Era-appropriate matching
    
    Handles complex scenarios:
    - "Oracle Red Bull Racing" vs "Red Bull Racing" vs "Red Bull"
    - "Ferrari" vs "Scuderia Ferrari" vs "Scuderia Ferrari Mission Winnow"
    - Rebrand chains: Minardi → Toro Rosso → AlphaTauri → Racing Bulls
    
    Example usage:
        candidates = [
            TeamCandidate(id=..., name="Red Bull Racing", slug="red-bull-racing", ...),
            TeamCandidate(id=..., name="Ferrari", slug="ferrari", ...),
        ]
        matcher = TeamMatcher(candidates)
        
        result = matcher.match(TeamData(name="Oracle Red Bull Racing"))
        print(result.confidence)  # ConfidenceLevel.HIGH
    """
    
    def _configure_signals(self) -> list[SignalConfig]:
        """Configure team matching signals."""
        return [
            SignalConfig("exact_name", 0.40, self._check_exact_name),
            SignalConfig("name_containment", 0.20, self._check_name_containment),
            SignalConfig("fuzzy_similarity", 0.20, self._check_fuzzy_similarity),
            SignalConfig("primary_color", 0.10, self._check_primary_color),
            SignalConfig("year_overlap", 0.10, self._check_year_overlap),
        ]
    
    def _extract_id(self, entity: TeamCandidate) -> UUID:
        """Extract team ID."""
        return entity.id
    
    def _pre_filter(self, entity: TeamCandidate) -> bool:
        """Quick rejection filter."""
        if not self._incoming_data:
            return True
        
        # Normalize both names
        incoming_norm = normalize_team_name(self._incoming_data.name)
        candidate_norm = normalize_team_name(entity.name)
        
        # Quick containment check
        if incoming_norm in candidate_norm or candidate_norm in incoming_norm:
            return True
        
        # Check if any significant word matches
        incoming_words = set(incoming_norm.split())
        candidate_words = set(candidate_norm.split())
        
        # Remove very common words
        stop_words = {"f1", "team", "racing", "motorsport", "formula", "scuderia"}
        incoming_significant = incoming_words - stop_words
        candidate_significant = candidate_words - stop_words
        
        if incoming_significant & candidate_significant:
            return True
        
        # Fuzzy check on core name
        similarity = jaro_winkler_similarity(incoming_norm, candidate_norm)
        return similarity > 0.5
    
    def _check_exact_name(self, entity: TeamCandidate) -> tuple[bool, float, str | None]:
        """Check for exact name match after normalization."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        # Try multiple normalization levels
        incoming_raw = normalize_name(self._incoming_data.name)
        candidate_raw = normalize_name(entity.name)
        
        incoming_norm = normalize_team_name(self._incoming_data.name)
        candidate_norm = normalize_team_name(entity.name)
        
        # Exact raw match
        if incoming_raw == candidate_raw:
            return (True, 1.0, f"Exact match: {entity.name}")
        
        # Exact normalized match
        if incoming_norm == candidate_norm:
            return (True, 0.95, f"Exact normalized match: {entity.name}")
        
        # Short name match
        if self._incoming_data.short_name and entity.short_name:
            if normalize_name(self._incoming_data.short_name) == normalize_name(entity.short_name):
                return (True, 0.9, f"Short name match: {entity.short_name}")
        
        return (False, 0.0, "No exact match")
    
    def _check_name_containment(self, entity: TeamCandidate) -> tuple[bool, float, str | None]:
        """Check if one name contains the other.
        
        Handles cases like:
        - "Red Bull" contained in "Oracle Red Bull Racing"
        - "Ferrari" contained in "Scuderia Ferrari Mission Winnow"
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_norm = normalize_team_name(self._incoming_data.name)
        candidate_norm = normalize_team_name(entity.name)
        
        # Direct containment
        if incoming_norm and candidate_norm:
            if incoming_norm in candidate_norm:
                return (True, 1.0, f"Incoming '{incoming_norm}' contained in candidate")
            if candidate_norm in incoming_norm:
                return (True, 1.0, f"Candidate '{candidate_norm}' contained in incoming")
        
        # Word-level containment
        score = containment_score(incoming_norm, candidate_norm)
        
        if score >= 0.8:
            return (True, score, f"High word overlap: {score:.2f}")
        elif score >= 0.5:
            return (False, score * 0.7, f"Partial word overlap: {score:.2f}")
        
        return (False, 0.0, "No containment")
    
    def _check_fuzzy_similarity(self, entity: TeamCandidate) -> tuple[bool, float, str | None]:
        """Check fuzzy string similarity."""
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_norm = normalize_team_name(self._incoming_data.name)
        candidate_norm = normalize_team_name(entity.name)
        
        if not incoming_norm or not candidate_norm:
            return (False, 0.0, "Missing name data")
        
        similarity = jaro_winkler_similarity(incoming_norm, candidate_norm)
        
        if similarity >= 0.95:
            return (True, 1.0, f"Very high similarity: {similarity:.3f}")
        elif similarity >= 0.85:
            return (True, similarity, f"High similarity: {similarity:.3f}")
        elif similarity >= 0.7:
            return (False, similarity * 0.7, f"Moderate similarity: {similarity:.3f}")
        else:
            return (False, 0.0, f"Low similarity: {similarity:.3f}")
    
    def _check_primary_color(self, entity: TeamCandidate) -> tuple[bool, float, str | None]:
        """Check if primary team colors match.
        
        Team colors are relatively stable across rebrands, making this
        a useful disambiguating signal.
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        incoming_color = self._incoming_data.primary_color
        candidate_color = entity.primary_color
        
        if not incoming_color or not candidate_color:
            return (False, 0.0, "Missing color data")
        
        # Normalize hex colors
        incoming_hex = incoming_color.lstrip("#").upper()
        candidate_hex = candidate_color.lstrip("#").upper()
        
        if len(incoming_hex) != 6 or len(candidate_hex) != 6:
            return (False, 0.0, "Invalid color format")
        
        # Exact match
        if incoming_hex == candidate_hex:
            return (True, 1.0, f"Exact color match: #{candidate_hex}")
        
        # Calculate color distance (simple RGB Euclidean)
        try:
            r1 = int(incoming_hex[0:2], 16)
            g1 = int(incoming_hex[2:4], 16)
            b1 = int(incoming_hex[4:6], 16)
            r2 = int(candidate_hex[0:2], 16)
            g2 = int(candidate_hex[2:4], 16)
            b2 = int(candidate_hex[4:6], 16)
            
            # Max possible distance is sqrt(3 * 255^2) ≈ 441
            distance = ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5
            max_distance = 441.67
            similarity = 1.0 - (distance / max_distance)
            
            if similarity >= 0.9:
                return (True, similarity, f"Very similar color: {similarity:.2f}")
            elif similarity >= 0.7:
                return (False, similarity * 0.5, f"Somewhat similar: {similarity:.2f}")
            else:
                return (False, 0.0, f"Different colors: {similarity:.2f}")
                
        except ValueError:
            return (False, 0.0, "Color parsing error")
    
    def _check_year_overlap(self, entity: TeamCandidate) -> tuple[bool, float, str | None]:
        """Check if the team was active during the relevant year.
        
        Important for handling rebrands - e.g., don't match "AlphaTauri"
        for a 2018 race (it was still "Toro Rosso" then).
        """
        if not self._incoming_data:
            return (False, 0.0, "No incoming data")
        
        year = self._incoming_data.year_context
        
        if not year:
            # No year context - give partial credit
            return (False, 0.5, "No year context provided")
        
        active_from = entity.active_from
        active_until = entity.active_until
        
        # Check bounds
        if active_from and year < active_from:
            return (False, 0.0, f"Team not active until {active_from}")
        
        if active_until and year > active_until:
            return (False, 0.0, f"Team ended in {active_until}")
        
        # Within range
        if active_from and active_until:
            return (True, 1.0, f"Active {active_from}-{active_until}")
        elif active_from:
            return (True, 1.0, f"Active since {active_from}")
        else:
            return (True, 0.8, "No era data, assuming current")


# Known F1 team rebrand chains for special handling
TEAM_REBRAND_CHAINS = {
    # Current Racing Bulls lineage
    "racing-bulls": [
        ("minardi", 1985, 2005),
        ("toro-rosso", 2006, 2019),
        ("alphatauri", 2020, 2023),
        ("racing-bulls", 2024, None),
    ],
    # Current Aston Martin lineage
    "aston-martin": [
        ("jordan", 1991, 2005),
        ("midland", 2006, 2006),
        ("spyker", 2007, 2007),
        ("force-india", 2008, 2018),
        ("racing-point", 2019, 2020),
        ("aston-martin", 2021, None),
    ],
    # Current Sauber/Audi lineage
    "sauber": [
        ("sauber", 1993, 2018),
        ("alfa-romeo", 2019, 2023),
        ("stake", 2024, 2025),  # Temporary
        ("audi", 2026, None),  # Future
    ],
}


def get_team_at_year(chain_key: str, year: int) -> str | None:
    """Get the team name from a rebrand chain for a specific year.
    
    Args:
        chain_key: Key into TEAM_REBRAND_CHAINS
        year: Year to look up
        
    Returns:
        Team slug for that year or None if not found
    """
    chain = TEAM_REBRAND_CHAINS.get(chain_key)
    if not chain:
        return None
    
    for slug, start, end in chain:
        if start <= year and (end is None or year <= end):
            return slug
    
    return None


# Convenience function
def match_team(
    incoming: TeamData,
    candidates: list[TeamCandidate],
) -> TeamCandidate | None:
    """Quick helper to find best team match above threshold.
    
    Args:
        incoming: Team data to match
        candidates: List of candidate teams
        
    Returns:
        Best matching team or None if no good match
    """
    if not candidates:
        return None
    
    matcher = TeamMatcher(candidates)
    result = matcher.match(incoming)
    
    if result.confidence in (result.confidence.HIGH, result.confidence.MEDIUM):
        return result.matched_entity
    
    return None
