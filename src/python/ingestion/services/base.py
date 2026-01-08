"""
Base sync service for racing data ingestion.

This module provides a generic sync service that works with any data source
implementing the BaseDataSource protocol. It handles:
- Entity resolution and matching
- Alias creation for name/number variations
- Database upserts
- Caching for efficiency
- Progress tracking and logging

Specific sync services (OpenF1, Ergast) extend this base to add
source-specific logic and optimizations.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Generic, TypeVar
from uuid import UUID

import structlog  # type: ignore

from ingestion.entity_resolver import EntityResolver
from ingestion.models import (
    Circuit,
    Driver,
    DriverAlias,
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
    TeamAlias,
    slugify,
)
from ingestion.repository import RacingRepository
from ingestion.sources.base import (
    BaseDataSource,
    SourceCircuit,
    SourceDriver,
    SourceEntrant,
    SourceMeeting,
    SourceResult,
    SourceResultStatus,
    SourceSession,
    SourceSessionStatus,
    SourceSessionType,
    SourceTeam,
)
from ingestion.sync import SyncOptions

logger = structlog.get_logger()

# Type variable for the data source
TDataSource = TypeVar("TDataSource", bound=BaseDataSource)


@dataclass
class SyncStats:
    """Statistics from a sync operation."""
    year: int
    meetings_synced: int = 0
    sessions_synced: int = 0
    drivers_synced: int = 0
    teams_synced: int = 0
    circuits_synced: int = 0
    entrants_synced: int = 0
    results_synced: int = 0
    errors: list[str] | None = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "year": self.year,
            "meetings_synced": self.meetings_synced,
            "sessions_synced": self.sessions_synced,
            "drivers_synced": self.drivers_synced,
            "teams_synced": self.teams_synced,
            "circuits_synced": self.circuits_synced,
            "entrants_synced": self.entrants_synced,
            "results_synced": self.results_synced,
            "errors": self.errors or [],
        }


class BaseSyncService(ABC, Generic[TDataSource]):
    """Base class for sync services.
    
    Provides common functionality for syncing racing data from any source.
    Subclasses must provide a data source and can override methods for
    source-specific behavior.
    """
    
    def __init__(
        self,
        data_source: TDataSource | None = None,
        repository: RacingRepository | None = None,
    ) -> None:
        self._data_source = data_source
        self._repository = repository
        self._owns_clients = False
        self._entity_resolver: EntityResolver | None = None
        
        # Caches to avoid repeated DB lookups during a sync
        self._series_id: UUID | None = None
        self._season_cache: dict[int, UUID] = {}  # year -> season_id
        self._circuit_cache: dict[str, UUID] = {}  # slug -> circuit_id
        self._driver_cache: dict[str, UUID] = {}  # slug or number -> driver_id
        self._team_cache: dict[str, UUID] = {}  # slug -> team_id
    
    @property
    @abstractmethod
    def data_source_class(self) -> type[TDataSource]:
        """Return the data source class to instantiate if none provided."""
        pass
    
    @property
    def series_slug(self) -> str:
        """Slug for the series this sync service handles."""
        if self._data_source:
            return self._data_source.default_series_slug
        return "formula-1"
    
    @property
    def series_name(self) -> str:
        """Name for the series this sync service handles."""
        if self._data_source:
            return self._data_source.default_series_name
        return "Formula 1"
    
    def _ensure_clients(self) -> tuple[TDataSource, RacingRepository]:
        """Ensure data source and repository are available."""
        if self._data_source is None:
            self._data_source = self.data_source_class()
            self._owns_clients = True
        if self._repository is None:
            self._repository = RacingRepository()
            self._repository.connect()
            self._owns_clients = True
        if self._entity_resolver is None:
            self._entity_resolver = EntityResolver(
                repository=self._repository,
                series_id=self._series_id,
            )
        return self._data_source, self._repository
    
    def close(self) -> None:
        """Close owned clients."""
        if self._owns_clients:
            if self._data_source:
                self._data_source.close()
            if self._repository:
                self._repository.close()
    
    def __enter__(self) -> "BaseSyncService":
        self._ensure_clients()
        return self
    
    def __exit__(self, *args) -> None:
        self.close()
    
    def clear_caches(self) -> None:
        """Clear all in-memory caches."""
        self._series_id = None
        self._season_cache.clear()
        self._circuit_cache.clear()
        self._driver_cache.clear()
        self._team_cache.clear()
        if self._entity_resolver:
            self._entity_resolver = None
    
    # =========================================================================
    # Core Entity Operations
    # =========================================================================
    
    def _ensure_series(self, repo: RacingRepository) -> UUID:
        """Ensure series exists in database."""
        if self._series_id:
            return self._series_id
        
        existing = repo.get_series_by_slug(self.series_slug)
        if existing:
            self._series_id = existing.id
            if self._entity_resolver:
                self._entity_resolver.series_id = existing.id
            return existing.id
        
        series = Series(name=self.series_name, slug=self.series_slug)
        self._series_id = repo.upsert_series(series)
        logger.info("Created series", name=self.series_name, series_id=str(self._series_id))
        if self._entity_resolver:
            self._entity_resolver.series_id = self._series_id
        return self._series_id
    
    def _ensure_season(self, repo: RacingRepository, year: int) -> UUID:
        """Ensure season exists for year."""
        if year in self._season_cache:
            return self._season_cache[year]
        
        series_id = self._ensure_series(repo)
        existing = repo.get_season(series_id, year)
        if existing:
            self._season_cache[year] = existing.id
            return existing.id
        
        season = Season(series_id=series_id, year=year)
        season_id = repo.upsert_season(season)
        self._season_cache[year] = season_id
        logger.info("Created season", year=year, season_id=str(season_id))
        return season_id
    
    def _get_or_create_circuit(
        self,
        repo: RacingRepository,
        source_circuit: SourceCircuit,
        options: SyncOptions,
    ) -> UUID:
        """Get or create a circuit from source data."""
        slug = slugify(source_circuit.short_name or source_circuit.name)
        
        if slug in self._circuit_cache:
            return self._circuit_cache[slug]
        
        existing = repo.get_circuit_by_slug(slug)
        if existing:
            self._circuit_cache[slug] = existing.id
            if options.circuit_mode == "create_only" and options.log_skipped_updates:
                logger.debug("Circuit exists, skipping update", slug=slug)
            return existing.id
        
        if options.circuit_mode == "skip":
            logger.warning("Circuit not found but skip mode enabled", slug=slug)
            raise ValueError(f"Circuit not found: {slug}")
        
        circuit = Circuit(
            name=source_circuit.name,
            slug=slug,
            location=source_circuit.location or source_circuit.name,
            country=source_circuit.country or "",
            country_code=source_circuit.country_code,
            latitude=source_circuit.latitude,
            longitude=source_circuit.longitude,
            length_meters=source_circuit.length_meters,
        )
        circuit_id = repo.upsert_circuit(circuit)
        self._circuit_cache[slug] = circuit_id
        logger.info("Created circuit", name=circuit.name, circuit_id=str(circuit_id))
        return circuit_id
    
    def _get_or_create_driver(
        self,
        repo: RacingRepository,
        source_driver: SourceDriver,
        options: SyncOptions,
    ) -> UUID:
        """Get or create a driver from source data.
        
        Uses EntityResolver for intelligent matching and alias tracking.
        """
        # Check cache first
        cache_key = str(source_driver.driver_number) if source_driver.driver_number else slugify(source_driver.full_name)
        if cache_key in self._driver_cache:
            return self._driver_cache[cache_key]
        
        assert self._entity_resolver is not None
        
        resolved = self._entity_resolver.resolve_driver(
            full_name=source_driver.full_name,
            first_name=source_driver.first_name,
            last_name=source_driver.last_name,
            driver_number=source_driver.driver_number,
            abbreviation=source_driver.abbreviation,
            nationality=source_driver.country_code or source_driver.nationality,
            headshot_url=source_driver.headshot_url,
        )
        
        if resolved.is_new:
            if options.driver_mode == "skip":
                logger.warning("New driver found but skip mode enabled", name=source_driver.full_name)
                raise ValueError(f"Driver not found: {source_driver.full_name}")
            
            logger.info(
                "Creating new driver",
                name=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                number=resolved.driver.driver_number,
            )
            driver_id = repo.upsert_driver(resolved.driver)
        else:
            existing = resolved.driver
            driver_id = resolved.existing_id
            
            if options.driver_mode == "skip":
                self._driver_cache[cache_key] = driver_id
                return driver_id
            
            if options.driver_mode == "create_only":
                if options.auto_create_driver_aliases:
                    self._create_driver_aliases(repo, existing, source_driver, resolved.aliases_to_add)
                self._driver_cache[cache_key] = driver_id
                return driver_id
            
            # Full mode - apply updates with optional preservation
            if options.preserve_canonical_names:
                resolved.driver.first_name = existing.first_name
                resolved.driver.last_name = existing.last_name
                resolved.driver.slug = existing.slug
            
            if options.preserve_canonical_numbers and source_driver.driver_number != existing.driver_number:
                resolved.driver.driver_number = existing.driver_number
                # Add incoming number as alias
                if source_driver.driver_number:
                    incoming_alias = DriverAlias(
                        driver_id=driver_id,
                        alias_name=source_driver.full_name,
                        alias_slug=slugify(source_driver.full_name),
                        series_id=self._series_id,
                        driver_number=source_driver.driver_number,
                        source=f"{self._data_source.source_name}-number-variation" if self._data_source else "sync",
                    )
                    resolved.aliases_to_add.append(incoming_alias)
            
            driver_id = repo.upsert_driver(resolved.driver)
        
        # Update caches
        resolved.driver.id = driver_id
        self._entity_resolver.update_cache_after_upsert(driver=resolved.driver)
        
        # Add aliases
        for alias in resolved.aliases_to_add:
            alias.driver_id = driver_id
            repo.upsert_driver_alias(alias)
            self._entity_resolver.add_alias_to_cache(driver_alias=alias)
        
        self._driver_cache[cache_key] = driver_id
        return driver_id
    
    def _create_driver_aliases(
        self,
        repo: RacingRepository,
        existing_driver: Driver,
        source_driver: SourceDriver,
        additional_aliases: list[DriverAlias],
    ) -> None:
        """Create aliases for a driver without updating the driver itself."""
        aliases_to_add = list(additional_aliases)
        source_name = self._data_source.source_name if self._data_source else "sync"
        
        # If incoming driver number differs, create alias
        if source_driver.driver_number and source_driver.driver_number != existing_driver.driver_number:
            number_alias = DriverAlias(
                driver_id=existing_driver.id,
                alias_name=source_driver.full_name,
                alias_slug=slugify(source_driver.full_name),
                series_id=self._series_id,
                driver_number=source_driver.driver_number,
                source=f"{source_name}-number-variation",
            )
            aliases_to_add.append(number_alias)
        
        # Upsert all aliases
        for alias in aliases_to_add:
            alias.driver_id = existing_driver.id
            repo.upsert_driver_alias(alias)
            if self._entity_resolver:
                self._entity_resolver.add_alias_to_cache(driver_alias=alias)
    
    def _get_or_create_team(
        self,
        repo: RacingRepository,
        source_team: SourceTeam,
        options: SyncOptions,
    ) -> UUID:
        """Get or create a team from source data."""
        slug = slugify(source_team.name)
        
        if slug in self._team_cache:
            return self._team_cache[slug]
        
        assert self._entity_resolver is not None
        
        resolved = self._entity_resolver.resolve_team(
            name=source_team.name,
            primary_color=source_team.primary_color,
        )
        
        if resolved.is_new:
            if options.team_mode == "skip":
                logger.warning("New team found but skip mode enabled", name=source_team.name)
                raise ValueError(f"Team not found: {source_team.name}")
            
            logger.info("Creating new team", name=resolved.team.name)
            team_id = repo.upsert_team(resolved.team)
        else:
            existing = resolved.team
            team_id = resolved.existing_id
            
            if options.team_mode == "skip":
                self._team_cache[slug] = team_id
                self._team_cache[resolved.team.slug] = team_id
                return team_id
            
            if options.team_mode == "create_only":
                if options.auto_create_team_aliases:
                    self._create_team_aliases(repo, existing, source_team, resolved.aliases_to_add)
                self._team_cache[slug] = team_id
                self._team_cache[resolved.team.slug] = team_id
                return team_id
            
            if options.preserve_canonical_names:
                resolved.team.name = existing.name
                resolved.team.slug = existing.slug
            
            team_id = repo.upsert_team(resolved.team)
        
        # Update caches
        resolved.team.id = team_id
        self._entity_resolver.update_cache_after_upsert(team=resolved.team)
        
        # Add aliases
        for alias in resolved.aliases_to_add:
            alias.team_id = team_id
            repo.upsert_team_alias(alias)
            self._entity_resolver.add_alias_to_cache(team_alias=alias)
        
        self._team_cache[slug] = team_id
        self._team_cache[resolved.team.slug] = team_id
        return team_id
    
    def _create_team_aliases(
        self,
        repo: RacingRepository,
        existing_team: Team,
        source_team: SourceTeam,
        additional_aliases: list[TeamAlias],
    ) -> None:
        """Create aliases for a team without updating the team itself."""
        aliases_to_add = list(additional_aliases)
        source_name = self._data_source.source_name if self._data_source else "sync"
        
        incoming_slug = slugify(source_team.name)
        if incoming_slug != existing_team.slug:
            name_alias = TeamAlias(
                team_id=existing_team.id,
                alias_name=source_team.name,
                alias_slug=incoming_slug,
                series_id=self._series_id,
                source=f"{source_name}-name-variation",
            )
            aliases_to_add.append(name_alias)
        
        for alias in aliases_to_add:
            alias.team_id = existing_team.id
            repo.upsert_team_alias(alias)
            if self._entity_resolver:
                self._entity_resolver.add_alias_to_cache(team_alias=alias)
    
    # =========================================================================
    # Type Mappings
    # =========================================================================
    
    def _map_session_type(self, source_type: SourceSessionType) -> SessionType:
        """Map source session type to domain session type."""
        mapping = {
            SourceSessionType.PRACTICE_1: SessionType.FP1,
            SourceSessionType.PRACTICE_2: SessionType.FP2,
            SourceSessionType.PRACTICE_3: SessionType.FP3,
            SourceSessionType.QUALIFYING: SessionType.QUALIFYING,
            SourceSessionType.SPRINT_QUALIFYING: SessionType.SPRINT_QUALIFYING,
            SourceSessionType.SPRINT: SessionType.SPRINT,
            SourceSessionType.RACE: SessionType.RACE,
            SourceSessionType.WARMUP: SessionType.WARMUP,
        }
        return mapping.get(source_type, SessionType.RACE)
    
    def _map_session_status(self, source_status: SourceSessionStatus) -> SessionStatus:
        """Map source session status to domain session status."""
        mapping = {
            SourceSessionStatus.SCHEDULED: SessionStatus.SCHEDULED,
            SourceSessionStatus.IN_PROGRESS: SessionStatus.IN_PROGRESS,
            SourceSessionStatus.COMPLETED: SessionStatus.COMPLETED,
            SourceSessionStatus.CANCELLED: SessionStatus.CANCELLED,
        }
        return mapping.get(source_status, SessionStatus.SCHEDULED)
    
    def _map_result_status(self, source_status: SourceResultStatus) -> ResultStatus:
        """Map source result status to domain result status."""
        mapping = {
            SourceResultStatus.FINISHED: ResultStatus.FINISHED,
            SourceResultStatus.DNF: ResultStatus.DNF,
            SourceResultStatus.DNS: ResultStatus.DNS,
            SourceResultStatus.DSQ: ResultStatus.DSQ,
            SourceResultStatus.NC: ResultStatus.NC,
        }
        return mapping.get(source_status, ResultStatus.FINISHED)
    
    # =========================================================================
    # High-Level Sync Operations
    # =========================================================================
    
    def sync_year(
        self,
        year: int,
        include_results: bool = True,
        options: SyncOptions | None = None,
    ) -> SyncStats:
        """Sync all data for a given year.
        
        Args:
            year: The season year
            include_results: Whether to fetch and store results
            options: SyncOptions controlling entity update behavior
            
        Returns:
            SyncStats with operation statistics
        """
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions()
        
        stats = SyncStats(year=year)
        
        logger.info("Starting sync", year=year, include_results=include_results)
        
        # Ensure series and season exist
        print(f"  🔧 Ensuring series and {year} season exist...")
        season_id = self._ensure_season(repo, year)
        
        # Fetch meetings
        print(f"  📡 Fetching meetings from {data_source.source_name}...")
        try:
            meetings = data_source.get_meetings(year)
        except Exception as e:
            logger.error("Failed to fetch meetings", year=year, error=str(e))
            stats.errors.append(f"Failed to fetch meetings: {e}")
            return stats
        
        print(f"  📋 Found {len(meetings)} meetings for {year}")
        logger.info("Found meetings", count=len(meetings), year=year)
        
        # Sort by date and calculate round numbers
        sorted_meetings = sorted(meetings, key=lambda m: m.date_start)
        round_number_map = self._calculate_round_numbers(sorted_meetings)
        
        for i, meeting in enumerate(sorted_meetings, 1):
            round_number = round_number_map.get(meeting.source_id or str(i), i)
            meeting_type = "Testing" if round_number == 0 else f"Round {round_number}"
            print(f"\n  🏎️  [{i}/{len(sorted_meetings)}] {meeting.name} ({meeting_type})")
            
            try:
                self._sync_meeting(
                    data_source, repo, meeting, season_id, include_results, stats, round_number, options
                )
                stats.meetings_synced += 1
            except Exception as e:
                print(f"      ❌ Error: {e}")
                logger.error("Failed to sync meeting", meeting=meeting.name, error=str(e))
                stats.errors.append(f"Meeting {meeting.name}: {e}")
        
        logger.info("Sync completed", stats=stats.to_dict())
        return stats
    
    def _calculate_round_numbers(self, meetings: list[SourceMeeting]) -> dict[str, int]:
        """Calculate round numbers for meetings.
        
        Override this for source-specific logic (e.g., handling testing events).
        """
        round_number_map: dict[str, int] = {}
        race_number = 0
        
        for meeting in meetings:
            meeting_key = meeting.source_id or meeting.name
            name_lower = meeting.name.lower()
            
            if "pre-season" in name_lower or "testing" in name_lower:
                round_number_map[meeting_key] = 0
            elif meeting.round_number is not None:
                round_number_map[meeting_key] = meeting.round_number
            else:
                race_number += 1
                round_number_map[meeting_key] = race_number
        
        return round_number_map
    
    @abstractmethod
    def _sync_meeting(
        self,
        data_source: TDataSource,
        repo: RacingRepository,
        meeting: SourceMeeting,
        season_id: UUID,
        include_results: bool,
        stats: SyncStats,
        round_number: int,
        options: SyncOptions,
    ) -> None:
        """Sync a single meeting. Subclasses must implement this."""
        pass
    
    # =========================================================================
    # Reference Data Import
    # =========================================================================
    
    def import_circuits(self, options: SyncOptions | None = None) -> dict[str, int]:
        """Import all circuits from the data source.
        
        Returns:
            Dict with 'created' and 'updated' counts
        """
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions()
        
        counts = {"created": 0, "updated": 0, "skipped": 0}
        
        try:
            circuits = data_source.get_all_circuits()
        except NotImplementedError:
            logger.warning("Data source does not support bulk circuit fetch")
            return counts
        
        for source_circuit in circuits:
            try:
                slug = slugify(source_circuit.short_name or source_circuit.name)
                existing = repo.get_circuit_by_slug(slug)
                
                if existing:
                    if options.circuit_mode == "create_only":
                        counts["skipped"] += 1
                        continue
                    counts["updated"] += 1
                else:
                    counts["created"] += 1
                
                self._get_or_create_circuit(repo, source_circuit, options)
            except Exception as e:
                logger.warning("Failed to import circuit", name=source_circuit.name, error=str(e))
        
        return counts
    
    def import_drivers(self, options: SyncOptions | None = None) -> dict[str, int]:
        """Import all drivers from the data source."""
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions()
        
        counts = {"created": 0, "updated": 0, "skipped": 0}
        
        try:
            drivers = data_source.get_all_drivers()
        except NotImplementedError:
            logger.warning("Data source does not support bulk driver fetch")
            return counts
        
        for source_driver in drivers:
            try:
                slug = slugify(source_driver.full_name)
                # Use entity resolver to check if driver exists
                # For simplicity, just track counts here
                self._get_or_create_driver(repo, source_driver, options)
                counts["created"] += 1  # Simplified counting
            except ValueError:
                counts["skipped"] += 1
            except Exception as e:
                logger.warning("Failed to import driver", name=source_driver.full_name, error=str(e))
        
        return counts
    
    def import_teams(self, options: SyncOptions | None = None) -> dict[str, int]:
        """Import all teams from the data source."""
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions()
        
        counts = {"created": 0, "updated": 0, "skipped": 0}
        
        try:
            teams = data_source.get_all_teams()
        except NotImplementedError:
            logger.warning("Data source does not support bulk team fetch")
            return counts
        
        for source_team in teams:
            try:
                self._get_or_create_team(repo, source_team, options)
                counts["created"] += 1  # Simplified counting
            except ValueError:
                counts["skipped"] += 1
            except Exception as e:
                logger.warning("Failed to import team", name=source_team.name, error=str(e))
        
        return counts
