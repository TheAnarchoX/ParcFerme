"""
Sync services for racing data ingestion.

This package provides sync services that orchestrate data ingestion
from various sources (OpenF1, Ergast) into the ParcFerme database.
"""

from ingestion.services.base import BaseSyncService, SyncStats
from ingestion.services.ergast import ErgastSyncService

__all__ = [
    "BaseSyncService",
    "SyncStats",
    "ErgastSyncService",
]
