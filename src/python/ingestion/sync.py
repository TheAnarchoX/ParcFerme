"""
OpenF1 Data Sync Service.

Orchestrates fetching data from OpenF1 API and storing it in the database.
This is the core of the data ingestion pipeline.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog  # type: ignore

from ingestion.clients.openf1 import (
    OpenF1ApiError,
    OpenF1Client,
    OpenF1Driver,
    OpenF1Meeting,
    OpenF1Session,
    OpenF1SessionResult,
)
from ingestion.entity_resolver import EntityResolver
from ingestion.models import (
    OPENF1_SESSION_TYPE_MAP,
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
    slugify,
)
from ingestion.repository import RacingRepository

logger = structlog.get_logger()

# F1 Series constant - created once on first sync
F1_SERIES_SLUG = "formula-1"
F1_SERIES_NAME = "Formula 1"


class OpenF1SyncService:
    """Service for syncing F1 data from OpenF1 API to the database.

    The sync process:
    1. Ensure F1 Series exists
    2. Ensure Season exists for the year
    3. For each meeting (race weekend):
       a. Create/update Circuit
       b. Create/update Round
       c. For each session in the meeting:
          - Create/update Session
          - Fetch and create/update Drivers and Teams
          - Create Entrants (driver-team links)
          - Fetch and store Results (⚠️ spoiler data)
    
    Entity resolution:
    - Uses EntityResolver to match incoming data to existing entities
    - Updates canonical names to latest values
    - Tracks historical aliases for name/number changes
    """

    def __init__(
        self,
        api_client: OpenF1Client | None = None,
        repository: RacingRepository | None = None,
    ) -> None:
        self._api_client = api_client
        self._repository = repository
        self._owns_clients = False
        self._entity_resolver: EntityResolver | None = None

        # Caches to avoid repeated DB lookups during a sync
        self._series_id: UUID | None = None
        self._season_cache: dict[int, UUID] = {}  # year -> season_id
        self._circuit_cache: dict[str, UUID] = {}  # slug -> circuit_id
        self._driver_cache: dict[int, UUID] = {}  # driver_number -> driver_id
        self._team_cache: dict[str, UUID] = {}  # slug -> team_id

    def _ensure_clients(self) -> tuple[OpenF1Client, RacingRepository]:
        """Ensure API client and repository are available."""
        if self._api_client is None:
            self._api_client = OpenF1Client()
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
        return self._api_client, self._repository

    def close(self) -> None:
        """Close owned clients."""
        if self._owns_clients:
            if self._api_client:
                self._api_client.close()
            if self._repository:
                self._repository.close()

    def __enter__(self) -> "OpenF1SyncService":
        self._ensure_clients()
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def _ensure_f1_series(self, repo: RacingRepository) -> UUID:
        """Ensure F1 series exists in database."""
        if self._series_id:
            return self._series_id

        existing = repo.get_series_by_slug(F1_SERIES_SLUG)
        if existing:
            self._series_id = existing.id
            # Update entity resolver with series context
            if self._entity_resolver:
                self._entity_resolver.series_id = existing.id
            return existing.id

        series = Series(name=F1_SERIES_NAME, slug=F1_SERIES_SLUG)
        self._series_id = repo.upsert_series(series)
        logger.info("Created F1 series", series_id=str(self._series_id))
        # Update entity resolver with series context
        if self._entity_resolver:
            self._entity_resolver.series_id = self._series_id
        return self._series_id

    def _ensure_season(self, repo: RacingRepository, year: int) -> UUID:
        """Ensure season exists for year."""
        if year in self._season_cache:
            return self._season_cache[year]

        series_id = self._ensure_f1_series(repo)
        existing = repo.get_season(series_id, year)
        if existing:
            self._season_cache[year] = existing.id
            return existing.id

        season = Season(series_id=series_id, year=year)
        season_id = repo.upsert_season(season)
        self._season_cache[year] = season_id
        logger.info("Created season", year=year, season_id=str(season_id))
        return season_id

    def _get_or_create_circuit(self, repo: RacingRepository, meeting: OpenF1Meeting) -> UUID:
        """Get or create circuit from meeting data."""
        slug = slugify(meeting.circuit_short_name)
        if slug in self._circuit_cache:
            return self._circuit_cache[slug]

        existing = repo.get_circuit_by_slug(slug)
        if existing:
            self._circuit_cache[slug] = existing.id
            return existing.id

        circuit = Circuit(
            name=meeting.circuit_short_name,
            slug=slug,
            location=meeting.location or meeting.circuit_short_name,
            country=meeting.country_name,
        )
        circuit_id = repo.upsert_circuit(circuit)
        self._circuit_cache[slug] = circuit_id
        logger.info("Created circuit", name=circuit.name, circuit_id=str(circuit_id))
        return circuit_id

    def _get_or_create_driver(self, repo: RacingRepository, openf1_driver: OpenF1Driver) -> UUID:
        """Get or create driver from OpenF1 driver data.
        
        Uses EntityResolver for intelligent matching and alias tracking.
        """
        # Check cache first (keyed by driver_number for stability)
        if openf1_driver.driver_number in self._driver_cache:
            return self._driver_cache[openf1_driver.driver_number]

        # Use entity resolver for intelligent matching
        assert self._entity_resolver is not None
        
        resolved = self._entity_resolver.resolve_driver(
            full_name=openf1_driver.full_name,
            first_name=openf1_driver.first_name,
            last_name=openf1_driver.last_name,
            driver_number=openf1_driver.driver_number,
            abbreviation=openf1_driver.name_acronym,
            nationality=openf1_driver.country_code,
            headshot_url=openf1_driver.headshot_url,
        )

        # Log resolution details
        if resolved.is_new:
            logger.info(
                "Creating new driver",
                name=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                number=resolved.driver.driver_number,
            )
        elif resolved.name_changed:
            logger.info(
                "Updating driver canonical name",
                old_name=resolved.old_name,
                new_name=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                number=resolved.driver.driver_number,
            )

        # Upsert the driver
        driver_id = repo.upsert_driver(resolved.driver)
        
        # Update resolver cache
        resolved.driver.id = driver_id
        self._entity_resolver.update_cache_after_upsert(driver=resolved.driver)

        # Add any new aliases
        for alias in resolved.aliases_to_add:
            alias.driver_id = driver_id
            repo.upsert_driver_alias(alias)
            self._entity_resolver.add_alias_to_cache(driver_alias=alias)
            logger.debug(
                "Added driver alias",
                driver=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                alias=alias.alias_name,
            )

        # Update local cache
        self._driver_cache[openf1_driver.driver_number] = driver_id
        return driver_id

    def _get_or_create_team(self, repo: RacingRepository, openf1_driver: OpenF1Driver) -> UUID | None:
        """Get or create team from OpenF1 driver data.
        
        Uses EntityResolver for intelligent matching and alias tracking.
        Returns None if the driver has no team (e.g., reserve/test drivers).
        """
        if not openf1_driver.team_name:
            return None

        slug = slugify(openf1_driver.team_name)
        if slug in self._team_cache:
            return self._team_cache[slug]

        # Use entity resolver for intelligent matching
        assert self._entity_resolver is not None
        
        resolved = self._entity_resolver.resolve_team(
            name=openf1_driver.team_name,
            primary_color=openf1_driver.team_colour,
        )

        # Log resolution details
        if resolved.is_new:
            logger.info("Creating new team", name=resolved.team.name)
        elif resolved.name_changed:
            logger.info(
                "Updating team canonical name",
                old_name=resolved.old_name,
                new_name=resolved.team.name,
            )

        # Upsert the team
        team_id = repo.upsert_team(resolved.team)
        
        # Update resolver cache
        resolved.team.id = team_id
        self._entity_resolver.update_cache_after_upsert(team=resolved.team)

        # Add any new aliases
        for alias in resolved.aliases_to_add:
            alias.team_id = team_id
            repo.upsert_team_alias(alias)
            self._entity_resolver.add_alias_to_cache(team_alias=alias)
            logger.debug(
                "Added team alias",
                team=resolved.team.name,
                alias=alias.alias_name,
            )

        # Update local cache (use the resolved slug for consistency)
        self._team_cache[resolved.team.slug] = team_id
        # Also cache the incoming slug to avoid re-resolution
        self._team_cache[slug] = team_id
        return team_id

    def _map_session_type(self, openf1_session_name: str) -> SessionType:
        """Map OpenF1 session_name string to our enum."""
        return OPENF1_SESSION_TYPE_MAP.get(openf1_session_name, SessionType.RACE)

    def _determine_session_status(self, session: OpenF1Session) -> SessionStatus:
        """Determine session status based on dates."""
        now = datetime.now(UTC)
        # Make session dates timezone-aware if they're naive
        date_start = session.date_start
        if date_start.tzinfo is None:
            date_start = date_start.replace(tzinfo=UTC)
        date_end = session.date_end
        if date_end and date_end.tzinfo is None:
            date_end = date_end.replace(tzinfo=UTC)

        if date_end and date_end < now:
            return SessionStatus.COMPLETED
        if date_start <= now:
            return SessionStatus.IN_PROGRESS
        return SessionStatus.SCHEDULED

    def sync_year(self, year: int, include_results: bool = True) -> dict:
        """Sync all F1 data for a given year.

        Args:
            year: The season year (e.g., 2024)
            include_results: Whether to fetch and store results (⚠️ spoiler data)

        Returns:
            Dict with sync statistics
        """
        api, repo = self._ensure_clients()

        stats = {
            "year": year,
            "meetings_synced": 0,
            "sessions_synced": 0,
            "drivers_synced": 0,
            "teams_synced": 0,
            "results_synced": 0,
            "errors": [],
        }

        logger.info("Starting sync", year=year, include_results=include_results)

        # Ensure F1 series and season exist
        season_id = self._ensure_season(repo, year)

        # Fetch all meetings for the year
        try:
            meetings = api.get_meetings(year)
        except OpenF1ApiError as e:
            logger.error(
                "OpenF1 API unavailable",
                year=year,
                status_code=e.status_code,
                error=e.message,
            )
            stats["errors"].append(f"OpenF1 API error: {e.message}")
            return stats
        except Exception as e:
            logger.error("Failed to fetch meetings", year=year, error=str(e))
            stats["errors"].append(f"Failed to fetch meetings: {e}")
            return stats

        logger.info("Found meetings", count=len(meetings), year=year)

        # Sort meetings by date to calculate proper round numbers
        sorted_meetings = sorted(meetings, key=lambda m: m.date_start)
        
        # Calculate round numbers: 0 for pre-season testing, 1-N for races
        round_number_map = self._calculate_round_numbers(sorted_meetings)

        for i, meeting in enumerate(sorted_meetings, 1):
            try:
                round_number = round_number_map.get(meeting.meeting_key, i)
                self._sync_meeting(api, repo, meeting, season_id, include_results, stats, round_number)
                stats["meetings_synced"] += 1
                logger.info(
                    "Synced meeting",
                    meeting=meeting.meeting_name,
                    round_number=round_number,
                    progress=f"{i}/{len(sorted_meetings)}",
                )
            except Exception as e:
                logger.error(
                    "Failed to sync meeting",
                    meeting=meeting.meeting_name,
                    error=str(e),
                )
                stats["errors"].append(f"Meeting {meeting.meeting_name}: {e}")

        logger.info("Sync completed", stats=stats)
        return stats

    def _sync_meeting(
        self,
        api: OpenF1Client,
        repo: RacingRepository,
        meeting: OpenF1Meeting,
        season_id: UUID,
        include_results: bool,
        stats: dict,
        round_number: int,
    ) -> None:
        """Sync a single meeting (race weekend)."""
        # Create circuit
        circuit_id = self._get_or_create_circuit(repo, meeting)

        # Calculate round dates (meeting date_start is usually the first session)
        date_start = meeting.date_start.date()
        # Race weekends typically span 3 days (Fri-Sun) or 4 for sprint weekends
        date_end = date_start + timedelta(days=2)

        # Create/update round
        round_slug = slugify(f"{meeting.year}-{meeting.meeting_name}")
        round_ = Round(
            season_id=season_id,
            circuit_id=circuit_id,
            name=meeting.meeting_official_name or meeting.meeting_name,
            slug=round_slug,
            round_number=round_number,
            date_start=date_start,
            date_end=date_end,
            openf1_meeting_key=meeting.meeting_key,
        )
        round_id = repo.upsert_round(round_)

        # Fetch sessions for this meeting
        sessions = api.get_sessions_for_meeting(meeting.meeting_key)

        # Track entrants for this round (driver_number -> entrant_id)
        entrant_map: dict[int, UUID] = {}

        # First, sync drivers and teams from first session with driver data
        if sessions:
            drivers = api.get_drivers_for_meeting(meeting.meeting_key)
            for driver_data in drivers:
                # Skip drivers without teams (reserve/test drivers not competing)
                if not driver_data.team_name:
                    logger.debug(
                        "Skipping driver without team",
                        driver=driver_data.full_name,
                        driver_number=driver_data.driver_number,
                    )
                    continue
                    
                driver_id = self._get_or_create_driver(repo, driver_data)
                team_id = self._get_or_create_team(repo, driver_data)
                
                # team_id should never be None here since we checked team_name above
                assert team_id is not None

                # Create entrant linking driver to team for this round
                entrant = Entrant(
                    round_id=round_id,
                    driver_id=driver_id,
                    team_id=team_id,
                )
                entrant_id = repo.upsert_entrant(entrant)
                entrant_map[driver_data.driver_number] = entrant_id
                stats["drivers_synced"] += 1

            stats["teams_synced"] = len(self._team_cache)

        # Sync sessions
        for openf1_session in sessions:
            session = Session(
                round_id=round_id,
                type=self._map_session_type(openf1_session.session_name),
                start_time_utc=openf1_session.date_start,
                status=self._determine_session_status(openf1_session),
                openf1_session_key=openf1_session.session_key,
            )
            session_id = repo.upsert_session(session)
            stats["sessions_synced"] += 1

            # Sync results if requested and session is completed
            if include_results and session.status == SessionStatus.COMPLETED:
                self._sync_session_results(
                    api, repo, openf1_session, session_id, round_id, entrant_map, stats
                )

    def _sync_session_results(
        self,
        api: OpenF1Client,
        repo: RacingRepository,
        openf1_session: OpenF1Session,
        session_id: UUID,
        round_id: UUID,
        entrant_map: dict[int, UUID],
        stats: dict,
    ) -> None:
        """Sync results for a completed session.

        ⚠️ SPOILER DATA - This fetches and stores race results.
        
        Uses the session_result endpoint (beta) for comprehensive data,
        falls back to position endpoint if unavailable.
        """
        try:
            # Try the session_result endpoint first (has DNF/DNS/DSQ data)
            session_results = api.get_session_results(openf1_session.session_key)
            
            if session_results:
                results = self._process_session_results(
                    session_results, session_id, round_id, entrant_map, repo, openf1_session
                )
            else:
                # Fallback to position endpoint
                results = self._process_position_results(
                    api, session_id, round_id, entrant_map, repo, openf1_session
                )

            if results:
                repo.bulk_upsert_results(results)
                stats["results_synced"] += len(results)
                logger.debug(
                    "Synced results",
                    session=openf1_session.session_name,
                    count=len(results),
                )

        except Exception as e:
            logger.warning(
                "Failed to sync results",
                session=openf1_session.session_name,
                error=str(e),
            )

    def _process_session_results(
        self,
        session_results: list[OpenF1SessionResult],
        session_id: UUID,
        round_id: UUID,
        entrant_map: dict[int, UUID],
        repo: RacingRepository,
        openf1_session: OpenF1Session,
    ) -> list[Result]:
        """Process results from the session_result endpoint (beta).
        
        This endpoint provides comprehensive data including DNF/DNS/DSQ status.
        """
        results: list[Result] = []
        
        for sr in session_results:
            entrant_id = entrant_map.get(sr.driver_number)
            if not entrant_id:
                entrant = repo.get_entrant_by_driver_number(round_id, sr.driver_number)
                if entrant:
                    entrant_id = entrant.id
                else:
                    logger.warning(
                        "No entrant found for driver",
                        driver_number=sr.driver_number,
                        session_key=openf1_session.session_key,
                    )
                    continue
            
            # Determine result status from flags
            if sr.dsq:
                status = ResultStatus.DSQ
            elif sr.dns:
                status = ResultStatus.DNS
            elif sr.dnf:
                status = ResultStatus.DNF
            else:
                status = ResultStatus.FINISHED
            
            # Handle duration - can be a single value or array for qualifying
            time_ms = None
            if sr.duration is not None:
                if isinstance(sr.duration, list):
                    # For qualifying, take the best time (last non-None Q time)
                    for t in reversed(sr.duration):
                        if t is not None:
                            time_ms = int(t * 1000)
                            break
                else:
                    time_ms = int(sr.duration * 1000)
            
            result = Result(
                session_id=session_id,
                entrant_id=entrant_id,
                position=sr.position,
                status=status,
                time_milliseconds=time_ms,
                laps=sr.number_of_laps,
                fastest_lap=False,  # Will be updated below if applicable
            )
            results.append(result)
        
        return results

    def _process_position_results(
        self,
        api: OpenF1Client,
        session_id: UUID,
        round_id: UUID,
        entrant_map: dict[int, UUID],
        repo: RacingRepository,
        openf1_session: OpenF1Session,
    ) -> list[Result]:
        """Process results from the position endpoint (fallback).
        
        Used when session_result endpoint is not available.
        """
        final_positions = api.get_final_positions(openf1_session.session_key)
        fastest_lap_driver = api.get_fastest_lap_driver(openf1_session.session_key)

        results: list[Result] = []
        for driver_number, position in final_positions.items():
            entrant_id = entrant_map.get(driver_number)
            if not entrant_id:
                entrant = repo.get_entrant_by_driver_number(round_id, driver_number)
                if entrant:
                    entrant_id = entrant.id
                else:
                    logger.warning(
                        "No entrant found for driver",
                        driver_number=driver_number,
                        session_key=openf1_session.session_key,
                    )
                    continue

            result = Result(
                session_id=session_id,
                entrant_id=entrant_id,
                position=position,
                status=ResultStatus.FINISHED,
                fastest_lap=(driver_number == fastest_lap_driver),
            )
            results.append(result)
        
        return results

    def _calculate_round_numbers(self, meetings: list[OpenF1Meeting]) -> dict[int, int]:
        """Calculate round numbers for a list of meetings.
        
        Pre-season testing events get round number 0.
        Race weekends are numbered 1-N based on date order.
        
        Args:
            meetings: List of meetings sorted by date
            
        Returns:
            Dict mapping meeting_key to round_number
        """
        round_number_map: dict[int, int] = {}
        race_number = 0
        
        for meeting in meetings:
            meeting_name = (meeting.meeting_official_name or meeting.meeting_name).lower()
            
            # Check if this is pre-season testing
            if "pre-season" in meeting_name or "testing" in meeting_name:
                round_number_map[meeting.meeting_key] = 0
            else:
                race_number += 1
                round_number_map[meeting.meeting_key] = race_number
                
        return round_number_map

    def sync_recent(self, days: int = 7, include_results: bool = True) -> dict:
        """Sync data for meetings in the last N days.

        Useful for keeping data fresh without full re-sync.
        """
        api, repo = self._ensure_clients()

        stats = {
            "days_checked": days,
            "meetings_synced": 0,
            "sessions_synced": 0,
            "errors": [],
        }

        # Get current year's meetings
        current_year = datetime.now(UTC).year
        all_meetings = api.get_meetings(current_year)

        # Sort all meetings by date to calculate proper round numbers for the whole season
        sorted_all_meetings = sorted(all_meetings, key=lambda m: m.date_start)
        round_number_map = self._calculate_round_numbers(sorted_all_meetings)

        cutoff = datetime.now(UTC) - timedelta(days=days)
        recent_meetings = [m for m in sorted_all_meetings if m.date_start >= cutoff]

        logger.info("Found recent meetings", count=len(recent_meetings), days=days)

        season_id = self._ensure_season(repo, current_year)

        for meeting in recent_meetings:
            try:
                round_number = round_number_map.get(meeting.meeting_key, 0)
                self._sync_meeting(api, repo, meeting, season_id, include_results, stats, round_number)
                stats["meetings_synced"] += 1
            except Exception as e:
                logger.error(
                    "Failed to sync recent meeting",
                    meeting=meeting.meeting_name,
                    error=str(e),
                )
                stats["errors"].append(f"Meeting {meeting.meeting_name}: {e}")

        return stats
