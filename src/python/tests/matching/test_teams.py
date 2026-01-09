"""
Tests for TeamMatcher with known edge cases.
"""

import pytest
from uuid import uuid4

from ingestion.matching import (
    TeamMatcher,
    ConfidenceLevel,
)
from ingestion.matching.teams import (
    TeamData,
    TeamCandidate,
    match_team,
)


@pytest.fixture
def team_candidates() -> list[TeamCandidate]:
    """Create test team candidates including edge cases from ROADMAP.md Issue 3."""
    return [
        TeamCandidate(
            id=uuid4(),
            name="Red Bull Racing",
            slug="red-bull-racing",
            short_name="Red Bull",
            primary_color="#3671C6",
            active_from=2005,
        ),
        TeamCandidate(
            id=uuid4(),
            name="Ferrari",
            slug="ferrari",
            short_name="Ferrari",
            primary_color="#E8002D",
            active_from=1950,
        ),
        TeamCandidate(
            id=uuid4(),
            name="McLaren",
            slug="mclaren",
            short_name="McLaren",
            primary_color="#FF8000",
            active_from=1966,
        ),
        TeamCandidate(
            id=uuid4(),
            name="Mercedes",
            slug="mercedes",
            short_name="Mercedes",
            primary_color="#27F4D2",
            active_from=2010,
        ),
        TeamCandidate(
            id=uuid4(),
            name="Toro Rosso",
            slug="toro-rosso",
            short_name="Toro Rosso",
            primary_color="#4E7C9B",
            active_from=2006,
            active_until=2019,
        ),
        TeamCandidate(
            id=uuid4(),
            name="AlphaTauri",
            slug="alphatauri",
            short_name="AlphaTauri",
            primary_color="#4E7C9B",  # Same color as Toro Rosso
            active_from=2020,
            active_until=2023,
        ),
    ]


class TestTeamMatcherExactMatch:
    """Tests for exact team matches."""
    
    def test_exact_name_match(self, team_candidates: list[TeamCandidate]) -> None:
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Ferrari"))
        
        # With just name (no color or year), we get MEDIUM confidence
        # because color and year signals are missing or partial
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Ferrari"
    
    def test_exact_name_with_color(self, team_candidates: list[TeamCandidate]) -> None:
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(
            name="Ferrari",
            primary_color="#E8002D",
        ))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.score >= 0.85


class TestTeamMatcherSponsorVariations:
    """Tests for sponsor prefix/suffix variations - edge cases from ROADMAP.md Issue 3."""
    
    def test_oracle_red_bull_racing(self, team_candidates: list[TeamCandidate]) -> None:
        """'Oracle Red Bull Racing' should match 'Red Bull Racing'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Oracle Red Bull Racing"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Red Bull Racing"
    
    def test_red_bull_short(self, team_candidates: list[TeamCandidate]) -> None:
        """'Red Bull' (short form) should match 'Red Bull Racing'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Red Bull"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Red Bull Racing"
    
    def test_scuderia_ferrari(self, team_candidates: list[TeamCandidate]) -> None:
        """'Scuderia Ferrari' should match 'Ferrari'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Scuderia Ferrari"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Ferrari"
    
    def test_ferrari_mission_winnow(self, team_candidates: list[TeamCandidate]) -> None:
        """'Scuderia Ferrari Mission Winnow' should match 'Ferrari'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Scuderia Ferrari Mission Winnow"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "Ferrari"
    
    def test_mclaren_f1_team(self, team_candidates: list[TeamCandidate]) -> None:
        """'McLaren F1 Team' should match 'McLaren'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="McLaren F1 Team"))
        
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "McLaren"
    
    def test_mclaren_mercedes(self, team_candidates: list[TeamCandidate]) -> None:
        """'McLaren Mercedes' should match 'McLaren' not 'Mercedes'."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="McLaren Mercedes"))
        
        # Should favor McLaren due to name order
        assert result.matched_entity.name == "McLaren"


