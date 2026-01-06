"""
Entity Resolver for normalizing and reconciling racing entities.

This module handles:
- Matching incoming data to existing canonical entities
- Resolving aliases and name variations
- Updating canonical names to latest official values
- Tracking historical aliases for UI display

Key design principles:
1. OpenF1 driver_number is the primary stable identifier for F1 drivers
2. Slug matching is used as fallback and for teams/circuits
3. Fuzzy matching helps catch typos and variations
4. Canonical names are always updated to the latest incoming value
5. Historical aliases are preserved for reference
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

import structlog  # type: ignore

from ingestion.models import Driver, DriverAlias, Team, TeamAlias, slugify

if TYPE_CHECKING:
    from ingestion.repository import RacingRepository

logger = structlog.get_logger()


@dataclass
class ResolvedDriver:
    """Result of resolving a driver from incoming data."""

    driver: Driver
    is_new: bool
    existing_id: UUID | None
    aliases_to_add: list[DriverAlias] = field(default_factory=list)
    name_changed: bool = False
    old_name: str | None = None


@dataclass
class ResolvedTeam:
    """Result of resolving a team from incoming data."""

    team: Team
    is_new: bool
    existing_id: UUID | None
    aliases_to_add: list[TeamAlias] = field(default_factory=list)
    name_changed: bool = False
    old_name: str | None = None


class EntityResolver:
    """Resolves and normalizes entity identities during ingestion.

    The resolver uses a priority-based matching strategy:
    1. OpenF1 driver number (most stable for F1)
    2. Exact slug match
    3. Known alias match (from JSON config)
    4. Database alias match
    5. Fuzzy slug match (for minor variations)

    When a match is found, the canonical name is updated to the latest
    value, and any new name variations are recorded as aliases.
    """

    def __init__(
        self,
        repository: RacingRepository,
        series_id: UUID | None = None,
    ) -> None:
        self.repository = repository
        self.series_id = series_id
        self._known_aliases = self._load_known_aliases()

        # In-memory caches (populated from DB on first use)
        self._driver_cache: dict[str, Driver] = {}  # slug -> Driver
        self._driver_by_number: dict[int, Driver] = {}  # driver_number -> Driver
        self._team_cache: dict[str, Team] = {}  # slug -> Team
        self._driver_alias_cache: dict[str, UUID] = {}  # alias_slug -> driver_id
        self._team_alias_cache: dict[str, UUID] = {}  # alias_slug -> team_id
        self._cache_initialized = False

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_known_aliases() -> dict:
        """Load known aliases from JSON file."""
        aliases_file = Path(__file__).parent / "known_aliases.json"
        if aliases_file.exists():
            with open(aliases_file, encoding="utf-8") as f:
                return json.load(f)
        logger.warning("Known aliases file not found", path=str(aliases_file))
        return {"drivers": {}, "teams": {}, "circuits": {}}

    def _init_cache(self) -> None:
        """Initialize caches from database."""
        if self._cache_initialized:
            return

        # Load all drivers
        drivers = self.repository.get_all_drivers()
        for driver in drivers:
            self._driver_cache[driver.slug] = driver
            if driver.openf1_driver_number is not None:
                self._driver_by_number[driver.openf1_driver_number] = driver
            elif driver.driver_number is not None:
                # Fallback to driver_number if no openf1 number
                self._driver_by_number[driver.driver_number] = driver

        # Load all teams
        teams = self.repository.get_all_teams()
        for team in teams:
            self._team_cache[team.slug] = team

        # Load all driver aliases
        driver_aliases = self.repository.get_all_driver_aliases()
        for alias in driver_aliases:
            self._driver_alias_cache[alias.alias_slug] = alias.driver_id

        # Load all team aliases
        team_aliases = self.repository.get_all_team_aliases()
        for alias in team_aliases:
            self._team_alias_cache[alias.alias_slug] = alias.team_id

        self._cache_initialized = True
        logger.info(
            "Entity resolver cache initialized",
            drivers=len(self._driver_cache),
            teams=len(self._team_cache),
            driver_aliases=len(self._driver_alias_cache),
            team_aliases=len(self._team_alias_cache),
        )

    def resolve_driver(
        self,
        full_name: str,
        first_name: str | None,
        last_name: str | None,
        driver_number: int | None,
        abbreviation: str | None = None,
        nationality: str | None = None,
        headshot_url: str | None = None,
    ) -> ResolvedDriver:
        """Resolve a driver from incoming data.

        Attempts to match to an existing driver using:
        1. Driver number (most reliable for F1)
        2. Exact slug match
        3. Known alias lookup
        4. Database alias lookup
        5. Fuzzy matching

        Args:
            full_name: Full driver name from source
            first_name: First name (may be None)
            last_name: Last name (may be None)
            driver_number: Racing number (primary identifier for F1)
            abbreviation: Three-letter code (e.g., VER, HAM)
            nationality: Country code
            headshot_url: URL to headshot image

        Returns:
            ResolvedDriver with driver entity and resolution metadata
        """
        self._init_cache()

        incoming_slug = slugify(full_name)
        name_parts = full_name.split(" ", 1)
        resolved_first = first_name or name_parts[0]
        resolved_last = last_name or (name_parts[1] if len(name_parts) > 1 else "")

        # Check known aliases to get canonical name (regardless of match strategy)
        canonical = self._find_known_driver_alias(full_name, incoming_slug, driver_number)
        if canonical:
            canonical_first = canonical.get("canonical_first_name", resolved_first)
            canonical_last = canonical.get("canonical_last_name", resolved_last)
        else:
            canonical_first = resolved_first
            canonical_last = resolved_last

        # Strategy 1: Match by driver number (most stable for F1)
        # However, reserve drivers may share numbers temporarily, so verify the name is similar
        if driver_number is not None and driver_number in self._driver_by_number:
            existing = self._driver_by_number[driver_number]
            # Sanity check: last name should match (case-insensitive)
            # This prevents reserve drivers from being confused
            if existing.last_name.lower() == canonical_last.lower():
                return self._create_driver_resolution(
                    existing=existing,
                    incoming_slug=incoming_slug,
                    full_name=full_name,
                    first_name=canonical_first,
                    last_name=canonical_last,
                    driver_number=driver_number,
                    abbreviation=abbreviation,
                    nationality=nationality,
                    headshot_url=headshot_url,
                )
            # If last name differs, this might be a different driver with the same
            # number (common for reserve drivers). Fall through to other strategies.

        # Strategy 2: Exact slug match
        if incoming_slug in self._driver_cache:
            existing = self._driver_cache[incoming_slug]
            return self._create_driver_resolution(
                existing=existing,
                incoming_slug=incoming_slug,
                full_name=full_name,
                first_name=canonical_first,
                last_name=canonical_last,
                driver_number=driver_number,
                abbreviation=abbreviation,
                nationality=nationality,
                headshot_url=headshot_url,
            )

        # Strategy 3: Known alias lookup (from JSON config)
        if canonical:
            canonical_slug = slugify(canonical["canonical_name"])
            if canonical_slug in self._driver_cache:
                existing = self._driver_cache[canonical_slug]
                return self._create_driver_resolution(
                    existing=existing,
                    incoming_slug=incoming_slug,
                    full_name=canonical["canonical_name"],
                    first_name=canonical_first,
                    last_name=canonical_last,
                    driver_number=driver_number,
                    abbreviation=abbreviation,
                    nationality=nationality,
                    headshot_url=headshot_url,
                    original_name=full_name,
                )

        # Strategy 4: Database alias lookup
        if incoming_slug in self._driver_alias_cache:
            driver_id = self._driver_alias_cache[incoming_slug]
            existing = self._find_driver_by_id(driver_id)
            if existing:
                return self._create_driver_resolution(
                    existing=existing,
                    incoming_slug=incoming_slug,
                    full_name=full_name,
                    first_name=canonical_first,
                    last_name=canonical_last,
                    driver_number=driver_number,
                    abbreviation=abbreviation,
                    nationality=nationality,
                    headshot_url=headshot_url,
                )

        # Strategy 5: Fuzzy slug match
        fuzzy_match = self._fuzzy_match_driver(incoming_slug)
        if fuzzy_match:
            return self._create_driver_resolution(
                existing=fuzzy_match,
                incoming_slug=incoming_slug,
                full_name=full_name,
                first_name=canonical_first,
                last_name=canonical_last,
                driver_number=driver_number,
                abbreviation=abbreviation,
                nationality=nationality,
                headshot_url=headshot_url,
            )

        # No match found - create new driver
        if canonical:
            final_first = canonical_first
            final_last = canonical_last
            final_slug = slugify(canonical["canonical_name"])
        else:
            final_first = resolved_first
            final_last = resolved_last
            final_slug = incoming_slug

        new_driver = Driver(
            first_name=final_first,
            last_name=final_last,
            slug=final_slug,
            abbreviation=abbreviation,
            nationality=nationality,
            headshot_url=headshot_url,
            driver_number=driver_number,
            openf1_driver_number=driver_number,
        )

        # Add alias if incoming slug differs from canonical
        aliases_to_add = []
        if incoming_slug != final_slug:
            aliases_to_add.append(
                DriverAlias(
                    driver_id=new_driver.id,
                    alias_name=full_name,
                    alias_slug=incoming_slug,
                    series_id=self.series_id,
                    driver_number=driver_number,
                    source="OpenF1",
                )
            )

        return ResolvedDriver(
            driver=new_driver,
            is_new=True,
            existing_id=None,
            aliases_to_add=aliases_to_add,
        )

    def _create_driver_resolution(
        self,
        existing: Driver,
        incoming_slug: str,
        full_name: str,
        first_name: str,
        last_name: str,
        driver_number: int | None,
        abbreviation: str | None,
        nationality: str | None,
        headshot_url: str | None,
        original_name: str | None = None,
    ) -> ResolvedDriver:
        """Create a resolution result for an existing driver match."""
        old_full_name = f"{existing.first_name} {existing.last_name}"
        new_full_name = f"{first_name} {last_name}"

        # Determine if name changed (canonical update)
        name_changed = old_full_name != new_full_name

        # Create updated driver with latest values
        updated_driver = Driver(
            id=existing.id,
            first_name=first_name,
            last_name=last_name,
            slug=slugify(new_full_name) if name_changed else existing.slug,
            abbreviation=abbreviation or existing.abbreviation,
            nationality=nationality or existing.nationality,
            headshot_url=headshot_url or existing.headshot_url,
            driver_number=driver_number or existing.driver_number,
            openf1_driver_number=driver_number or existing.openf1_driver_number,
        )

        # Track aliases to add
        aliases_to_add = []

        # If name changed, add old name as alias
        if name_changed and old_full_name.strip():
            old_slug = slugify(old_full_name)
            if old_slug and old_slug != updated_driver.slug:
                aliases_to_add.append(
                    DriverAlias(
                        driver_id=existing.id,
                        alias_name=old_full_name,
                        alias_slug=old_slug,
                        series_id=self.series_id,
                        source="canonical-update",
                    )
                )

        # If incoming slug differs from canonical, add as alias
        if incoming_slug != updated_driver.slug:
            # Check if alias already exists
            if incoming_slug not in self._driver_alias_cache:
                alias_name = original_name or full_name
                aliases_to_add.append(
                    DriverAlias(
                        driver_id=existing.id,
                        alias_name=alias_name,
                        alias_slug=incoming_slug,
                        series_id=self.series_id,
                        driver_number=driver_number,
                        source="OpenF1",
                    )
                )

        return ResolvedDriver(
            driver=updated_driver,
            is_new=False,
            existing_id=existing.id,
            aliases_to_add=aliases_to_add,
            name_changed=name_changed,
            old_name=old_full_name if name_changed else None,
        )

    def _find_known_driver_alias(
        self, full_name: str, slug: str, driver_number: int | None
    ) -> dict | None:
        """Look up driver in known aliases config."""
        drivers = self._known_aliases.get("drivers", {})

        # Check by driver number first
        if driver_number:
            for canonical_slug, data in drivers.items():
                if isinstance(data, dict) and driver_number in data.get(
                    "driver_numbers", []
                ):
                    return {**data, "canonical_slug": canonical_slug}

        # Check by slug match
        for canonical_slug, data in drivers.items():
            if isinstance(data, dict):
                if canonical_slug == slug:
                    return {**data, "canonical_slug": canonical_slug}
                # Check aliases
                for alias in data.get("aliases", []):
                    if slugify(alias.get("name", "")) == slug:
                        return {**data, "canonical_slug": canonical_slug}

        return None

    def _find_driver_by_id(self, driver_id: UUID) -> Driver | None:
        """Find a driver in cache by ID."""
        for driver in self._driver_cache.values():
            if driver.id == driver_id:
                return driver
        return None

    def _fuzzy_match_driver(self, slug: str) -> Driver | None:
        """Attempt fuzzy matching for driver slug.

        Handles common variations like:
        - Missing hyphens
        - Truncated names
        - Minor typos (Levenshtein distance <= 2)
        """
        # Normalize: remove all non-alphanumeric
        normalized = re.sub(r"[^a-z0-9]", "", slug)

        for existing_slug, driver in self._driver_cache.items():
            existing_normalized = re.sub(r"[^a-z0-9]", "", existing_slug)

            # Check if one contains the other (truncation)
            if normalized in existing_normalized or existing_normalized in normalized:
                logger.debug(
                    "Fuzzy match (containment)",
                    incoming=slug,
                    matched=existing_slug,
                )
                return driver

            # Simple Levenshtein check for short strings
            if len(normalized) <= 15 and len(existing_normalized) <= 15:
                if self._levenshtein_distance(normalized, existing_normalized) <= 2:
                    logger.debug(
                        "Fuzzy match (levenshtein)",
                        incoming=slug,
                        matched=existing_slug,
                    )
                    return driver

        return None

    @staticmethod
    def _levenshtein_distance(s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return EntityResolver._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def resolve_team(
        self,
        name: str,
        primary_color: str | None = None,
        logo_url: str | None = None,
    ) -> ResolvedTeam:
        """Resolve a team from incoming data.

        Similar strategy to drivers but without driver numbers.

        Args:
            name: Team name from source
            primary_color: Team color (hex)
            logo_url: URL to team logo

        Returns:
            ResolvedTeam with team entity and resolution metadata
        """
        self._init_cache()

        incoming_slug = slugify(name)

        # Strategy 1: Exact slug match
        if incoming_slug in self._team_cache:
            existing = self._team_cache[incoming_slug]
            return self._create_team_resolution(
                existing=existing,
                incoming_slug=incoming_slug,
                name=name,
                primary_color=primary_color,
                logo_url=logo_url,
            )

        # Strategy 2: Known alias lookup (from JSON config)
        canonical = self._find_known_team_alias(name, incoming_slug)
        if canonical:
            canonical_slug = slugify(canonical["canonical_name"])
            if canonical_slug in self._team_cache:
                existing = self._team_cache[canonical_slug]
                return self._create_team_resolution(
                    existing=existing,
                    incoming_slug=incoming_slug,
                    name=canonical["canonical_name"],
                    primary_color=primary_color,
                    logo_url=logo_url,
                    original_name=name,
                )

        # Strategy 3: Database alias lookup
        if incoming_slug in self._team_alias_cache:
            team_id = self._team_alias_cache[incoming_slug]
            existing = self._find_team_by_id(team_id)
            if existing:
                return self._create_team_resolution(
                    existing=existing,
                    incoming_slug=incoming_slug,
                    name=name,
                    primary_color=primary_color,
                    logo_url=logo_url,
                )

        # Strategy 4: Fuzzy slug match
        fuzzy_match = self._fuzzy_match_team(incoming_slug)
        if fuzzy_match:
            return self._create_team_resolution(
                existing=fuzzy_match,
                incoming_slug=incoming_slug,
                name=name,
                primary_color=primary_color,
                logo_url=logo_url,
            )

        # No match found - create new team
        canonical = self._find_known_team_alias(name, incoming_slug)
        if canonical:
            final_name = canonical["canonical_name"]
            final_slug = slugify(final_name)
        else:
            final_name = name
            final_slug = incoming_slug

        new_team = Team(
            name=final_name,
            slug=final_slug,
            primary_color=primary_color,
            logo_url=logo_url,
        )

        # Add alias if incoming slug differs from canonical
        aliases_to_add = []
        if incoming_slug != final_slug:
            aliases_to_add.append(
                TeamAlias(
                    team_id=new_team.id,
                    alias_name=name,
                    alias_slug=incoming_slug,
                    series_id=self.series_id,
                    source="OpenF1",
                )
            )

        return ResolvedTeam(
            team=new_team,
            is_new=True,
            existing_id=None,
            aliases_to_add=aliases_to_add,
        )

    def _create_team_resolution(
        self,
        existing: Team,
        incoming_slug: str,
        name: str,
        primary_color: str | None,
        logo_url: str | None,
        original_name: str | None = None,
    ) -> ResolvedTeam:
        """Create a resolution result for an existing team match."""
        name_changed = existing.name != name

        # Create updated team with latest values
        updated_team = Team(
            id=existing.id,
            name=name,
            slug=slugify(name) if name_changed else existing.slug,
            short_name=existing.short_name,
            primary_color=primary_color or existing.primary_color,
            logo_url=logo_url or existing.logo_url,
        )

        # Track aliases to add
        aliases_to_add = []

        # If name changed, add old name as alias
        if name_changed:
            old_slug = existing.slug
            if old_slug != updated_team.slug:
                aliases_to_add.append(
                    TeamAlias(
                        team_id=existing.id,
                        alias_name=existing.name,
                        alias_slug=old_slug,
                        series_id=self.series_id,
                        source="canonical-update",
                    )
                )

        # If incoming slug differs from canonical, add as alias
        if incoming_slug != updated_team.slug:
            if incoming_slug not in self._team_alias_cache:
                alias_name = original_name or name
                aliases_to_add.append(
                    TeamAlias(
                        team_id=existing.id,
                        alias_name=alias_name,
                        alias_slug=incoming_slug,
                        series_id=self.series_id,
                        source="OpenF1",
                    )
                )

        return ResolvedTeam(
            team=updated_team,
            is_new=False,
            existing_id=existing.id,
            aliases_to_add=aliases_to_add,
            name_changed=name_changed,
            old_name=existing.name if name_changed else None,
        )

    def _find_known_team_alias(self, name: str, slug: str) -> dict | None:
        """Look up team in known aliases config."""
        teams = self._known_aliases.get("teams", {})

        for canonical_slug, data in teams.items():
            if isinstance(data, dict):
                if canonical_slug == slug:
                    return {**data, "canonical_slug": canonical_slug}
                # Check aliases
                for alias in data.get("aliases", []):
                    if slugify(alias.get("name", "")) == slug:
                        return {**data, "canonical_slug": canonical_slug}

        return None

    def _find_team_by_id(self, team_id: UUID) -> Team | None:
        """Find a team in cache by ID."""
        for team in self._team_cache.values():
            if team.id == team_id:
                return team
        return None

    def _fuzzy_match_team(self, slug: str) -> Team | None:
        """Attempt fuzzy matching for team slug.

        Teams often have sponsorship variations, so we're more lenient.
        """
        normalized = re.sub(r"[^a-z0-9]", "", slug)

        for existing_slug, team in self._team_cache.items():
            existing_normalized = re.sub(r"[^a-z0-9]", "", existing_slug)

            # Check if core name matches (e.g., "redbull" matches in both)
            core_names = [
                "redbull",
                "mercedes",
                "ferrari",
                "mclaren",
                "astonmartin",
                "alpine",
                "williams",
                "haas",
                "sauber",
                "alphatauri",
                "tororosso",
            ]
            for core in core_names:
                if core in normalized and core in existing_normalized:
                    logger.debug(
                        "Fuzzy match (core name)",
                        incoming=slug,
                        matched=existing_slug,
                        core=core,
                    )
                    return team

        return None

    def update_cache_after_upsert(
        self, driver: Driver | None = None, team: Team | None = None
    ) -> None:
        """Update internal cache after upserting an entity."""
        if driver:
            self._driver_cache[driver.slug] = driver
            if driver.openf1_driver_number is not None:
                self._driver_by_number[driver.openf1_driver_number] = driver
            elif driver.driver_number is not None:
                self._driver_by_number[driver.driver_number] = driver

        if team:
            self._team_cache[team.slug] = team

    def add_alias_to_cache(
        self, driver_alias: DriverAlias | None = None, team_alias: TeamAlias | None = None
    ) -> None:
        """Add an alias to the internal cache."""
        if driver_alias:
            self._driver_alias_cache[driver_alias.alias_slug] = driver_alias.driver_id
        if team_alias:
            self._team_alias_cache[team_alias.alias_slug] = team_alias.team_id
