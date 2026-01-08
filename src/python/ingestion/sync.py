"""
OpenF1 Data Sync Service.

Orchestrates fetching data from OpenF1 API and storing it in the database.
This is the core of the data ingestion pipeline.
"""

import time
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
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

logger = structlog.get_logger()

# F1 Series constant - created once on first sync
F1_SERIES_SLUG = "formula-1"
F1_SERIES_NAME = "Formula 1"


@dataclass
class SyncOptions:
    """Configuration options for controlling sync behavior.
    
    These options allow fine-grained control over what gets created vs updated,
    making historical data syncing safer by preventing overwrites of curated data.
    
    Entity Update Modes:
    - "full": Create new entities AND update existing ones (default for new DBs)
    - "create_only": Only create new entities, never update existing ones
    - "skip": Don't touch this entity type at all (use existing data only)
    
    Alias Handling:
    - auto_create_driver_aliases: When a driver number differs from existing, create alias
    - auto_create_team_aliases: When a team name differs from existing, create alias
    - preserve_canonical_numbers: Keep existing driver.driver_number, only add as alias
    
    Example safe historical sync:
        SyncOptions(
            driver_mode="create_only",      # Don't update existing drivers
            team_mode="create_only",        # Don't update existing teams
            auto_create_driver_aliases=True, # But DO create aliases for number changes
            preserve_canonical_numbers=True, # Keep current numbers (e.g., VER stays #3)
        )
    """
    
    # Entity update modes
    driver_mode: str = "full"  # "full", "create_only", "skip"
    team_mode: str = "full"    # "full", "create_only", "skip"
    circuit_mode: str = "full" # "full", "create_only", "skip"
    session_mode: str = "full" # "full", "create_only", "skip"
    
    # Alias handling
    auto_create_driver_aliases: bool = True   # Create alias when driver number differs
    auto_create_team_aliases: bool = True     # Create alias when team name differs
    preserve_canonical_numbers: bool = False  # Don't update driver.driver_number
    preserve_canonical_names: bool = False    # Don't update first_name/last_name
    
    # What to sync
    include_results: bool = True
    
    # Logging verbosity
    log_skipped_updates: bool = True  # Log when updates are skipped
    
    def __post_init__(self):
        """Validate options."""
        valid_modes = ("full", "create_only", "skip")
        for mode_name in ["driver_mode", "team_mode", "circuit_mode", "session_mode"]:
            mode = getattr(self, mode_name)
            if mode not in valid_modes:
                raise ValueError(f"{mode_name} must be one of {valid_modes}, got '{mode}'")
    
    @classmethod
    def safe_historical(cls) -> "SyncOptions":
        """Preset for safe historical data syncing.
        
        - Creates new drivers/teams but doesn't update existing ones
        - Automatically creates aliases for driver number variations
        - Preserves canonical driver numbers (world champions keep their numbers)
        - Includes results
        """
        return cls(
            driver_mode="create_only",
            team_mode="create_only",
            circuit_mode="create_only",
            session_mode="full",  # Sessions can be updated (status changes)
            auto_create_driver_aliases=True,
            auto_create_team_aliases=True,
            preserve_canonical_numbers=True,
            preserve_canonical_names=True,
            include_results=True,
            log_skipped_updates=True,
        )
    
    @classmethod
    def results_only(cls) -> "SyncOptions":
        """Preset for results-only syncing.
        
        - Skips all entity updates entirely
        - Only syncs results for existing sessions
        """
        return cls(
            driver_mode="skip",
            team_mode="skip",
            circuit_mode="skip",
            session_mode="skip",
            include_results=True,
        )
    
    @classmethod  
    def full_sync(cls) -> "SyncOptions":
        """Preset for full sync (default behavior).
        
        - Creates and updates all entities
        - Use for initial data population or when you want latest names
        """
        return cls(
            driver_mode="full",
            team_mode="full",
            circuit_mode="full",
            session_mode="full",
            auto_create_driver_aliases=True,
            auto_create_team_aliases=True,
            preserve_canonical_numbers=False,
            preserve_canonical_names=False,
            include_results=True,
        )


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

    def _get_or_create_circuit(self, repo: RacingRepository, meeting: OpenF1Meeting, options: SyncOptions | None = None) -> UUID:
        """Get or create circuit from meeting data."""
        options = options or SyncOptions()
        slug = slugify(meeting.circuit_short_name)
        
        if slug in self._circuit_cache:
            return self._circuit_cache[slug]

        existing = repo.get_circuit_by_slug(slug)
        if existing:
            self._circuit_cache[slug] = existing.id
            if options.circuit_mode == "create_only" and options.log_skipped_updates:
                logger.debug("Circuit exists, skipping update (create_only mode)", slug=slug)
            return existing.id

        if options.circuit_mode == "skip":
            logger.warning("Circuit not found but skip mode enabled", slug=slug)
            return None  # type: ignore

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

    def _get_or_create_driver(
        self, 
        repo: RacingRepository, 
        openf1_driver: OpenF1Driver,
        options: SyncOptions | None = None,
    ) -> UUID:
        """Get or create driver from OpenF1 driver data.
        
        Uses EntityResolver for intelligent matching and alias tracking.
        Respects SyncOptions for controlling update behavior.
        """
        options = options or SyncOptions()
        
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

        # Handle based on mode and whether driver exists
        if resolved.is_new:
            if options.driver_mode == "skip":
                logger.warning(
                    "New driver found but skip mode enabled",
                    name=openf1_driver.full_name,
                    number=openf1_driver.driver_number,
                )
                return None  # type: ignore
            
            logger.info(
                "Creating new driver",
                name=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                number=resolved.driver.driver_number,
            )
            # Upsert the new driver
            driver_id = repo.upsert_driver(resolved.driver)
            
        else:  # Driver exists
            existing = resolved.driver
            driver_id = resolved.existing_id
            
            if options.driver_mode == "skip":
                # Use existing driver as-is
                self._driver_cache[openf1_driver.driver_number] = driver_id
                return driver_id
            
            if options.driver_mode == "create_only":
                # Don't update the driver, but DO create aliases for variations
                if options.log_skipped_updates and (resolved.name_changed or 
                    openf1_driver.driver_number != existing.driver_number):
                    logger.info(
                        "Driver exists, skipping update (create_only mode)",
                        existing_name=f"{existing.first_name} {existing.last_name}",
                        incoming_name=openf1_driver.full_name,
                        existing_number=existing.driver_number,
                        incoming_number=openf1_driver.driver_number,
                    )
                
                # Create aliases for the incoming data variations
                if options.auto_create_driver_aliases:
                    self._create_driver_aliases_only(
                        repo, existing, openf1_driver, resolved.aliases_to_add
                    )
                
                self._driver_cache[openf1_driver.driver_number] = driver_id
                return driver_id
            
            # Full mode - apply updates with optional preservation
            if options.preserve_canonical_names:
                # Keep existing names, only update other fields
                resolved.driver.first_name = existing.first_name
                resolved.driver.last_name = existing.last_name
                resolved.driver.slug = existing.slug
            
            if options.preserve_canonical_numbers:
                # Keep existing driver number, incoming number becomes alias
                resolved.driver.driver_number = existing.driver_number
                # Add incoming number as alias if different
                if openf1_driver.driver_number != existing.driver_number:
                    incoming_alias = DriverAlias(
                        driver_id=driver_id,
                        alias_name=openf1_driver.full_name,
                        alias_slug=slugify(openf1_driver.full_name),
                        series_id=self._series_id,
                        driver_number=openf1_driver.driver_number,
                        source="OpenF1-number-variation",
                    )
                    if incoming_alias not in resolved.aliases_to_add:
                        resolved.aliases_to_add.append(incoming_alias)
            
            if resolved.name_changed:
                logger.info(
                    "Updating driver canonical name",
                    old_name=resolved.old_name,
                    new_name=f"{resolved.driver.first_name} {resolved.driver.last_name}",
                    number=resolved.driver.driver_number,
                )
            
            # Upsert the driver (updates existing)
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
                alias_number=alias.driver_number,
            )

        # Update local cache
        self._driver_cache[openf1_driver.driver_number] = driver_id
        return driver_id

    def _create_driver_aliases_only(
        self,
        repo: RacingRepository,
        existing_driver: Driver,
        openf1_driver: OpenF1Driver,
        additional_aliases: list[DriverAlias],
    ) -> None:
        """Create aliases for a driver without updating the driver itself.
        
        Used in create_only mode to track name/number variations as aliases.
        """
        aliases_to_add = list(additional_aliases)
        
        # If incoming driver number differs, create alias
        if openf1_driver.driver_number != existing_driver.driver_number:
            number_alias = DriverAlias(
                driver_id=existing_driver.id,
                alias_name=openf1_driver.full_name,
                alias_slug=slugify(openf1_driver.full_name),
                series_id=self._series_id,
                driver_number=openf1_driver.driver_number,
                source="OpenF1-number-variation",
            )
            aliases_to_add.append(number_alias)
            logger.info(
                "Creating driver number alias (create_only mode)",
                driver=f"{existing_driver.first_name} {existing_driver.last_name}",
                canonical_number=existing_driver.driver_number,
                alias_number=openf1_driver.driver_number,
            )
        
        # If incoming name differs, create alias  
        existing_name = f"{existing_driver.first_name} {existing_driver.last_name}"
        if openf1_driver.full_name != existing_name:
            incoming_slug = slugify(openf1_driver.full_name)
            if incoming_slug != existing_driver.slug:
                name_alias = DriverAlias(
                    driver_id=existing_driver.id,
                    alias_name=openf1_driver.full_name,
                    alias_slug=incoming_slug,
                    series_id=self._series_id,
                    driver_number=openf1_driver.driver_number,
                    source="OpenF1-name-variation",
                )
                aliases_to_add.append(name_alias)
        
        # Upsert all aliases
        for alias in aliases_to_add:
            alias.driver_id = existing_driver.id
            repo.upsert_driver_alias(alias)
            self._entity_resolver.add_alias_to_cache(driver_alias=alias)

    def _get_or_create_team(
        self, 
        repo: RacingRepository, 
        openf1_driver: OpenF1Driver,
        options: SyncOptions | None = None,
    ) -> UUID | None:
        """Get or create team from OpenF1 driver data.
        
        Uses EntityResolver for intelligent matching and alias tracking.
        Respects SyncOptions for controlling update behavior:
        - create_only: Only create new teams, never update existing ones
        - preserve_canonical_names: Keep existing team names, only add aliases
        
        Returns None if the driver has no team (e.g., reserve/test drivers).
        """
        if not openf1_driver.team_name:
            return None
        
        options = options or SyncOptions()

        slug = slugify(openf1_driver.team_name)
        if slug in self._team_cache:
            return self._team_cache[slug]

        # Use entity resolver for intelligent matching
        assert self._entity_resolver is not None
        
        resolved = self._entity_resolver.resolve_team(
            name=openf1_driver.team_name,
            primary_color=openf1_driver.team_colour,
        )

        # Handle existing team resolution based on options
        if not resolved.is_new:
            existing = resolved.team
            team_id = resolved.existing_id
            assert team_id is not None
            
            if options.team_mode == "skip":
                # Skip mode: use existing team as-is
                self._team_cache[slug] = team_id
                self._team_cache[resolved.team.slug] = team_id
                return team_id
            
            if options.team_mode == "create_only":
                # Create-only mode: don't update, just add aliases
                if options.auto_create_team_aliases:
                    self._create_team_aliases_only(
                        repo, existing, openf1_driver, resolved.aliases_to_add
                    )
                if options.log_skipped_updates and resolved.name_changed:
                    logger.info(
                        "Team exists, skipping update (create_only mode)",
                        existing_name=existing.name,
                        incoming_name=openf1_driver.team_name,
                    )
                self._team_cache[slug] = team_id
                self._team_cache[resolved.team.slug] = team_id
                return team_id
            
            # Full mode - apply updates with optional preservation
            if options.preserve_canonical_names:
                # Keep existing name, only update other fields  
                resolved.team.name = existing.name
                resolved.team.slug = existing.slug
            
            if resolved.name_changed and not options.preserve_canonical_names:
                logger.info(
                    "Updating team canonical name",
                    old_name=resolved.old_name,
                    new_name=resolved.team.name,
                )
            
            # Upsert the team (updates existing)
            team_id = repo.upsert_team(resolved.team)
        else:
            # New team - always create
            logger.info("Creating new team", name=resolved.team.name)
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

    def _create_team_aliases_only(
        self,
        repo: RacingRepository,
        existing_team: Team,
        openf1_driver: OpenF1Driver,
        additional_aliases: list[TeamAlias],
    ) -> None:
        """Create aliases for a team without updating the team itself.
        
        Used in create_only mode to track name variations as aliases.
        """
        aliases_to_add = list(additional_aliases)
        
        # If incoming name differs, ensure it becomes an alias
        incoming_slug = slugify(openf1_driver.team_name)
        if incoming_slug != existing_team.slug:
            # Check if this alias already exists
            already_exists = any(
                a.alias_slug == incoming_slug for a in aliases_to_add
            )
            if not already_exists:
                name_alias = TeamAlias(
                    team_id=existing_team.id,
                    alias_name=openf1_driver.team_name,
                    alias_slug=incoming_slug,
                    series_id=self._series_id,
                    source="OpenF1-name-variation",
                )
                aliases_to_add.append(name_alias)
                logger.info(
                    "Creating team name alias (create_only mode)",
                    team=existing_team.name,
                    alias=openf1_driver.team_name,
                )
        
        # Upsert all aliases
        for alias in aliases_to_add:
            alias.team_id = existing_team.id
            repo.upsert_team_alias(alias)
            self._entity_resolver.add_alias_to_cache(team_alias=alias)

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

    def sync_year(
        self, 
        year: int, 
        include_results: bool = True,
        options: SyncOptions | None = None,
    ) -> dict:
        """Sync all F1 data for a given year.

        Args:
            year: The season year (e.g., 2024)
            include_results: Whether to fetch and store results (⚠️ spoiler data)
            options: SyncOptions controlling entity update behavior

        Returns:
            Dict with sync statistics
        """
        api, repo = self._ensure_clients()
        options = options or SyncOptions()

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
        print(f"  🔧 Ensuring F1 series and {year} season exist...")
        season_id = self._ensure_season(repo, year)

        # Fetch all meetings for the year
        print(f"  📡 Fetching meetings from OpenF1...")
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

        print(f"  📋 Found {len(meetings)} meetings for {year}")
        logger.info("Found meetings", count=len(meetings), year=year)

        # Sort meetings by date to calculate proper round numbers
        sorted_meetings = sorted(meetings, key=lambda m: m.date_start)
        
        # Calculate round numbers: 0 for pre-season testing, 1-N for races
        round_number_map = self._calculate_round_numbers(sorted_meetings)

        for i, meeting in enumerate(sorted_meetings, 1):
            meeting_name = meeting.meeting_name
            round_number = round_number_map.get(meeting.meeting_key, i)
            
            # Determine if this is testing or a race weekend
            meeting_type = "Testing" if round_number == 0 else f"Round {round_number}"
            print(f"\n  🏎️  [{i}/{len(sorted_meetings)}] {meeting_name} ({meeting_type})")
            
            try:
                self._sync_meeting(
                    api, repo, meeting, season_id, include_results, stats, round_number, options
                )
                stats["meetings_synced"] += 1
                logger.info(
                    "Synced meeting",
                    meeting=meeting.meeting_name,
                    round_number=round_number,
                    progress=f"{i}/{len(sorted_meetings)}",
                )
                
                # Rate limiting: small pause between meetings to avoid hammering the API
                # Skip pause after the last meeting
                if i < len(sorted_meetings):
                    time.sleep(1.0)
                    
            except Exception as e:
                print(f"      ❌ Error: {e}")
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
        options: SyncOptions | None = None,
    ) -> None:
        """Sync a single meeting (race weekend).
        
        Args:
            api: OpenF1 client
            repo: Database repository
            meeting: Meeting data from OpenF1
            season_id: UUID of the season
            include_results: Whether to sync results
            stats: Statistics dictionary to update
            round_number: Round number in the season
            options: SyncOptions controlling entity update behavior
        """
        options = options or SyncOptions()
        
        # Create circuit
        print(f"      📍 Circuit: {meeting.circuit_short_name or meeting.country_name}")
        circuit_id = self._get_or_create_circuit(repo, meeting, options)

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
        print(f"      📅 Sessions: {len(sessions)}")

        # Track entrants for this round (driver_number -> entrant_id)
        entrant_map: dict[int, UUID] = {}

        # First, sync drivers and teams from first session with driver data
        if sessions:
            drivers = api.get_drivers_for_meeting(meeting.meeting_key)
            driver_count = 0
            for driver_data in drivers:
                # Skip drivers without teams (reserve/test drivers not competing)
                if not driver_data.team_name:
                    logger.debug(
                        "Skipping driver without team",
                        driver=driver_data.full_name,
                        driver_number=driver_data.driver_number,
                    )
                    continue
                    
                driver_id = self._get_or_create_driver(repo, driver_data, options)
                team_id = self._get_or_create_team(repo, driver_data, options)
                
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
                driver_count += 1

            stats["teams_synced"] = len(self._team_cache)
            print(f"      👥 Drivers: {driver_count}")

        # Sync sessions
        session_names = []
        results_count = 0
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
            session_names.append(openf1_session.session_name)

            # Sync results if requested and session is completed
            if include_results and session.status == SessionStatus.COMPLETED:
                prev_results = stats["results_synced"]
                self._sync_session_results(
                    api, repo, openf1_session, session_id, round_id, entrant_map, stats
                )
                results_count += stats["results_synced"] - prev_results
        
        # Print session summary on one line
        print(f"      🏁 Sessions synced: {', '.join(session_names)}")
        if include_results and results_count > 0:
            print(f"      📊 Results: {results_count}")

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
            # Skip results without a position (e.g., DNS in qualifying with no time set)
            if sr.position is None:
                logger.debug(
                    "Skipping result with no position",
                    driver_number=sr.driver_number,
                    session_key=openf1_session.session_key,
                )
                continue
            
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

    def sync_results_only_year(self, year: int) -> dict:
        """Sync ONLY results for existing sessions in a given year.
        
        This is a lightweight sync that:
        - Does NOT create/update drivers, teams, circuits, rounds, or sessions
        - Only fetches results from OpenF1 for existing completed sessions
        - Uses existing entrant mappings
        
        Use this when you want to add results without modifying any entity data.
        
        Returns:
            Dictionary with sync statistics.
        """
        api, repo = self._ensure_clients()
        
        stats = {
            "year": year,
            "sessions_checked": 0,
            "sessions_with_existing_results": 0,
            "sessions_synced": 0,
            "results_synced": 0,
            "errors": [],
        }
        
        logger.info("Starting results-only sync", year=year)
        
        # Get all completed sessions for this year
        print(f"  🔍 Finding completed sessions for {year}...")
        sessions = repo.get_completed_sessions_by_year(year)
        stats["sessions_checked"] = len(sessions)
        
        print(f"  📋 Found {len(sessions)} completed sessions")
        logger.info(
            "Found completed sessions",
            year=year,
            count=len(sessions),
        )
        
        # Cache entrant maps by round_id to avoid repeated queries
        entrant_cache: dict[str, dict[int, Any]] = {}
        
        for i, session in enumerate(sessions, 1):
            try:
                # Skip if session already has results
                existing_count = repo.count_results_for_session(session.id)
                if existing_count > 0:
                    stats["sessions_with_existing_results"] += 1
                    logger.debug(
                        "Session already has results, skipping",
                        session_key=session.openf1_session_key,
                        existing_count=existing_count,
                    )
                    continue
                
                # Get entrant map for this round (cached)
                round_id_str = str(session.round_id)
                if round_id_str not in entrant_cache:
                    entrant_cache[round_id_str] = repo.get_entrants_by_round(session.round_id)
                entrant_map = entrant_cache[round_id_str]
                
                if not entrant_map:
                    logger.warning(
                        "No entrants found for round, skipping session",
                        session_key=session.openf1_session_key,
                        round_id=round_id_str,
                    )
                    continue
                
                # Create a minimal OpenF1Session object for the results sync
                # We only need session_key and session_name for logging
                openf1_session = type('OpenF1Session', (), {
                    'session_key': session.openf1_session_key,
                    'session_name': session.type.value,
                })()
                
                # Show progress
                prev_count = stats["results_synced"]
                
                # Use existing _sync_session_results method
                self._sync_session_results(
                    api, repo, openf1_session, session.id, session.round_id, entrant_map, stats
                )
                stats["sessions_synced"] += 1
                
                new_results = stats["results_synced"] - prev_count
                print(f"  [{i}/{len(sessions)}] {session.type.value}: +{new_results} results")
                
            except Exception as e:
                error_msg = f"Session {session.openf1_session_key}: {e}"
                logger.warning("Failed to sync results for session", error=error_msg)
                stats["errors"].append(error_msg)
        
        print(f"\n  ✅ Results sync complete:")
        print(f"      Sessions checked: {stats['sessions_checked']}")
        print(f"      Already had results: {stats['sessions_with_existing_results']}")
        print(f"      Sessions synced: {stats['sessions_synced']}")
        print(f"      Results added: {stats['results_synced']}")
        if stats['errors']:
            print(f"      Errors: {len(stats['errors'])}")
        
        logger.info(
            "Results-only sync complete",
            year=year,
            sessions_synced=stats["sessions_synced"],
            results_synced=stats["results_synced"],
            skipped=stats["sessions_with_existing_results"],
            errors=len(stats["errors"]),
        )
        
        return stats
