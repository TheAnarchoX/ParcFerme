"""
Tests for core matching framework types and base class.
"""

import pytest
from uuid import uuid4

from ingestion.matching.core import (
    ConfidenceLevel,
    MatchResult,
    MatchSignal,
    EntityMatcher,
    SignalConfig,
)


class TestConfidenceLevel:
    """Tests for ConfidenceLevel enum and thresholds."""
    
    def test_high_threshold(self) -> None:
        assert ConfidenceLevel.from_score(1.0) == ConfidenceLevel.HIGH
        assert ConfidenceLevel.from_score(0.95) == ConfidenceLevel.HIGH
        assert ConfidenceLevel.from_score(0.9) == ConfidenceLevel.HIGH
    
    def test_medium_threshold(self) -> None:
        assert ConfidenceLevel.from_score(0.89) == ConfidenceLevel.MEDIUM
        assert ConfidenceLevel.from_score(0.8) == ConfidenceLevel.MEDIUM
        assert ConfidenceLevel.from_score(0.7) == ConfidenceLevel.MEDIUM
    
    def test_low_threshold(self) -> None:
        assert ConfidenceLevel.from_score(0.69) == ConfidenceLevel.LOW
        assert ConfidenceLevel.from_score(0.6) == ConfidenceLevel.LOW
        assert ConfidenceLevel.from_score(0.5) == ConfidenceLevel.LOW
    
    def test_no_match_threshold(self) -> None:
        assert ConfidenceLevel.from_score(0.49) == ConfidenceLevel.NO_MATCH
        assert ConfidenceLevel.from_score(0.0) == ConfidenceLevel.NO_MATCH


class TestMatchSignal:
    """Tests for MatchSignal dataclass."""
    
    def test_raw_score_calculation(self) -> None:
        signal = MatchSignal(
            name="test",
            weight=0.3,
            matched=True,
            score=1.0,
        )
        assert signal.raw_score == 0.3
    
    def test_partial_score(self) -> None:
        signal = MatchSignal(
            name="test",
            weight=0.5,
            matched=True,
            score=0.8,
        )
        assert signal.raw_score == 0.4
    
    def test_zero_score(self) -> None:
        signal = MatchSignal(
            name="test",
            weight=0.3,
            matched=False,
            score=0.0,
        )
        assert signal.raw_score == 0.0


class TestMatchResult:
    """Tests for MatchResult dataclass."""
    
    def test_no_match_factory(self) -> None:
        result = MatchResult.no_match()
        assert result.score == 0.0
        assert result.confidence == ConfidenceLevel.NO_MATCH
        assert result.matched_entity is None
        assert result.is_new is True
    
    def test_from_signals(self) -> None:
        entity_id = uuid4()
        entity = {"name": "Test"}
        
        signals = [
            MatchSignal("a", 0.5, True, 1.0),
            MatchSignal("b", 0.3, True, 0.8),
            MatchSignal("c", 0.2, False, 0.0),
        ]
        
        result = MatchResult.from_signals(entity, entity_id, signals)
        
        # Score = 0.5*1.0 + 0.3*0.8 + 0.2*0.0 = 0.5 + 0.24 = 0.74
        assert result.score == pytest.approx(0.74)
        assert result.confidence == ConfidenceLevel.MEDIUM
        assert result.matched_entity == entity
        assert result.matched_entity_id == entity_id
        assert len(result.signals) == 3
    
    def test_get_signal(self) -> None:
        result = MatchResult(
            score=0.8,
            confidence=ConfidenceLevel.MEDIUM,
            matched_entity=None,
            matched_entity_id=None,
            signals=[
                MatchSignal("first", 0.5, True, 1.0),
                MatchSignal("second", 0.5, False, 0.0),
            ],
        )
        
        signal = result.get_signal("first")
        assert signal is not None
        assert signal.name == "first"
        
        missing = result.get_signal("missing")
        assert missing is None
    
    def test_explain_output(self) -> None:
        result = MatchResult(
            score=0.74,
            confidence=ConfidenceLevel.MEDIUM,
            matched_entity="TestEntity",
            matched_entity_id=uuid4(),
            signals=[
                MatchSignal("sig_a", 0.5, True, 1.0, "Exact match"),
                MatchSignal("sig_b", 0.3, True, 0.8, "Partial"),
                MatchSignal("sig_c", 0.2, False, 0.0, "No match"),
            ],
        )
        
        explanation = result.explain()
        assert "0.74" in explanation
        assert "medium" in explanation
        assert "sig_a" in explanation
        assert "sig_b" in explanation
        assert "sig_c" in explanation


