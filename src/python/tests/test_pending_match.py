"""
Tests for PendingMatch model and review functionality.
"""

import pytest
from uuid import uuid4
from datetime import datetime

from ingestion.models import (
    PendingMatch,
    PendingMatchEntityType,
    PendingMatchStatus,
    PendingMatchResolution,
)


class TestPendingMatchModel:
    """Test PendingMatch model creation and validation."""

    def test_create_pending_match(self):
        """Test creating a basic pending match."""
        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.DRIVER,
            incoming_name="Kimi Antonelli",
            candidate_entity_id=uuid4(),
            match_score=0.65,
            source="OpenF1-2024",
            status=PendingMatchStatus.PENDING,
        )

        assert match.entity_type == PendingMatchEntityType.DRIVER
        assert match.incoming_name == "Kimi Antonelli"
        assert match.match_score == 0.65
        assert match.status == PendingMatchStatus.PENDING

    def test_pending_match_with_json_data(self):
        """Test pending match with incoming data and signals as JSON strings."""
        import json
        incoming_data = {
            "first_name": "Kimi",
            "last_name": "Antonelli",
            "abbreviation": "ANT",
        }
        signals = [
            {"name": "abbreviation", "score": 1.0, "weight": 0.2},
            {"name": "fuzzy_full_name", "score": 0.8, "weight": 0.35},
        ]

        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.DRIVER,
            incoming_name="Kimi Antonelli",
            incoming_data_json=json.dumps(incoming_data),
            candidate_entity_id=uuid4(),
            match_score=0.65,
            signals_json=json.dumps(signals),
            source="OpenF1-2024",
            status=PendingMatchStatus.PENDING,
        )

        assert match.incoming_data_json is not None
        parsed_data = json.loads(match.incoming_data_json)
        assert parsed_data["first_name"] == "Kimi"
        
        parsed_signals = json.loads(match.signals_json)
        assert len(parsed_signals) == 2
        assert parsed_signals[0]["name"] == "abbreviation"

    def test_pending_match_with_no_candidate(self):
        """Test pending match with no suggested candidate."""
        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.CIRCUIT,
            incoming_name="New Street Circuit",
            candidate_entity_id=None,
            match_score=0.0,
            source="community",
            status=PendingMatchStatus.PENDING,
        )

        assert match.candidate_entity_id is None
        assert match.match_score == 0.0


class TestPendingMatchEnums:
    """Test PendingMatch enums."""

    def test_entity_type_enum(self):
        """Test entity type enum values (integers matching C# model)."""
        assert PendingMatchEntityType.DRIVER.value == 0
        assert PendingMatchEntityType.TEAM.value == 1
        assert PendingMatchEntityType.CIRCUIT.value == 2
        assert PendingMatchEntityType.ROUND.value == 3

    def test_status_enum(self):
        """Test status enum values (integers matching C# model)."""
        assert PendingMatchStatus.PENDING.value == 0
        assert PendingMatchStatus.APPROVED.value == 1
        assert PendingMatchStatus.REJECTED.value == 2
        assert PendingMatchStatus.MERGED.value == 3

    def test_resolution_enum(self):
        """Test resolution enum values (integers matching C# model)."""
        assert PendingMatchResolution.MATCH_EXISTING.value == 0
        assert PendingMatchResolution.CREATE_NEW.value == 1
        assert PendingMatchResolution.SKIP.value == 2


class TestPendingMatchStatusTransitions:
    """Test valid status transitions for pending matches."""

    def test_pending_to_approved(self):
        """Test transitioning from pending to approved."""
        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.DRIVER,
            incoming_name="Test Driver",
            candidate_entity_id=uuid4(),
            match_score=0.65,
            source="test",
            status=PendingMatchStatus.PENDING,
        )

        # Approve the match
        match.status = PendingMatchStatus.APPROVED
        match.resolution = PendingMatchResolution.MATCH_EXISTING
        match.resolved_at = datetime.utcnow()
        match.resolved_by = "test_user"

        assert match.status == PendingMatchStatus.APPROVED
        assert match.resolution == PendingMatchResolution.MATCH_EXISTING

    def test_pending_to_rejected(self):
        """Test transitioning from pending to rejected."""
        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.TEAM,
            incoming_name="New Racing Team",
            candidate_entity_id=uuid4(),
            match_score=0.55,
            source="test",
            status=PendingMatchStatus.PENDING,
        )

        # Reject and create new
        match.status = PendingMatchStatus.REJECTED
        match.resolution = PendingMatchResolution.CREATE_NEW
        match.resolved_at = datetime.utcnow()

        assert match.status == PendingMatchStatus.REJECTED
        assert match.resolution == PendingMatchResolution.CREATE_NEW


