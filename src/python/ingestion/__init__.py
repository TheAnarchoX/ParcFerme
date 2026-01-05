"""
Parc Fermé Data Ingestion Pipeline

Fetches racing data from OpenF1 and other sources,
normalizes it, and loads into the PostgreSQL database.
"""

from ingestion.clients.openf1 import OpenF1Client
from ingestion.config import settings
from ingestion.models import (
    Circuit,
    Driver,
    Entrant,
    Result,
    ResultStatus,
    Round,
    Season,
    Series,
    Session,
    SessionStatus,
    SessionType,
    Team,
)
from ingestion.repository import RacingRepository
from ingestion.sync import OpenF1SyncService

__version__ = "0.1.0"

__all__ = [
    # Clients
    "OpenF1Client",
    # Config
    "settings",
    # Models
    "Circuit",
    "Driver",
    "Entrant",
    "Result",
    "ResultStatus",
    "Round",
    "Season",
    "Series",
    "Session",
    "SessionStatus",
    "SessionType",
    "Team",
    # Repository
    "RacingRepository",
    # Sync
    "OpenF1SyncService",
]