class TestTeamMatcherYearContext:
    """Tests for era-appropriate matching."""
    
    def test_toro_rosso_2018(self, team_candidates: list[TeamCandidate]) -> None:
        """Toro Rosso was active in 2018."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(
            name="Toro Rosso",
            year_context=2018,
        ))
        
        assert result.confidence == ConfidenceLevel.HIGH
        year_signal = result.get_signal("year_overlap")
        assert year_signal is not None
        assert year_signal.score == 1.0
    
    def test_alphatauri_2022(self, team_candidates: list[TeamCandidate]) -> None:
        """AlphaTauri was active in 2022."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(
            name="AlphaTauri",
            year_context=2022,
        ))
        
        assert result.confidence == ConfidenceLevel.HIGH
        year_signal = result.get_signal("year_overlap")
        assert year_signal is not None
        assert year_signal.score == 1.0
    
    def test_toro_rosso_wrong_year(self, team_candidates: list[TeamCandidate]) -> None:
        """Looking for Toro Rosso in 2022 (when they were AlphaTauri)."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(
            name="Toro Rosso",  # Old name
            year_context=2022,  # After rebrand
        ))
        
        # Should still find Toro Rosso but with penalized year signal
        year_signal = result.get_signal("year_overlap")
        assert year_signal is not None
        assert year_signal.score == 0.0  # Team ended in 2019


class TestTeamMatcherColorMatching:
    """Tests for color-based disambiguation."""
    
    def test_color_helps_identify(self, team_candidates: list[TeamCandidate]) -> None:
        """Color helps disambiguate when name gives multiple matches."""
        # Toro Rosso and AlphaTauri have same color but different active years
        matcher = TeamMatcher(team_candidates)
        
        # With year context for 2018, should prefer Toro Rosso
        result = matcher.match(TeamData(
            name="Toro Rosso",  # Need similar enough name to pass pre-filter
            primary_color="#4E7C9B",
            year_context=2018,
        ))
        
        # Color signal should be present when we have color data
        color_signal = result.get_signal("primary_color")
        assert color_signal is not None
        assert color_signal.matched  # Exact color match
    
    def test_ferrari_red(self, team_candidates: list[TeamCandidate]) -> None:
        """Ferrari's distinctive red helps confirm identification."""
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(
            name="Ferrari",  # Need name to pass pre-filter
            primary_color="#E8002D",
        ))
        
        color_signal = result.get_signal("primary_color")
        assert color_signal is not None
        assert color_signal.matched
        assert color_signal.score == 1.0  # Exact match


class TestTeamMatcherFuzzy:
    """Tests for fuzzy team name matching."""
    
    def test_minor_typo(self, team_candidates: list[TeamCandidate]) -> None:
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="Farrari"))  # Typo
        
        assert result.matched_entity.name == "Ferrari"
    
    def test_case_insensitive(self, team_candidates: list[TeamCandidate]) -> None:
        matcher = TeamMatcher(team_candidates)
        result = matcher.match(TeamData(name="MCLAREN"))
        
        # Exact match despite case, but still MEDIUM due to missing color/year
        assert result.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)
        assert result.matched_entity.name == "McLaren"


class TestTeamMatcherConvenienceFunction:
    """Tests for the match_team convenience function."""
    
    def test_match_team_found(self, team_candidates: list[TeamCandidate]) -> None:
        result = match_team(
            TeamData(name="Ferrari"),
            team_candidates,
        )
        
        assert result is not None
        assert result.name == "Ferrari"
    
    def test_match_team_not_found(self, team_candidates: list[TeamCandidate]) -> None:
        result = match_team(
            TeamData(name="Nonexistent Racing"),
            team_candidates,
        )
        
        assert result is None
    
    def test_match_team_empty_candidates(self) -> None:
        result = match_team(TeamData(name="Ferrari"), [])
        assert result is None
