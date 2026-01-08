"""
Data source adapters for racing data ingestion.

This package provides a unified interface for fetching racing data from
different sources (OpenF1, Ergast, future scrapers, etc.) and transforming
them into our internal domain models.
"""

from ingestion.sources.base import (
    BaseDataSource,
    DataSourceError,
    DataSourceRateLimited,
    DataSourceUnavailable,
    SourceCircuit,
    SourceDriver,
    SourceEntrant,
    SourceMeeting,
    SourceMeetingData,
    SourceResult,
    SourceResultStatus,
    SourceSession,
    SourceSessionStatus,
    SourceSessionType,
    SourceTeam,
)
from ingestion.sources.ergast import ErgastDataSource, ErgastConfig
from ingestion.sources.openf1 import OpenF1DataSource

__all__ = [
    # Base classes
    "BaseDataSource",
    "DataSourceError",
    "DataSourceRateLimited",
    "DataSourceUnavailable",
    # Source models
    "SourceCircuit",
    "SourceDriver",
    "SourceEntrant",
    "SourceMeeting",
    "SourceMeetingData",
    "SourceResult",
    "SourceResultStatus",
    "SourceSession",
    "SourceSessionStatus",
    "SourceSessionType",
    "SourceTeam",
    # Data sources
    "ErgastConfig",
    "ErgastDataSource",
    "OpenF1DataSource",
]