class DummyEntity:
    """Test entity for matcher tests."""
    def __init__(self, id: str, name: str) -> None:
        self.id = id
        self.name = name


class DummyData:
    """Test incoming data for matcher tests."""
    def __init__(self, name: str) -> None:
        self.name = name


class DummyMatcher(EntityMatcher[DummyEntity, DummyData]):
    """Test implementation of EntityMatcher."""
    
    def _configure_signals(self) -> list[SignalConfig]:
        return [
            SignalConfig("exact_name", 0.6, self._check_exact_name),
            SignalConfig("partial_name", 0.4, self._check_partial_name),
        ]
    
    def _extract_id(self, entity: DummyEntity) -> str:
        return entity.id
    
    def _check_exact_name(self, entity: DummyEntity) -> tuple[bool, float, str | None]:
        if not self._incoming_data:
            return (False, 0.0, None)
        if entity.name.lower() == self._incoming_data.name.lower():
            return (True, 1.0, "Exact match")
        return (False, 0.0, "No match")
    
    def _check_partial_name(self, entity: DummyEntity) -> tuple[bool, float, str | None]:
        if not self._incoming_data:
            return (False, 0.0, None)
        if self._incoming_data.name.lower() in entity.name.lower():
            return (True, 1.0, "Contains match")
        return (False, 0.0, "No match")


class TestEntityMatcher:
    """Tests for base EntityMatcher class."""
    
    def test_weight_validation_passes(self) -> None:
        # Should not raise - weights sum to 1.0
        candidates = [DummyEntity("1", "Test")]
        matcher = DummyMatcher(candidates)
        assert matcher is not None
    
    def test_weight_validation_fails(self) -> None:
        class BadMatcher(EntityMatcher[DummyEntity, DummyData]):
            def _configure_signals(self) -> list[SignalConfig]:
                return [
                    SignalConfig("a", 0.3, lambda e: (True, 1.0, None)),
                    SignalConfig("b", 0.3, lambda e: (True, 1.0, None)),
                    # Total = 0.6, not 1.0
                ]
            
            def _extract_id(self, entity: DummyEntity) -> str:
                return entity.id
        
        with pytest.raises(ValueError, match="weights must sum to 1.0"):
            BadMatcher([])
    
    def test_match_exact(self) -> None:
        candidates = [
            DummyEntity("1", "Ferrari"),
            DummyEntity("2", "Mercedes"),
            DummyEntity("3", "Red Bull"),
        ]
        matcher = DummyMatcher(candidates)
        
        result = matcher.match(DummyData("Ferrari"))
        
        assert result.confidence == ConfidenceLevel.HIGH
        assert result.matched_entity.name == "Ferrari"
        assert result.score == 1.0
    
    def test_match_partial(self) -> None:
        candidates = [
            DummyEntity("1", "Oracle Red Bull Racing"),
            DummyEntity("2", "Mercedes"),
        ]
        matcher = DummyMatcher(candidates)
        
        result = matcher.match(DummyData("Red Bull"))
        
        # Only partial_name matches (0.4 weight), exact doesn't
        assert result.score == pytest.approx(0.4)
        assert result.matched_entity.name == "Oracle Red Bull Racing"
    
    def test_match_no_candidates(self) -> None:
        matcher = DummyMatcher([])
        result = matcher.match(DummyData("Ferrari"))
        
        assert result.confidence == ConfidenceLevel.NO_MATCH
        assert result.is_new is True
    
    def test_match_all(self) -> None:
        candidates = [
            DummyEntity("1", "Red Bull"),
            DummyEntity("2", "Red Bull Racing"),
            DummyEntity("3", "Oracle Red Bull Racing"),
        ]
        matcher = DummyMatcher(candidates)
        
        results = matcher.match_all(DummyData("Red Bull"))
        
        # All should match with varying confidence
        assert len(results) > 0
        # Should be sorted by score descending
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)
