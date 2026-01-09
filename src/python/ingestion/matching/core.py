"""
Core types and base classes for the entity matching framework.

This module defines the fundamental building blocks:
- ConfidenceLevel: Enum for match confidence thresholds
- MatchSignal: Individual signal result (name match, number match, etc.)
- MatchResult: Complete match result with score and signals used
- EntityMatcher: Base class for all entity matchers
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Generic, TypeVar
from uuid import UUID

T = TypeVar("T")  # Entity type (Driver, Team, Circuit)
D = TypeVar("D")  # Data type (incoming data dict or dataclass)


class ConfidenceLevel(Enum):
    """Confidence level for entity matches.
    
    Decision thresholds:
    - HIGH (≥0.9): Auto-match, high confidence
    - MEDIUM (0.7-0.9): Auto-match with alias creation
    - LOW (0.5-0.7): Flag for human review
    - NO_MATCH (<0.5): Create new entity
    """
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NO_MATCH = "no_match"

    @classmethod
    def from_score(cls, score: float) -> ConfidenceLevel:
        """Determine confidence level from a score."""
        if score >= 0.9:
            return cls.HIGH
        elif score >= 0.7:
            return cls.MEDIUM
        elif score >= 0.5:
            return cls.LOW
        else:
            return cls.NO_MATCH


@dataclass
class MatchSignal:
    """Result of evaluating a single matching signal.
    
    Attributes:
        name: Signal identifier (e.g., "last_name", "driver_number")
        weight: Signal weight (0.0-1.0), should sum to 1.0 across all signals
        matched: Whether the signal matched (True/False/partial)
        score: Signal score (0.0-1.0) - can be partial for fuzzy matches
        raw_score: The weighted score (score * weight)
        details: Human-readable explanation of the match
    """
    name: str
    weight: float
    matched: bool
    score: float
    details: str | None = None
    
    @property
    def raw_score(self) -> float:
        """Calculate weighted score contribution."""
        return self.score * self.weight


@dataclass
class MatchResult(Generic[T]):
    """Complete result of a match operation.
    
    Attributes:
        score: Final combined score (0.0-1.0)
        confidence: Confidence level based on score thresholds
        matched_entity: The matched entity (None if no match)
        matched_entity_id: ID of matched entity (for lazy loading)
        signals: List of individual signal results
        is_new: True if no match found (create new entity)
    """
    score: float
    confidence: ConfidenceLevel
    matched_entity: T | None
    matched_entity_id: UUID | None
    signals: list[MatchSignal] = field(default_factory=list)
    is_new: bool = False
    
    @classmethod
    def no_match(cls) -> MatchResult[T]:
        """Create a no-match result for creating new entities."""
        return cls(
            score=0.0,
            confidence=ConfidenceLevel.NO_MATCH,
            matched_entity=None,
            matched_entity_id=None,
            signals=[],
            is_new=True,
        )
    
    @classmethod
    def from_signals(
        cls,
        entity: T,
        entity_id: UUID,
        signals: list[MatchSignal],
    ) -> MatchResult[T]:
        """Create a match result from evaluated signals."""
        total_score = sum(s.raw_score for s in signals)
        confidence = ConfidenceLevel.from_score(total_score)
        
        return cls(
            score=total_score,
            confidence=confidence,
            matched_entity=entity,
            matched_entity_id=entity_id,
            signals=signals,
            is_new=(confidence == ConfidenceLevel.NO_MATCH),
        )

    def get_signal(self, name: str) -> MatchSignal | None:
        """Get a specific signal by name."""
        for signal in self.signals:
            if signal.name == name:
                return signal
        return None
    
    def explain(self) -> str:
        """Generate human-readable explanation of the match."""
        lines = [
            f"Score: {self.score:.3f} ({self.confidence.value})",
            f"Matched: {self.matched_entity is not None}",
            "Signals:",
        ]
        for signal in sorted(self.signals, key=lambda s: -s.raw_score):
            status = "✓" if signal.matched else "✗"
            lines.append(
                f"  {status} {signal.name}: {signal.score:.2f} × {signal.weight:.2f} = {signal.raw_score:.3f}"
            )
            if signal.details:
                lines.append(f"      {signal.details}")
        return "\n".join(lines)


# Type for signal function: takes entity and returns (matched, score, details)
SignalFunc = Callable[[T], tuple[bool, float, str | None]]


@dataclass
class SignalConfig:
    """Configuration for a matching signal.
    
    Attributes:
        name: Signal identifier
        weight: Signal weight (should sum to 1.0 with other signals)
        func: Function that evaluates the signal against an entity
    """
    name: str
    weight: float
    func: SignalFunc


class EntityMatcher(ABC, Generic[T, D]):
    """Base class for entity matchers with pluggable signal functions.
    
    Subclasses should:
    1. Define _configure_signals() to set up signal functions
    2. Implement _extract_id() to get entity ID
    3. Optionally override _pre_filter() for fast rejection
    
    Example:
        class DriverMatcher(EntityMatcher[Driver, DriverData]):
            def _configure_signals(self) -> list[SignalConfig]:
                return [
                    SignalConfig("last_name", 0.3, self._check_last_name),
                    SignalConfig("first_name", 0.2, self._check_first_name),
                    ...
                ]
    """
    
    def __init__(self, candidates: list[T]) -> None:
        """Initialize matcher with candidate entities.
        
        Args:
            candidates: List of existing entities to match against
        """
        self._candidates = candidates
        self._signals = self._configure_signals()
        self._validate_weights()
        self._incoming_data: D | None = None
    
    def _validate_weights(self) -> None:
        """Validate that signal weights sum to approximately 1.0."""
        total_weight = sum(s.weight for s in self._signals)
        if not (0.99 <= total_weight <= 1.01):
            signal_names = [s.name for s in self._signals]
            raise ValueError(
                f"Signal weights must sum to 1.0, got {total_weight:.3f}. "
                f"Signals: {signal_names}"
            )
    
    @abstractmethod
    def _configure_signals(self) -> list[SignalConfig]:
        """Configure matching signals with weights.
        
        Returns:
            List of SignalConfig with signal name, weight, and evaluation function
        """
        ...
    
    @abstractmethod
    def _extract_id(self, entity: T) -> UUID:
        """Extract the unique ID from an entity."""
        ...
    
    def _pre_filter(self, entity: T) -> bool:
        """Optional fast rejection filter.
        
        Override to quickly skip entities that can't possibly match.
        Return True to include entity in scoring, False to skip.
        """
        return True
    
    def _set_incoming_data(self, data: D) -> None:
        """Set the incoming data for signal evaluation.
        
        This is called before evaluating signals so they can access
        the incoming data via self._incoming_data.
        """
        self._incoming_data = data
    
    def _evaluate_signals(self, entity: T) -> list[MatchSignal]:
        """Evaluate all signals against an entity."""
        signals = []
        for config in self._signals:
            matched, score, details = config.func(entity)
            signals.append(MatchSignal(
                name=config.name,
                weight=config.weight,
                matched=matched,
                score=score,
                details=details,
            ))
        return signals
    
    def match(self, incoming_data: D) -> MatchResult[T]:
        """Find the best match for incoming data.
        
        Args:
            incoming_data: Data about the entity to match
            
        Returns:
            MatchResult with the best match (or no_match if none found)
        """
        self._set_incoming_data(incoming_data)
        
        best_result: MatchResult[T] | None = None
        
        for candidate in self._candidates:
            # Fast rejection
            if not self._pre_filter(candidate):
                continue
            
            # Evaluate all signals
            signals = self._evaluate_signals(candidate)
            result = MatchResult.from_signals(
                entity=candidate,
                entity_id=self._extract_id(candidate),
                signals=signals,
            )
            
            # Track best match
            if best_result is None or result.score > best_result.score:
                best_result = result
        
        # No candidates passed pre-filter
        if best_result is None:
            return MatchResult.no_match()
        
        # Check if best match meets minimum threshold
        if best_result.confidence == ConfidenceLevel.NO_MATCH:
            best_result.is_new = True
        
        return best_result
    
    def match_all(self, incoming_data: D, min_confidence: ConfidenceLevel = ConfidenceLevel.LOW) -> list[MatchResult[T]]:
        """Find all matches above a confidence threshold.
        
        Useful for identifying potential duplicates or ambiguous matches.
        
        Args:
            incoming_data: Data about the entity to match
            min_confidence: Minimum confidence to include
            
        Returns:
            List of MatchResults sorted by score (descending)
        """
        self._set_incoming_data(incoming_data)
        
        results = []
        confidence_order = [
            ConfidenceLevel.HIGH,
            ConfidenceLevel.MEDIUM,
            ConfidenceLevel.LOW,
            ConfidenceLevel.NO_MATCH,
        ]
        min_index = confidence_order.index(min_confidence)
        
        for candidate in self._candidates:
            if not self._pre_filter(candidate):
                continue
            
            signals = self._evaluate_signals(candidate)
            result = MatchResult.from_signals(
                entity=candidate,
                entity_id=self._extract_id(candidate),
                signals=signals,
            )
            
            # Filter by confidence
            result_index = confidence_order.index(result.confidence)
            if result_index <= min_index:
                results.append(result)
        
        # Sort by score descending
        results.sort(key=lambda r: -r.score)
        return results