class TestPendingMatchFiltering:
    """Test filtering pending matches."""

    @pytest.fixture
    def sample_matches(self):
        """Create sample pending matches."""
        return [
            PendingMatch(
                id=uuid4(),
                entity_type=PendingMatchEntityType.DRIVER,
                incoming_name="Driver 1",
                candidate_entity_id=uuid4(),
                match_score=0.65,
                source="OpenF1",
                status=PendingMatchStatus.PENDING,
            ),
            PendingMatch(
                id=uuid4(),
                entity_type=PendingMatchEntityType.DRIVER,
                incoming_name="Driver 2",
                candidate_entity_id=uuid4(),
                match_score=0.75,
                source="OpenF1",
                status=PendingMatchStatus.APPROVED,
            ),
            PendingMatch(
                id=uuid4(),
                entity_type=PendingMatchEntityType.TEAM,
                incoming_name="Team 1",
                candidate_entity_id=uuid4(),
                match_score=0.55,
                source="Ergast",
                status=PendingMatchStatus.PENDING,
            ),
            PendingMatch(
                id=uuid4(),
                entity_type=PendingMatchEntityType.CIRCUIT,
                incoming_name="Circuit 1",
                candidate_entity_id=uuid4(),
                match_score=0.60,
                source="community",
                status=PendingMatchStatus.PENDING,
            ),
        ]

    def test_filter_by_entity_type(self, sample_matches):
        """Test filtering by entity type."""
        drivers = [
            m for m in sample_matches
            if m.entity_type == PendingMatchEntityType.DRIVER
        ]
        assert len(drivers) == 2

    def test_filter_by_status(self, sample_matches):
        """Test filtering by status."""
        pending = [
            m for m in sample_matches
            if m.status == PendingMatchStatus.PENDING
        ]
        assert len(pending) == 3

    def test_filter_by_score_range(self, sample_matches):
        """Test filtering by score range."""
        low_confidence = [
            m for m in sample_matches
            if 0.5 <= m.match_score < 0.7
        ]
        assert len(low_confidence) == 3

    def test_combined_filters(self, sample_matches):
        """Test combining multiple filters."""
        pending_drivers = [
            m for m in sample_matches
            if m.entity_type == PendingMatchEntityType.DRIVER
            and m.status == PendingMatchStatus.PENDING
        ]
        assert len(pending_drivers) == 1


class TestPendingMatchSerialization:
    """Test PendingMatch serialization."""

    def test_model_dump(self):
        """Test converting to dict."""
        match_id = uuid4()
        candidate_id = uuid4()

        match = PendingMatch(
            id=match_id,
            entity_type=PendingMatchEntityType.DRIVER,
            incoming_name="Test Driver",
            candidate_entity_id=candidate_id,
            match_score=0.65,
            source="test",
            status=PendingMatchStatus.PENDING,
        )

        data = match.model_dump()

        assert data["id"] == match_id
        assert data["entity_type"] == PendingMatchEntityType.DRIVER
        assert data["incoming_name"] == "Test Driver"
        assert data["candidate_entity_id"] == candidate_id

    def test_model_json(self):
        """Test JSON serialization."""
        match = PendingMatch(
            id=uuid4(),
            entity_type=PendingMatchEntityType.DRIVER,
            incoming_name="Test Driver",
            candidate_entity_id=uuid4(),
            match_score=0.65,
            source="test",
            status=PendingMatchStatus.PENDING,
        )

        json_str = match.model_dump_json()
        assert "Test Driver" in json_str
        # Entity type is serialized as integer (0 = DRIVER)
        assert '"entity_type":0' in json_str or '"entity_type": 0' in json_str
