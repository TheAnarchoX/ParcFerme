"""
Tests for RoundMatcher with known edge cases from ingestion.
"""

import pytest
from uuid import uuid4
from datetime import date

from ingestion.matching import (
    RoundMatcher,
    ConfidenceLevel,
)
from ingestion.matching.rounds import (
    RoundData,
    RoundCandidate,
    find_best_round_match,
)


# Test fixtures
@pytest.fixture
def round_candidates() -> list[RoundCandidate]:
    """Create test round candidates."""
    season_id = uuid4()  # Shared season
    return [
        RoundCandidate(
            id=uuid4(),
            name="Australian Grand Prix",
            slug="australian-grand-prix-2024",
            season_id=season_id,
            season_year=2024,
            round_number=1,
            circuit_id=uuid4(),
            circuit_name="Albert Park Circuit",
            date_start=date(2024, 3, 22),
            date_end=date(2024, 3, 24),
        ),
        RoundCandidate(
            id=uuid4(),
            name="Bahrain Grand Prix",
            slug="bahrain-grand-prix-2024",
            season_id=season_id,
            season_year=2024,
            round_number=2,
            circuit_id=uuid4(),
            circuit_name="Bahrain International Circuit",
            date_start=date(2024, 3, 1),
            date_end=date(2024, 3, 3),
        ),
        RoundCandidate(
            id=uuid4(),
            name="Monaco Grand Prix",
            slug="monaco-grand-prix-2024",
            season_id=season_id,
            season_year=2024,
            round_number=8,
            circuit_id=uuid4(),
            circuit_name="Circuit de Monaco",
            date_start=date(2024, 5, 24),
            date_end=date(2024, 5, 26),
        ),
        RoundCandidate(
            id=uuid4(),
            name="British Grand Prix",
            slug="british-grand-prix-2024",
            season_id=season_id,
            season_year=2024,
            round_number=12,
            circuit_id=uuid4(),
            circuit_name="Silverstone Circuit",
            date_start=date(2024, 7, 5),
            date_end=date(2024, 7, 7),
        ),
        RoundCandidate(
            id=uuid4(),
            name="Japanese Grand Prix",
            slug="japanese-grand-prix-2024",
            season_id=season_id,
            season_year=2024,
            round_number=4,
            circuit_id=uuid4(),
            circuit_name="Suzuka International Racing Course",
            date_start=date(2024, 4, 5),
            date_end=date(2024, 4, 7),
        ),
    ]


@pytest.fixture
def matcher(round_candidates) -> RoundMatcher:
    """Create a RoundMatcher with test candidates."""
    return RoundMatcher(round_candidates)


class TestRoundMatcherExactMatch:
    """Test exact matching scenarios."""

    def test_exact_name_match(self, matcher, round_candidates):
        """Test matching by exact round name."""
        incoming = RoundData(
            name="Australian Grand Prix",
            round_number=1,
            year=2024,
        )
        result = matcher.match(incoming)

        # Without circuit or date info, we only get name (0.25) + round_number_year (0.15) + fuzzy (0.10) = 0.5
        # This is LOW confidence since we're missing key signals
        assert result.matched_entity_id == round_candidates[0].id
        assert result.score >= 0.4  # At least name + round_number_year should match

    def test_exact_match_with_date(self, matcher, round_candidates):
        """Test matching by name and date."""
        incoming = RoundData(
            name="Monaco Grand Prix",
            round_number=8,
            year=2024,
            date_start=date(2024, 5, 24),
        )
        result = matcher.match(incoming)

        # With name + date + round_number_year + fuzzy, should get medium/high
        assert result.matched_entity_id == round_candidates[2].id
        assert result.confidence in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM]


class TestRoundMatcherFuzzyMatch:
    """Test fuzzy matching scenarios."""

    def test_abbreviated_name_match(self, matcher, round_candidates):
        """Test matching with abbreviated GP name."""
        incoming = RoundData(
            name="Australia GP",
            round_number=1,
            year=2024,
        )
        result = matcher.match(incoming)

        # Should match based on round_number + year + fuzzy name
        # Score may be low due to normalization adding "Grand Prix" (0.25 score)
        assert result.matched_entity_id == round_candidates[0].id

    def test_different_name_format(self, matcher, round_candidates):
        """Test matching with different name format."""
        incoming = RoundData(
            name="GP of Japan",
            round_number=4,
            year=2024,
        )
        result = matcher.match(incoming)

        assert result.matched_entity_id == round_candidates[4].id

    def test_match_by_circuit_name(self, matcher, round_candidates):
        """Test matching when only circuit name is similar."""
        incoming = RoundData(
            name="Silverstone Grand Prix",  # Not the official name
            round_number=12,
            year=2024,
            circuit_name="Silverstone",
        )
        result = matcher.match(incoming)

        assert result.matched_entity_id == round_candidates[3].id


