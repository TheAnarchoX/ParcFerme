"""
Ergast Historical F1 Data Sync Service.

Imports historical F1 data (1950-2017) from the Ergast PostgreSQL database
into the ParcFerme database.
"""

from datetime import timedelta
from typing import Any
from uuid import UUID

import structlog  # type: ignore

from ingestion.entity_resolver import EntityResolver
from ingestion.matching.normalization import normalize_name
from ingestion.models import (
    Circuit,
    Driver,
    DriverAlias,
    Entrant,
    Result,
    ResultStatus,
    Round,
    Season,
    Session,
    SessionStatus,
    SessionType,
    Team,
    TeamAlias,
    slugify,
)
from ingestion.repository import RacingRepository
from ingestion.services import BaseSyncService, SyncStats
from ingestion.sources import (
    ErgastConfig,
    ErgastDataSource,
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


# Use normalize_name from matching module (imported above) instead of local function


class ErgastSyncService(BaseSyncService[ErgastDataSource]):
    """Service for syncing historical F1 data from Ergast archive.
    
    Handles the import of F1 data from 1950-2017, including:
    - Circuits (73 circuits)
    - Drivers (840 drivers) 
    - Teams/Constructors (208 teams)
    - Seasons (68 seasons)
    - Rounds/Races (976 race weekends)
    - Sessions (Race + Qualifying where available)
    - Results (23,657 race results, 7,397 qualifying results)
    
    The service uses our generic BaseDataSource interface and performs
    intelligent entity matching via EntityResolver to merge with existing
    data and create aliases for name/number variations.
    
    Usage:
        with ErgastSyncService() as service:
            # Import reference data first
            service.import_circuits()
            service.import_drivers()
            service.import_teams()
            
            # Then sync seasons
            for year in range(1950, 2018):
                service.sync_year(year)
    """
    
    def __init__(
        self,
        data_source: ErgastDataSource | None = None,
        repository: RacingRepository | None = None,
        config: ErgastConfig | None = None,
    ) -> None:
        super().__init__(data_source, repository)
        self._config = config
    
    @property
    def data_source_class(self) -> type[ErgastDataSource]:
        return ErgastDataSource
    
    def _ensure_clients(self) -> tuple[ErgastDataSource, RacingRepository]:
        """Ensure Ergast data source and repository are available."""
        if self._data_source is None:
            self._data_source = ErgastDataSource(self._config)
            self._data_source.connect()
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
    
    # =========================================================================
    # Ergast-Specific Sync Methods
    # =========================================================================
    
    def _sync_meeting(
        self,
        data_source: ErgastDataSource,
        repo: RacingRepository,
        meeting: SourceMeeting,
        season_id: UUID,
        include_results: bool,
        stats: SyncStats,
        round_number: int,
        options: SyncOptions,
    ) -> None:
        """Sync a single meeting (race weekend) from Ergast."""
        
        # Get or create circuit
        if meeting.circuit:
            circuit_name = meeting.circuit.short_name or meeting.circuit.name
            print(f"      📍 Circuit: {circuit_name}")
            circuit_id = self._get_or_create_circuit(repo, meeting.circuit, options)
            stats.circuits_synced += 1
        else:
            raise ValueError(f"Meeting {meeting.name} has no circuit data")
        
        # Create/update round
        round_slug = slugify(f"{meeting.year}-{meeting.name}")
        round_ = Round(
            season_id=season_id,
            circuit_id=circuit_id,
            name=meeting.official_name or meeting.name,
            slug=round_slug,
            round_number=round_number,
            date_start=meeting.date_start,
            date_end=meeting.date_end or meeting.date_start,
            # Store Ergast race_id for reference
        )
        round_id = repo.upsert_round(round_)
        
        # Get sessions for this meeting
        sessions = data_source.get_sessions(meeting.source_id)
        print(f"      📅 Sessions: {len(sessions)}")
        
        # Get entrants (drivers + teams)
        entrants = data_source.get_entrants(meeting.source_id)
        entrant_map: dict[str, UUID] = {}  # driver_source_id -> entrant_id
        driver_number_map: dict[int, UUID] = {}  # driver_number -> entrant_id
        
        # Sync entrants
        driver_count = 0
        for source_entrant in entrants:
            try:
                if not source_entrant.driver or not source_entrant.team:
                    continue
                
                driver_id = self._get_or_create_driver(repo, source_entrant.driver, options)
                team_id = self._get_or_create_team(repo, source_entrant.team, options)
                
                # Create entrant
                entrant = Entrant(
                    round_id=round_id,
                    driver_id=driver_id,
                    team_id=team_id,
                )
                entrant_id = repo.upsert_entrant(entrant)
                
                # Store in maps for result matching
                if source_entrant.driver_source_id:
                    entrant_map[source_entrant.driver_source_id] = entrant_id
                if source_entrant.car_number:
                    driver_number_map[source_entrant.car_number] = entrant_id
                
                stats.entrants_synced += 1
                driver_count += 1
                
            except ValueError as e:
                logger.warning("Failed to create entrant", error=str(e))
        
        stats.drivers_synced += driver_count
        stats.teams_synced = len(self._team_cache)
        print(f"      👥 Drivers: {driver_count}")
        
        # Sync sessions and results
        session_names = []
        results_count = 0
        
        for source_session in sessions:
            session_type = self._map_session_type(source_session.session_type)
            session_status = self._map_session_status(source_session.status)
            
            session = Session(
                round_id=round_id,
                type=session_type,
                start_time_utc=source_session.start_time,
                status=session_status,
            )
            session_id = repo.upsert_session(session)
            stats.sessions_synced += 1
            session_names.append(session_type.name)
            
            # Sync results if requested and session is completed
            if include_results and session_status == SessionStatus.COMPLETED:
                try:
                    source_results = data_source.get_results(
                        source_session.source_id,
                        source_session.session_type,
                    )
                    
                    if source_results:
                        results = self._process_results(
                            source_results, session_id, entrant_map, driver_number_map
                        )
                        if results:
                            repo.bulk_upsert_results(results)
                            stats.results_synced += len(results)
                            results_count += len(results)
                except Exception as e:
                    logger.warning(
                        "Failed to sync results",
                        session=source_session.source_id,
                        error=str(e),
                    )
        
        print(f"      🏁 Sessions synced: {', '.join(session_names)}")
        if include_results and results_count > 0:
            print(f"      📊 Results: {results_count}")
    
    def _process_results(
        self,
        source_results: list[SourceResult],
        session_id: UUID,
        entrant_map: dict[str, UUID],
        driver_number_map: dict[int, UUID],
    ) -> list[Result]:
        """Process source results into domain Result objects."""
        results = []
        
        for sr in source_results:
            # Find entrant by driver_source_id or driver_number
            entrant_id = None
            if sr.driver_source_id and sr.driver_source_id in entrant_map:
                entrant_id = entrant_map[sr.driver_source_id]
            elif sr.driver_number and sr.driver_number in driver_number_map:
                entrant_id = driver_number_map[sr.driver_number]
            
            if not entrant_id:
                logger.debug(
                    "No entrant found for result",
                    driver_source_id=sr.driver_source_id,
                    driver_number=sr.driver_number,
                )
                continue
            
            result = Result(
                session_id=session_id,
                entrant_id=entrant_id,
                position=sr.position,
                grid_position=sr.grid_position,
                status=self._map_result_status(sr.status),
                status_detail=sr.status_detail,
                points=sr.points,
                time_milliseconds=sr.time_milliseconds,
                laps=sr.laps,
                fastest_lap=sr.fastest_lap,
                fastest_lap_number=sr.fastest_lap_number,
                fastest_lap_rank=sr.fastest_lap_rank,
                fastest_lap_time=sr.fastest_lap_time,
                fastest_lap_speed=sr.fastest_lap_speed,
                q1_time=sr.q1_time,
                q2_time=sr.q2_time,
                q3_time=sr.q3_time,
                laps_led=sr.laps_led,
                car_number=sr.car_number,
            )
            results.append(result)
        
        return results
    
    # =========================================================================
    # Bulk Import Methods (Ergast-specific)
    # =========================================================================
    
    def import_circuits_with_stats(self, options: SyncOptions | None = None) -> dict[str, Any]:
        """Import all Ergast circuits with detailed statistics.
        
        Returns:
            Dict with import statistics and any issues found.
        """
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions.safe_historical()
        
        stats = {
            "source_count": 0,
            "created": 0,
            "matched": 0,
            "aliases_created": 0,
            "errors": [],
        }
        
        print("\n🏎️  Importing circuits from Ergast...")
        source_circuits = data_source.get_all_circuits()
        stats["source_count"] = len(source_circuits)
        print(f"   Found {len(source_circuits)} circuits in Ergast database")
        
        for circuit in source_circuits:
            try:
                slug = slugify(circuit.short_name or circuit.name)
                existing = repo.get_circuit_by_slug(slug)
                
                if existing:
                    stats["matched"] += 1
                    # Create alias if name differs
                    if circuit.name != existing.name:
                        # TODO: Create CircuitAlias
                        stats["aliases_created"] += 1
                        logger.debug(
                            "Circuit name variation",
                            existing=existing.name,
                            ergast=circuit.name,
                        )
                else:
                    self._get_or_create_circuit(repo, circuit, options)
                    stats["created"] += 1
                    
            except Exception as e:
                stats["errors"].append(f"Circuit {circuit.name}: {e}")
                logger.warning("Failed to import circuit", name=circuit.name, error=str(e))
        
        print(f"   ✅ Created: {stats['created']}, Matched: {stats['matched']}")
        if stats["errors"]:
            print(f"   ⚠️  Errors: {len(stats['errors'])}")
        
        return stats
    
    def import_drivers_with_stats(self, options: SyncOptions | None = None) -> dict[str, Any]:
        """Import all Ergast drivers with detailed statistics."""
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions.safe_historical()
        
        # Ensure series exists for entity resolver
        self._ensure_series(repo)
        
        stats = {
            "source_count": 0,
            "created": 0,
            "matched": 0,
            "aliases_created": 0,
            "errors": [],
        }
        
        print("\n👤 Importing drivers from Ergast...")
        source_drivers = data_source.get_all_drivers()
        stats["source_count"] = len(source_drivers)
        print(f"   Found {len(source_drivers)} drivers in Ergast database")
        
        for i, driver in enumerate(source_drivers, 1):
            if i % 100 == 0:
                print(f"   Processing... {i}/{len(source_drivers)}")
            
            try:
                # Use entity resolver to check for existing
                assert self._entity_resolver is not None
                resolved = self._entity_resolver.resolve_driver(
                    full_name=driver.full_name,
                    first_name=driver.first_name,
                    last_name=driver.last_name,
                    driver_number=driver.driver_number,
                    abbreviation=driver.abbreviation,
                    nationality=driver.nationality,
                )
                
                if resolved.is_new:
                    # Create new driver
                    self._get_or_create_driver(repo, driver, options)
                    stats["created"] += 1
                else:
                    stats["matched"] += 1
                    # Create aliases if needed
                    if resolved.aliases_to_add:
                        for alias in resolved.aliases_to_add:
                            alias.driver_id = resolved.existing_id
                            repo.upsert_driver_alias(alias)
                            stats["aliases_created"] += 1
                            
            except Exception as e:
                stats["errors"].append(f"Driver {driver.full_name}: {e}")
                logger.warning("Failed to import driver", name=driver.full_name, error=str(e))
        
        print(f"   ✅ Created: {stats['created']}, Matched: {stats['matched']}, Aliases: {stats['aliases_created']}")
        if stats["errors"]:
            print(f"   ⚠️  Errors: {len(stats['errors'])}")
        
        return stats
    
    def import_teams_with_stats(self, options: SyncOptions | None = None) -> dict[str, Any]:
        """Import all Ergast teams/constructors with detailed statistics."""
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions.safe_historical()
        
        # Ensure series exists for entity resolver
        self._ensure_series(repo)
        
        stats = {
            "source_count": 0,
            "created": 0,
            "matched": 0,
            "aliases_created": 0,
            "errors": [],
        }
        
        print("\n🏢 Importing teams from Ergast...")
        source_teams = data_source.get_all_teams()
        stats["source_count"] = len(source_teams)
        print(f"   Found {len(source_teams)} teams/constructors in Ergast database")
        
        for team in source_teams:
            try:
                # Use entity resolver
                assert self._entity_resolver is not None
                resolved = self._entity_resolver.resolve_team(
                    name=team.name,
                )
                
                if resolved.is_new:
                    self._get_or_create_team(repo, team, options)
                    stats["created"] += 1
                else:
                    stats["matched"] += 1
                    if resolved.aliases_to_add:
                        for alias in resolved.aliases_to_add:
                            alias.team_id = resolved.existing_id
                            repo.upsert_team_alias(alias)
                            stats["aliases_created"] += 1
                            
            except Exception as e:
                stats["errors"].append(f"Team {team.name}: {e}")
                logger.warning("Failed to import team", name=team.name, error=str(e))
        
        print(f"   ✅ Created: {stats['created']}, Matched: {stats['matched']}, Aliases: {stats['aliases_created']}")
        if stats["errors"]:
            print(f"   ⚠️  Errors: {len(stats['errors'])}")
        
        return stats
    
    def create_historical_seasons(self, start_year: int = 1950, end_year: int = 2019) -> int:
        """Create F1 seasons for historical years.
        
        Args:
            start_year: First year to create (default 1950)
            end_year: Last year to create (default 2019 to avoid overlap with OpenF1 data)
            
        Returns:
            Number of seasons created.
        """
        _, repo = self._ensure_clients()
        
        print(f"\n📅 Creating F1 seasons {start_year}-{end_year}...")
        
        series_id = self._ensure_series(repo)
        created = 0
        
        for year in range(start_year, end_year + 1):
            existing = repo.get_season(series_id, year)
            if not existing:
                season = Season(series_id=series_id, year=year)
                repo.upsert_season(season)
                created += 1
        
        print(f"   ✅ Created {created} seasons")
        return created
    
    def import_events_for_year(
        self,
        year: int,
        options: SyncOptions | None = None,
    ) -> dict[str, Any]:
        """Import all rounds and sessions for a single year.
        
        This imports the race weekend structure without results.
        
        Args:
            year: The year to import events for
            options: Sync options controlling entity behavior
            
        Returns:
            Dict with import statistics.
        """
        data_source, repo = self._ensure_clients()
        options = options or SyncOptions.safe_historical()
        
        stats = {
            "year": year,
            "rounds_created": 0,
            "sessions_created": 0,
            "entrants_created": 0,
            "errors": [],
        }
        
        # Ensure series and season exist
        season_id = self._ensure_season(repo, year)
        
        # Get meetings for the year
        meetings = data_source.get_meetings(year)
        
        for meeting in meetings:
            try:
                # Get or create circuit
                if not meeting.circuit:
                    raise ValueError(f"Meeting {meeting.name} has no circuit data")
                
                circuit_id = self._get_or_create_circuit(repo, meeting.circuit, options)
                
                # Create/update round (upsert handles existing detection)
                round_slug = slugify(f"{year}-{meeting.name}")
                round_ = Round(
                    season_id=season_id,
                    circuit_id=circuit_id,
                    name=meeting.official_name or meeting.name,
                    slug=round_slug,
                    round_number=meeting.round_number or 0,
                    date_start=meeting.date_start,
                    date_end=meeting.date_end or meeting.date_start,
                )
                
                round_id = repo.upsert_round(round_)
                stats["rounds_created"] += 1
                
                # Get and create sessions
                sessions = data_source.get_sessions(meeting.source_id)
                for source_session in sessions:
                    session_type = self._map_session_type(source_session.session_type)
                    session_status = self._map_session_status(source_session.status)
                    
                    session = Session(
                        round_id=round_id,
                        type=session_type,
                        start_time_utc=source_session.start_time,
                        status=session_status,
                    )
                    # Use upsert_session_by_round_type for Ergast (no OpenF1 key)
                    repo.upsert_session_by_round_type(session)
                    stats["sessions_created"] += 1
                
                # Get and create entrants
                entrants = data_source.get_entrants(meeting.source_id)
                for source_entrant in entrants:
                    if not source_entrant.driver or not source_entrant.team:
                        continue
                    
                    driver_id = self._get_or_create_driver(repo, source_entrant.driver, options)
                    team_id = self._get_or_create_team(repo, source_entrant.team, options)
                    
                    entrant = Entrant(
                        round_id=round_id,
                        driver_id=driver_id,
                        team_id=team_id,
                    )
                    repo.upsert_entrant(entrant)
                    stats["entrants_created"] += 1
                    
            except Exception as e:
                stats["errors"].append(f"Meeting {meeting.name}: {e}")
                logger.warning("Failed to import meeting", name=meeting.name, error=str(e))
        
        return stats
    
    def import_events_for_year_range(
        self,
        start_year: int,
        end_year: int,
        options: SyncOptions | None = None,
    ) -> dict[str, Any]:
        """Import all rounds, sessions, and entrants for a year range.
        
        Args:
            start_year: First year to import
            end_year: Last year to import (inclusive)
            options: Sync options
            
        Returns:
            Combined statistics for all years.
        """
        options = options or SyncOptions.safe_historical()
        
        total_stats = {
            "years_processed": 0,
            "rounds_created": 0,
            "sessions_created": 0,
            "entrants_created": 0,
            "errors": [],
        }
        
        print(f"\n📅 Importing events for years {start_year}-{end_year}...")
        
        for year in range(start_year, end_year + 1):
            print(f"\n   🏎️  Year {year}...")
            
            try:
                year_stats = self.import_events_for_year(year, options)
                
                total_stats["years_processed"] += 1
                total_stats["rounds_created"] += year_stats["rounds_created"]
                total_stats["sessions_created"] += year_stats["sessions_created"]
                total_stats["entrants_created"] += year_stats["entrants_created"]
                total_stats["errors"].extend(year_stats["errors"])
                
                print(f"      ✅ Rounds: {year_stats['rounds_created']} | "
                      f"Sessions: {year_stats['sessions_created']} | "
                      f"Entrants: {year_stats['entrants_created']}")
                
            except Exception as e:
                total_stats["errors"].append(f"Year {year}: {e}")
                logger.error("Failed to import year", year=year, error=str(e))
        
        return total_stats
    
    def import_results_for_year(
        self,
        year: int,
        include_qualifying: bool = True,
    ) -> dict[str, Any]:
        """Import race and qualifying results for a single year.
        
        This requires that rounds, sessions, and entrants already exist for the year.
        Results are matched to existing sessions by round slug and session type.
        Entrants are matched by looking up the driver name from Ergast and finding
        the corresponding entrant in our database.
        
        Args:
            year: The year to import results for
            include_qualifying: Whether to import qualifying results (default True)
            
        Returns:
            Dict with import statistics.
        """
        data_source, repo = self._ensure_clients()
        
        stats = {
            "year": year,
            "race_results": 0,
            "qualifying_results": 0,
            "rounds_processed": 0,
            "errors": [],
        }
        
        # Get all rounds for the year
        rounds = repo.get_rounds_by_year(year)
        if not rounds:
            stats["errors"].append(f"No rounds found for year {year}")
            return stats
        
        # Get meetings from Ergast to map round_number -> race_id
        meetings = data_source.get_meetings(year)
        meeting_by_round_number = {m.round_number: m for m in meetings}
        
        for round_ in rounds:
            try:
                # Find corresponding Ergast meeting
                meeting = meeting_by_round_number.get(round_.round_number)
                if not meeting:
                    logger.debug(
                        "No Ergast meeting found for round",
                        round_number=round_.round_number,
                        round_name=round_.name,
                    )
                    continue
                
                # Get sessions for this round
                sessions = repo.get_sessions_by_round(round_.id)
                session_by_type = {s.type: s for s in sessions}
                
                # Build entrant map from Ergast entrant data
                # This maps driverRef -> entrant_id
                entrant_map, driver_number_map = self._build_entrant_maps_for_meeting(
                    data_source, repo, round_.id, meeting.source_id
                )
                
                # Import race results
                race_session = session_by_type.get(SessionType.RACE)
                if race_session:
                    race_results = data_source.get_results(
                        f"{meeting.source_id}_race",
                        SourceSessionType.RACE,
                    )
                    
                    if race_results:
                        results = self._process_results(
                            race_results, race_session.id, entrant_map, driver_number_map
                        )
                        if results:
                            repo.bulk_upsert_results(results)
                            stats["race_results"] += len(results)
                
                # Import qualifying results
                if include_qualifying:
                    quali_session = session_by_type.get(SessionType.QUALIFYING)
                    if quali_session:
                        quali_results = data_source.get_results(
                            f"{meeting.source_id}_qualifying",
                            SourceSessionType.QUALIFYING,
                        )
                        
                        if quali_results:
                            results = self._process_results(
                                quali_results, quali_session.id, entrant_map, driver_number_map
                            )
                            if results:
                                repo.bulk_upsert_results(results)
                                stats["qualifying_results"] += len(results)
                
                stats["rounds_processed"] += 1
                
            except Exception as e:
                stats["errors"].append(f"Round {round_.name}: {e}")
                logger.warning("Failed to import results for round", name=round_.name, error=str(e))
        
        return stats
    
    def _build_entrant_maps_for_meeting(
        self,
        data_source: ErgastDataSource,
        repo: RacingRepository,
        round_id: UUID,
        meeting_source_id: str,
    ) -> tuple[dict[str, UUID], dict[int, UUID]]:
        """Build entrant maps for a meeting by matching Ergast drivers to our entrants.
        
        Uses normalized name matching to handle special characters in driver names
        (e.g., Hülkenberg vs Hulkenberg, Pérez vs Perez, Räikkönen vs Raikkonen).
        
        Returns:
            Tuple of (driver_source_id -> entrant_id, driver_number -> entrant_id)
        """
        entrant_map: dict[str, UUID] = {}
        driver_number_map: dict[int, UUID] = {}
        
        # Get Ergast entrants for this meeting
        ergast_entrants = data_source.get_entrants(meeting_source_id)
        
        # Get our entrants for this round with driver info
        our_entrants = repo.get_entrants_with_drivers_by_round(round_id)
        
        # Build BOTH normalized and exact name lookups for our entrants
        # This handles cases where names have special characters
        our_entrants_by_normalized_name: dict[str, dict] = {}
        our_entrants_by_exact_name: dict[str, dict] = {}
        
        for e in our_entrants:
            full_name = f"{e['first_name']} {e['last_name']}"
            exact_key = full_name.lower()
            normalized_key = normalize_name(full_name)
            
            our_entrants_by_exact_name[exact_key] = e
            our_entrants_by_normalized_name[normalized_key] = e
        
        matched_count = 0
        unmatched_drivers = []
        
        for ergast_entrant in ergast_entrants:
            if not ergast_entrant.driver:
                continue
            
            ergast_full_name = ergast_entrant.driver.full_name
            
            # Try exact match first (preserves special characters)
            our_entrant = our_entrants_by_exact_name.get(ergast_full_name.lower())
            
            # Fall back to normalized match (handles Hülkenberg→Hulkenberg, etc.)
            if not our_entrant:
                normalized_ergast_name = normalize_name(ergast_full_name)
                our_entrant = our_entrants_by_normalized_name.get(normalized_ergast_name)
            
            if our_entrant:
                entrant_id = our_entrant['entrant_id']
                matched_count += 1
                
                # Map by driverRef
                if ergast_entrant.driver_source_id:
                    entrant_map[ergast_entrant.driver_source_id] = entrant_id
                
                # Map by car number
                if ergast_entrant.car_number:
                    driver_number_map[ergast_entrant.car_number] = entrant_id
            else:
                unmatched_drivers.append(ergast_full_name)
        
        if unmatched_drivers:
            logger.warning(
                "Unmatched Ergast drivers for round",
                round_id=str(round_id),
                unmatched_count=len(unmatched_drivers),
                unmatched_drivers=unmatched_drivers[:5],  # Log first 5
            )
        else:
            logger.debug(
                "All Ergast drivers matched",
                round_id=str(round_id),
                matched_count=matched_count,
            )
        
        return entrant_map, driver_number_map
    
    def import_results_for_year_range(
        self,
        start_year: int,
        end_year: int,
        include_qualifying: bool = True,
    ) -> dict[str, Any]:
        """Import race and qualifying results for a year range.
        
        Args:
            start_year: First year to import
            end_year: Last year to import (inclusive)
            include_qualifying: Whether to import qualifying results
            
        Returns:
            Combined statistics for all years.
        """
        total_stats = {
            "years_processed": 0,
            "race_results": 0,
            "qualifying_results": 0,
            "rounds_processed": 0,
            "errors": [],
        }
        
        print(f"\n📊 Importing results for years {start_year}-{end_year}...")
        
        for year in range(start_year, end_year + 1):
            print(f"\n   🏎️  Year {year}...")
            
            try:
                year_stats = self.import_results_for_year(year, include_qualifying)
                
                total_stats["years_processed"] += 1
                total_stats["race_results"] += year_stats["race_results"]
                total_stats["qualifying_results"] += year_stats["qualifying_results"]
                total_stats["rounds_processed"] += year_stats["rounds_processed"]
                total_stats["errors"].extend(year_stats["errors"])
                
                print(f"      ✅ Race results: {year_stats['race_results']} | "
                      f"Qualifying results: {year_stats['qualifying_results']} | "
                      f"Rounds: {year_stats['rounds_processed']}")
                
            except Exception as e:
                total_stats["errors"].append(f"Year {year}: {e}")
                logger.error("Failed to import year", year=year, error=str(e))
        
        return total_stats
    
    def verify_ergast_data(self) -> dict[str, Any]:
        """Verify Ergast database connectivity and data counts.
        
        Returns:
            Dictionary with verification results.
        """
        data_source, _ = self._ensure_clients()
        
        print("\n🔍 Verifying Ergast database...")
        
        results = {
            "connected": True,
            "years_available": [],
            "counts_by_year": {},
            "totals": {
                "circuits": 0,
                "drivers": 0,
                "teams": 0,
                "races": 0,
                "results": 0,
                "qualifying": 0,
            },
        }
        
        try:
            # Get available years
            results["years_available"] = data_source.get_available_years()
            print(f"   Years: {results['years_available'][0]} - {results['years_available'][-1]}")
            
            # Get counts by year
            results["counts_by_year"] = data_source.count_by_year()
            
            # Sum totals
            for year_counts in results["counts_by_year"].values():
                results["totals"]["races"] += year_counts["races"]
                results["totals"]["results"] += year_counts["results"]
                results["totals"]["qualifying"] += year_counts["qualifying_results"]
            
            # Get reference data counts
            results["totals"]["circuits"] = len(data_source.get_all_circuits())
            results["totals"]["drivers"] = len(data_source.get_all_drivers())
            results["totals"]["teams"] = len(data_source.get_all_teams())
            
            print(f"   Circuits: {results['totals']['circuits']}")
            print(f"   Drivers: {results['totals']['drivers']}")
            print(f"   Teams: {results['totals']['teams']}")
            print(f"   Races: {results['totals']['races']}")
            print(f"   Race Results: {results['totals']['results']}")
            print(f"   Qualifying Results: {results['totals']['qualifying']}")
            
        except Exception as e:
            results["connected"] = False
            results["error"] = str(e)
            print(f"   ❌ Error: {e}")
        
        return results