class TestRoundMatcherDateMatching:
    """Test date-based matching."""

    def test_exact_date_match(self, matcher, round_candidates):
        """Test matching with exact start date."""
        incoming = RoundData(
            name="Unknown GP",  # Don't rely on name
            round_number=2,
            year=2024,
            date_start=date(2024, 3, 1),
        )
        result = matcher.match(incoming)

        assert result.matched_entity_id == round_candidates[1].id

    def test_close_date_match(self, matcher, round_candidates):
        """Test matching with date within acceptable range."""
        incoming = RoundData(
            name="Australian Race",
            round_number=1,
            year=2024,
            date_start=date(2024, 3, 23),  # Off by one day
        )
        result = matcher.match(incoming)

        assert result.matched_entity_id == round_candidates[0].id


class TestRoundMatcherNoMatch:
    """Test scenarios where no match should be found."""

    def test_no_match_wrong_year(self, matcher):
        """Test that wrong year doesn't match."""
        incoming = RoundData(
            name="Australian Grand Prix",
            round_number=1,
            year=2023,  # Different year
        )
        result = matcher.match(incoming)

        # Should be NO_MATCH or very low confidence
        assert result.confidence == ConfidenceLevel.NO_MATCH or result.score < 0.5

    def test_no_match_unknown_round(self, matcher):
        """Test that completely unknown round doesn't match."""
        incoming = RoundData(
            name="Unknown Mystery Grand Prix",
            round_number=99,
            year=2024,
        )
        result = matcher.match(incoming)

        assert result.confidence == ConfidenceLevel.NO_MATCH


class TestRoundMatcherSignals:
    """Test that signals are correctly tracked."""

    def test_signals_included(self, matcher):
        """Test that match signals are properly included."""
        incoming = RoundData(
            name="Australian Grand Prix",
            round_number=1,
            year=2024,
            date_start=date(2024, 3, 22),
        )
        result = matcher.match(incoming)

        assert len(result.signals) > 0

        # Check signal names
        signal_names = [s.name for s in result.signals]
        assert "round_number_year" in signal_names or "exact_name" in signal_names

    def test_signal_contributions(self, matcher):
        """Test that signal weighted scores sum correctly."""
        incoming = RoundData(
            name="British Grand Prix",
            round_number=12,
            year=2024,
        )
        result = matcher.match(incoming)

        # Total raw_score (weight * score) should be close to final score
        total_raw_score = sum(s.raw_score for s in result.signals)
        assert abs(total_raw_score - result.score) < 0.01


class TestFunctionInterface:
    """Test the functional interface."""

    def test_find_best_round_match_function(self, round_candidates):
        """Test the standalone find_best_round_match function."""
        incoming = RoundData(
            name="Monaco Grand Prix",
            round_number=8,
            year=2024,
        )
        matched, score, signals = find_best_round_match(incoming, round_candidates)

        assert matched is not None
        assert matched.id == round_candidates[2].id
        # Without circuit/date, we get name + round_number_year + fuzzy = ~0.5
        assert score >= 0.4

    def test_find_best_round_match_empty_candidates(self):
        """Test find_best_round_match with no candidates."""
        incoming = RoundData(
            name="Test GP",
            round_number=1,
            year=2024,
        )
        matched, score, signals = find_best_round_match(incoming, [])

        assert matched is None
        assert score == 0.0


class TestRoundMatcherEdgeCases:
    """Test edge cases and special scenarios."""

    def test_empty_candidates(self):
        """Test matcher with no candidates."""
        matcher = RoundMatcher([])
        incoming = RoundData(
            name="Test GP",
            round_number=1,
            year=2024,
        )
        result = matcher.match(incoming)

        assert result.confidence == ConfidenceLevel.NO_MATCH

    def test_sprint_weekend_naming(self, round_candidates):
        """Test matching sprint weekend with different naming."""
        # Add a sprint GP candidate
        sprint_candidate = RoundCandidate(
            id=uuid4(),
            name="Emilia Romagna Grand Prix",
            slug="emilia-romagna-grand-prix-2024",
            season_id=uuid4(),
            season_year=2024,
            round_number=7,
            circuit_id=uuid4(),
            circuit_name="Autodromo Enzo e Dino Ferrari",
            date_start=date(2024, 5, 17),
        )
        candidates = list(round_candidates) + [sprint_candidate]
        matcher = RoundMatcher(candidates)

        incoming = RoundData(
            name="Imola Grand Prix",  # Alternative name
            round_number=7,
            year=2024,
        )
        result = matcher.match(incoming)

        # Should match based on round number and year
        assert result.matched_entity_id == sprint_candidate.id

    def test_all_candidates_low_score(self):
        """Test when all candidates have low scores."""
        candidates = [
            RoundCandidate(
                id=uuid4(),
                name="Test GP 1",
                slug="test-gp-1-2020",
                season_id=uuid4(),
                season_year=2020,
                round_number=1,
                circuit_id=uuid4(),
                circuit_name="Circuit 1",
            ),
        ]
        matcher = RoundMatcher(candidates)

        incoming = RoundData(
            name="Completely Different GP",
            round_number=99,
            year=2024,
        )
        result = matcher.match(incoming)

        assert result.confidence == ConfidenceLevel.NO_MATCH
