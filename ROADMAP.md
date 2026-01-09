# Parc Fermé - Development Roadmap

> Last updated: January 9, 2026

## 🏁 Current Sprint: Core Discovery & Logging

### ✅ Completed

#### Infrastructure & Foundation
- [x] Project scaffolding (monorepo structure)
- [x] .NET 10 API setup with EF Core, Identity, PostgreSQL
- [x] React 18 + Vite + TypeScript + Tailwind frontend
- [x] Docker Compose for local services (PostgreSQL, Redis, Elasticsearch)
- [x] CI/CD pipeline (GitHub Actions)
- [x] Unit and Integration tests (backend + frontend)

#### Authentication & Authorization
- [x] Authentication infrastructure (JWT + refresh tokens)
- [x] Authorization with membership tiers (Free / PaddockPass)
- [x] Frontend auth state management (Redux Toolkit)
- [x] Protected routes and membership gates
- [x] Auth UI pages (Login, Register, Profile)

#### Data Layer
- [x] Domain models (Series, Season, Round, Session, Circuit, Driver, Team, etc.)
- [x] Social models (Log, Review, Experience, UserList, UserFollow)
- [x] Caching infrastructure (Redis service, response caching)
- [x] Python ingestion project structure
- [x] OpenF1 data sync implementation (Python ingestion pipeline)
- [x] Entity normalization and alias tracking (Teams, Drivers, Circuits, Series)
  - [x] DriverAlias, TeamAlias, SeriesAlias, CircuitAlias database tables
  - [x] EntityResolver service with multi-strategy matching
  - [x] known_aliases.json config with canonical names and historical aliases
  - [x] Repository updates for ID-first upsert logic
  - [x] Comprehensive tests (33 entity resolver tests, 81 total Python tests)
- [x] Multi-color brand support for Series (database, API, frontend)

#### Spoiler Shield (Core Feature)
- [x] Backend: SpoilerShieldService, SessionDtos, SessionsController
- [x] Frontend: spoilerSlice, useSpoilerShield hook, SpoilerMask/SpoilerBlur components

#### Navigation & Discovery Foundation
- [x] Navigation header + IA refactor for multi-series + discovery
- [x] Global search box (spoiler-safe, respects spoiler_mode)
- [x] Breadcrumbs for deep pages
- [x] Series hub pages + API endpoints
  - [x] SeriesController with full CRUD
  - [x] SeriesDtos with summary and detail types
  - [x] Frontend SeriesListPage and SeriesDetailPage
  - [x] 19 integration tests for SeriesController

#### Bug Fixes
- [x] Fix Antonelli driver duplicate (added DriverNumber field, merged duplicates)

#### Chores
- [x] Add privacy policy and terms of service pages + links in footer
- [x] Add integration tests for SessionsController (31 tests covering spoiler logic)
- [x] Fix cyclic include bug in SpoilerShieldService
- [x] Fix session ordering bug in GetSessionsWithSpoilerShieldAsync
- [x] Enhance Swagger documentation (API info, JWT auth scheme, XML docs)
- [x] Update README with architecture overview and development workflow
- [x] Add unit tests for SpoilerShieldService edge cases (16 tests)

#### Discovery & Session Pages
- [x] Session detail pages + API (spoiler shield end-to-end) (Completed: Jan 7, 2026)
  - Built SessionDetailPage with real API integration via `spoilerApi.getSession()`
  - Spoiler-protected results display using SpoilerMask/SpoilerRevealButton components
  - Session info card, stats grid, results table with driver/team/time columns
  - Other sessions navigation for switching between sessions in a round
  - Updated breadcrumbs builder to use session ID pattern (`/session/{id}`)
  - Added driverNumber to DriverSummaryDto in backend and frontend
  - Loading skeletons and error states with retry functionality
  - Full integration with spoiler reveal flow (temp reveal + permanent via log)

### 🚧 In Progress

_No active tasks_

### 📋 Up Next (Priority Order)

#### 🔥 CRITICAL: Ergast Historical F1 Data Import (1950-2017)

Import historical F1 data from the Ergast archive to enable the full "Letterboxd for motorsport" experience with 68 years of racing history. This is the foundation for Phase 2 (Historical Archive) but prioritized now due to database availability.

**Documentation:** [docs/ERGAST_MIGRATION.md](./docs/ERGAST_MIGRATION.md)

**Data Volume:**
- 68 seasons (1950-2017)
- 976 race weekends
- 23,657 race results
- 7,397 qualifying results (1994+)
- 840 drivers, 208 teams, 73 circuits

##### Phase 1: Schema Migration (Completed: Jan 8, 2026)
- [x] Add new columns to domain models:
  - Circuit: `Altitude`, `WikipediaUrl`
  - Driver: `DateOfBirth`, `WikipediaUrl`
  - Team: `Nationality`, `WikipediaUrl`
  - Round: `ErgastRaceId`, `WikipediaUrl`
  - Result: `TimeMilliseconds`, `FastestLapNumber`, `FastestLapRank`, `FastestLapTime`, `FastestLapSpeed`, `StatusDetail`, `Q1Time`, `Q2Time`, `Q3Time`
- [x] Create EF Core migration (`20260108004257_AddErgastHistoricalFields`)
- [x] Update DTOs and API responses where applicable
  - Updated CircuitDetailDto, DriverSummaryDto, TeamSummaryDto, ResultDto
  - Updated mappings in SpoilerShieldService and RoundsController

##### Phase 2: Reference Data Import (Completed: Jan 8, 2026)
- [x] Refactor OpenF1 ingestion to be more generic/reusable
  - Created `sources/` package with BaseDataSource protocol and SourceXxx dataclasses
  - Created `OpenF1DataSource` adapter wrapping existing client
  - Created `ErgastDataSource` reading directly from ergastf1 PostgreSQL database
  - Created `services/` package with BaseSyncService and ErgastSyncService
  - CLI script: `python -m ingestion.ergast_import --year-range 1950 2017`
  - Supports `--dry-run`, `--skip-existing` flags
  - Maps 134 Ergast status codes to ResultStatus enum
- [x] Import/merge 73 Ergast circuits into ParcFerme (with aliases)
  - All 73 circuits matched existing records, 22 circuit aliases created
  - Final count: 109 circuits in database
- [x] Import/merge 840 drivers (with aliases for name variations)
  - Created 790 new historical drivers, matched 50 existing modern drivers
  - Created 21 driver aliases for name variations
  - Final count: 851 drivers in database
- [x] Import/merge 208 teams/constructors (with aliases for rebrands)
  - Created 191 new historical teams, matched 17 existing modern teams
  - Created 11 team aliases for team rebrands
  - Final count: 203 teams in database
- [x] Create F1 seasons 1950-2019
  - Created 70 seasons (1950-2019), now 77 total with modern 2020-2026

##### Phase 3: Event Data Import (Completed: Jan 8, 2026)
- [x] Import 976 Rounds from Ergast races table
  - All 976 races imported as Rounds
  - Added `--events` CLI command: `python -m ingestion.ergast_import --events 1950 2017`
  - Final count: 1,078 rounds (976 historical + 102 modern)
- [x] Create Sessions (Race for all, Qualifying for 1994+)
  - 1,315 sessions created (Race sessions for all years, Qualifying for 1994+)
  - Final count: 1,854 sessions
- [x] Create Entrants (driver-team-round links)
  - 23,568 entrants created from Ergast results table
  - Final count: 25,014 entrants

##### Phase 4: Results Import (Completed: Jan 8, 2026)
- [x] Import 22,001 race results with status mapping
  - Added `--results` CLI command: `python -m ingestion.ergast_import --results 1950 2017`
  - Maps 134 Ergast status codes to ResultStatus enum (Finished, DNF, DNS, DSQ, NC)
  - Status detail field preserves original status text (e.g., "Engine", "Gearbox", "Collision")
  - Fastest lap data: lap number, rank, time (string), speed
  - Points preserved from original Ergast data
- [x] Import 6,043 qualifying results
  - Q1/Q2/Q3 time fields populated for qualifying sessions
  - Qualifying session times fixed to be day before race (was incorrectly after race)
  - Final count: 28,051 total results in database

##### Bug Fixes During Results Import
- [x] Fixed corrupted driver aliases causing wrong names in UI
  - Bad aliases like "Juan Fangio" for Max Verstappen were overriding correct names
  - Deleted 36 garbage aliases that had no date bounds
- [x] Fixed qualifying session ordering (qualifying was appearing after race)
  - Qualifying sessions now correctly placed day before race at 14:00 UTC
- [x] Fixed wrong entrants in historical races (modern drivers appearing in 1950s-2000s races)
  - Root cause: Ergast stores lifetime permanent numbers (from 2014+) for drivers
  - e.g., Nico Rosberg has #6 in Ergast, matching to Isack Hadjar #6 instead of creating historical Rosberg
  - Fix: Don't use driver_permanent_number for historical matching, use name-based matching
  - Fixed 2,341 wrongly-matched entrants by re-importing

##### Phase 5: Validation & Cleanup (Completed: Jan 9, 2026)
- [x] Verify row counts and data integrity
  - Created `ingestion/validate_ergast.py` comprehensive validation script
  - Historical rounds: 976/976 ✅
  - Historical race results: 22,925/23,657 (97.0%, small gaps from merged teams)
  - Historical qualifying results: 7,064/7,397 (95.5%)
  - Circuits: 109 (exceeds 73 - includes modern circuits)
  - Drivers: 864 (exceeds 840 - includes modern drivers)
  - Teams: 204/208 (4 historical variants merged into canonical teams)
- [x] Spot-check famous races (all verified ✅)
  - 1950 British GP (first F1 race): 23/23 results
  - 1976 Japanese GP (Hunt vs Lauda): 26/26 results
  - 1994 San Marino GP (Senna): 28/28 results
  - 2008 Brazilian GP (Hamilton champion): 20/20 results
  - 2010 Abu Dhabi GP (4-way title fight): 24/24 results
  - 2016 Abu Dhabi GP (Rosberg champion): 22/22 results
- [x] Fix Unicode name matching bug
  - Ergast names with diacritics (Hülkenberg, Pérez, Räikkönen) weren't matching
  - Added `_normalize_name()` function using Unicode NFD normalization
  - Re-imported 2008-2017 results after fix
- [x] Add 4 missing drivers not imported in Phase 2
  - Esteban Gutiérrez, André Lotterer, Roberto Merhi, Antonio Giovinazzi
  - Created 75 missing entrants for their race participations
- [x] ErgastRaceId correlation preserved on Rounds for debugging

**Validation Command:** `python -m ingestion.validate_ergast --famous-races --year-summary`

---

#### 🔧 TECHNICAL DEBT: Robust Entity Matching Framework

**Priority:** High (before adding new data sources)
**Effort:** Medium-Large
**Impact:** Enables reliable multi-source data ingestion for any new series/source

##### Problem Statement

During Ergast import and OpenF1 sync, we encountered multiple entity matching failures that caused data integrity issues. These problems will recur with every new data source (MotoGP, IndyCar, WEC, community contributions). We need a robust, score-based matching system that handles real-world data messiness.

##### Lessons Learned from Ergast Import

**Issue 1: Unicode/Diacritics Mismatch**
- **Root cause:** Ergast stores "Nico Hülkenberg", OpenF1 has "Nico Hulkenberg"
- **Affected fields:** Driver names, team names, circuit names
- **Fix applied:** Added `_normalize_name()` with Unicode NFD decomposition
- **Characters affected:** ü→u, é→e, ö→o, ä→a, ñ→n, ć→c, etc.
- **Driver examples:** Pérez, Räikkönen, Hülkenberg, Gutiérrez, Grosjean, Bottas

**Issue 2: Driver Number Matching Failures**
- **Root cause:** Ergast stores *lifetime* permanent numbers (2014+), not historical race numbers
- **Example:** Nico Rosberg #6 in Ergast matched to Isack Hadjar #6 (2025 driver)
- **Impact:** 2,341 wrongly-matched entrants in historical races (modern drivers appearing in 1990s-2000s)
- **Fix applied:** Disabled driver number matching for historical imports; use name-only matching

**Issue 3: Team Name Variations Across Eras**
- **Examples:**
  - "Red Bull Racing" vs "Red Bull" vs "Oracle Red Bull Racing" vs "Red Bull Racing Honda"
  - "Ferrari" vs "Scuderia Ferrari" vs "Scuderia Ferrari Mission Winnow"
  - "McLaren" vs "McLaren Racing" vs "McLaren Mercedes" vs "McLaren Honda"
- **Current handling:** TeamAlias table with manual entries in known_aliases.json
- **Problem:** Doesn't scale to new series/sources

**Issue 4: Circuit Name Variations**
- **Examples:**
  - "Circuit de Monaco" vs "Monte Carlo Street Circuit" vs "Monaco"
  - "Circuit of the Americas" vs "COTA" vs "Austin"
  - "Autódromo Hermanos Rodríguez" vs "Mexico City" vs "Autodromo Hermanos Rodriguez"
- **Additional complexity:** Circuits change names (sponsors), get reconfigured, or change countries

**Issue 5: OpenF1 Round Names with Sponsor Clutter**
- **Raw OpenF1 data:** `meeting_official_name = "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025"`
- **We want:** "Chinese Grand Prix"
- **Current handling:** Using `meeting_name` field (already clean), but inconsistent across sources
- **Problem:** If we store `meeting_official_name`, we get sponsor clutter; if we don't, we lose official data

##### Proposed Solution: Multi-Signal Confidence Scoring

Replace the current sequential matching strategy with a confidence-score approach:

```
Match Score = Σ(signal_weight × signal_match_score)

Signals (by entity type):
├── Drivers
│   ├── Exact last name match (0.3)
│   ├── First name match (0.2)
│   ├── Driver number match (0.15) - only if within date bounds
│   ├── Abbreviation match (0.15) - VER, HAM, etc.
│   ├── Nationality match (0.1)
│   └── Fuzzy name similarity (0.1) - Levenshtein/Jaro-Winkler
│
├── Teams
│   ├── Exact name match (0.4)
│   ├── Name contains canonical (0.2) - "Oracle Red Bull Racing" contains "Red Bull"
│   ├── Fuzzy name similarity (0.2)
│   ├── Primary color match (0.1) - helps with rebrands
│   └── Year/era overlap (0.1)
│
├── Circuits
│   ├── Exact name match (0.3)
│   ├── Location/city match (0.25) - "Austin" → COTA
│   ├── Country match (0.15)
│   ├── Fuzzy name similarity (0.15)
│   └── Coordinates proximity (0.15) - within 10km
│
└── Rounds/Events
    ├── Exact name match (0.25)
    ├── Circuit match (0.25)
    ├── Date match (0.25) - within 3 days
    ├── Round number + year (0.15)
    └── Fuzzy name similarity (0.1)
```

**Decision thresholds:**
- Score ≥ 0.9: Auto-match (high confidence)
- Score 0.7-0.9: Auto-match with alias creation (medium confidence)
- Score 0.5-0.7: Flag for human review
- Score < 0.5: Create new entity

##### Implementation Tasks

**Phase 1: Core Matching Engine** (Completed: Jan 9, 2026)
- [x] Create `matching/` module in ingestion package
- [x] Implement `MatchResult` dataclass with score, confidence level, signals used
- [x] Implement base `EntityMatcher` class with pluggable signal functions
- [x] Implement `DriverMatcher` with all signals (last_name=0.3, first_name=0.2, number=0.15, abbreviation=0.15, nationality=0.1, fuzzy=0.1)
- [x] Implement `TeamMatcher` with all signals (exact_name=0.4, containment=0.2, fuzzy=0.2, color=0.1, year=0.1)
- [x] Implement `CircuitMatcher` with all signals including geo-distance (exact_name=0.3, location=0.25, country=0.15, fuzzy=0.15, coordinates=0.15)
- [x] Add Levenshtein, Jaro-Winkler, and Damerau-Levenshtein distance utilities
- [x] Unit tests for each matcher with edge cases from Ergast import (156 tests)

**Implementation Summary (Phase 1):**
- Created `src/python/ingestion/matching/` module with: `__init__.py`, `core.py`, `distance.py`, `normalization.py`, `drivers.py`, `teams.py`, `circuits.py`
- `ConfidenceLevel` enum: HIGH (≥0.9), MEDIUM (0.7-0.9), LOW (0.5-0.7), NO_MATCH (<0.5)
- `MatchSignal` dataclass tracks individual signal results with name, weight, score, matched flag, and details
- `MatchResult` includes `explain()` method for debugging signal contributions
- All matchers use Unicode NFD normalization for diacritics (ü→u, é→e, etc.)
- DriverMatcher includes nationality aliases (UK/GBR, USA/US) and date-bounded number matching
- TeamMatcher includes RGB color distance calculation and sponsor text stripping
- CircuitMatcher includes Haversine-based coordinate proximity and abbreviation expansion (COTA, Spa, etc.)
- Tests cover all edge cases from Ergast import: Hülkenberg/Hulkenberg, Pérez/Perez, Oracle Red Bull variations, COTA/Austin, etc.
- **Note:** `RoundMatcher` deferred to Phase 4 as it depends on integration with existing Round/Session models

**Phase 2: Name Normalization Pipeline** (Completed: Jan 9, 2026)
- [x] Centralize `_normalize_name()` into matching module
- [x] Add sponsor/branding strip functions for Round names
  - Strip "FORMULA 1", "FORMULA ONE", sponsor names (HEINEKEN, ARAMCO, LENOVO, etc.)
  - Normalize "Grand Prix" / "GP" / "Gran Premio"
- [x] Add team name normalization (strip "Racing", "F1 Team", "Scuderia", sponsor suffixes)
- [x] Add circuit name normalization (strip "Circuit", "Autódromo", "International", etc.)
- [x] Create canonical name extraction pipeline

**Implementation Summary (Phase 2):**
- `normalize_name()`: Unicode NFD decomposition + lowercase + strip whitespace
- `normalize_for_slug()`: Creates URL-safe slugs (hyphens, no special chars)
- `strip_sponsor_text()`: Removes sponsor names, "Formula 1/One", "Grand Prix" variations
- `normalize_grand_prix_name()`: "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025" → "Chinese Grand Prix"
- `normalize_team_name()`: "Oracle Red Bull Racing Honda" → "Red Bull"
- `normalize_circuit_name()`: "Autódromo Hermanos Rodríguez" → "Hermanos Rodriguez"
- `expand_circuit_abbreviation()`: "COTA" → "Circuit of the Americas", "Spa" → "Spa-Francorchamps"
- `extract_name_parts()`: Handles "Last, First" format, suffixes (Jr, Sr, III), hyphenated names

**Phase 3: Review Queue System** (Completed: Jan 9, 2026)
- [x] Create `PendingMatch` database table for uncertain matches
  - C# model with EntityType, Status, Resolution enums
  - EF Core migration `20260109010737_AddPendingMatchTable`
  - Python Pydantic model with CRUD repository methods
- [x] Create CLI tool to review and resolve pending matches: `python -m ingestion.review_matches`
  - `--list`: Show pending matches with filtering by entity type and status
  - `--approve <id>`: Approve a pending match (creates alias if needed)
  - `--reject <id>`: Reject a pending match
  - `--bulk-approve-above <threshold>`: Auto-approve matches above score threshold
  - `--export <path>`: Export pending matches to CSV for batch review
- [x] Auto-create aliases when approving matches

**Implementation Summary (Phase 3):**
- `PendingMatch` model: id, entity_type, incoming_name, incoming_data_json, candidate_entity_id, candidate_entity_name, match_score, signals_json, source, status, resolved_at, resolved_by, resolution, resolution_notes
- `PendingMatchEntityType` enum: DRIVER, TEAM, CIRCUIT, ROUND
- `PendingMatchStatus` enum: PENDING, APPROVED, REJECTED, MERGED
- `PendingMatchResolution` enum: MATCH_EXISTING, CREATE_NEW, SKIP
- Repository methods: `get_pending_matches()`, `insert_pending_match()`, `update_pending_match()`, `delete_pending_match()`
- CLI tool includes tabular output with Rich formatting
- Tests: 14 PendingMatch model tests

**Phase 4: Integration & Migration** (Completed: Jan 9, 2026)
- [x] Create `RoundMatcher` for deduplicating rounds across sources
  - Signals: exact_name (0.25), circuit (0.25), date (0.25), round_number_year (0.15), fuzzy (0.10)
  - Uses `normalize_grand_prix()` to strip sponsor names
  - Pre-filter by year for performance
- [x] Integrate new matchers into `EntityResolver`
  - Added `resolve_driver_with_scoring()` method using DriverMatcher
  - Added `resolve_team_with_scoring()` method using TeamMatcher
  - Added `resolve_circuit_with_scoring()` method using CircuitMatcher
  - ScoringResult dataclass with: matched, entity_id, entity_name, confidence, score, signals, needs_review, pending_match_id
  - Creates PendingMatch for LOW confidence matches (0.5-0.7)
- [x] Update `sync.py` with `use_scoring` flag in SyncOptions
- [x] Update `bulk_sync.py` with `--use-scoring` CLI flag
- [x] Update `services/ergast.py` to use `normalize_name` from matching module (removes duplicate code)

**Implementation Summary (Phase 4):**
- `RoundMatcher` in `matching/rounds.py`: Handles sponsor-cluttered names, date proximity, circuit matching
- EntityResolver scoring methods return ScoringResult (not the entity directly) with match metadata
- Default behavior unchanged: `use_scoring=False` uses existing sequential matching
- When `use_scoring=True`, low-confidence matches create PendingMatch for review
- Tests: 16 RoundMatcher tests, 15 EntityResolver scoring tests

**Validation Commands:**
```bash
# List pending matches
python -m ingestion.review_matches --list

# Bulk approve high-confidence matches
python -m ingestion.review_matches --bulk-approve-above 0.8

# Test scoring-based sync (dry run)
python -m ingestion.bulk_sync --start-year 2025 --end-year 2025 --use-scoring --dry-run
```

**Phase 5: Clean Existing Data** (Completed: Jan 9, 2026)
- [x] Run matching on existing Rounds to normalize names (remove sponsor clutter)
- [x] Fix driver name diacritics (Hulkenberg → Hülkenberg, Perez → Pérez)
- [ ] Identify and merge duplicate circuits with different names (none found)
- [ ] Identify and merge duplicate teams across eras (none found)
- [x] Validate all data passes quality checks

**Implementation Summary (Phase 5):**
- Created `ingestion/cleanup.py` module with validation and cleanup utilities
- Fixed 1 round name with sponsor text ("FORMULA 1 ETIHAD AIRWAYS ABU DHABI GRAND PRIX 2025" → "Abu Dhabi Grand Prix")
- Fixed 2 driver names with missing diacritics (Hulkenberg, Perez)
- Added more sponsor names to normalization.py (etihad airways, airways, etc.)
- CLI usage: `python -m ingestion.cleanup --validate-only` / `--dry-run` / (no flags to apply)

##### Known Problematic Entities (Reference for Testing)

**Drivers with diacritics:** (All fixed ✓)
- Nico Hülkenberg (ü) ✓
- Sergio Pérez (é) ✓
- Kimi Räikkönen (ä) - already correct
- Esteban Gutiérrez (é) - not in current data
- Jean-Éric Vergne (É) - already correct
- Carlos Sainz Sr/Jr (disambiguation needed)
- Max/Jos Verstappen (disambiguation needed)

**Teams with rebrand history:**
- Minardi → Toro Rosso → AlphaTauri → Racing Bulls
- Jordan → Midland → Spyker → Force India → Racing Point → Aston Martin
- Lotus (multiple: Team Lotus, Lotus Racing, Lotus F1 Team, Lotus-Renault)
- Sauber → Alfa Romeo → Stake → Audi (upcoming)

**Circuits with name/config changes:**
- Silverstone (multiple configurations)
- Spa-Francorchamps (multiple configurations)
- Monza (with/without chicanes)
- Paul Ricard (multiple configurations)
- Bahrain (GP layout vs Outer layout vs Endurance layout)

##### Success Criteria

1. New data source integration should require <1 hour of manual alias work
2. Matching accuracy >99% for drivers/teams, >95% for circuits/rounds
3. All uncertain matches flagged for review (no silent failures)
4. Audit trail for all entity matches/merges
5. OpenF1 Round names display as "Japanese Grand Prix" not "FORMULA 1 LENOVO JAPANESE GRAND PRIX 2025"

---

#### 0. Chores
There are 2 types of chores: "Agentic" and "Manual". "Manual" tasks are only to be done by humans, while "Agentic" chores can be completed by AI agents following the [AI Coding Guidelines](./AGENTS.md).

The Chores list lives next to the sprints so that they can be prioritized and completed alongside feature work, rather than being deferred indefinitely—a clean way of staying ahead of tech debt with agents.

##### Agentic (Priority Order)

**High Priority — Code Quality & Testing**
- [x] Frontend component tests for SpoilerMask/SpoilerBlur behavior (54 tests)
- [x] Add logo (/assets/logo.png) to the frontend public folder and add it to the frontend in the hero/header area.
- [x] Pre-fill 2026 data for F1 (Completed: Jan 7, 2026)
  - Parsed ICS calendar from RacingNews365, translated Dutch to English
  - Removed branding, created 24 rounds with 120 sessions
  - Added seed script: `python -m ingestion.seed_f1_2026`
- [x] Add 2026 Pre-Season Testing Data (Completed: Jan 7, 2026)
  - Added Round: "FORMULA 1 ARAMCO PRE-SEASON TESTING 2026" (Feb 11-13, 2026)
  - 3 testing sessions at Bahrain International Circuit, 08:00 UTC each day
  - Used SQL insert mirroring 2025 pre-season testing structure (Type=6/Race, RoundNumber=0)
- [x] Fix RoundNumbers not being Season specific (Completed: Jan 7, 2026)
  - Created EF Core migration `20260107164012_FixRoundNumbersAndMergeCircuits`
  - Recalculated RoundNumbers: 0 for pre-season testing, 1-N for races based on date order
  - Fixed `sync.py` to calculate round numbers correctly via `_calculate_round_numbers` method
  - Added 4 tests for round number calculation logic
- [x] Fix Circuits data not being unique/complete (Completed: Jan 7, 2026)
  - Merged 21 duplicate circuits into canonical entries (46→25 circuits)
  - Added short names as aliases (e.g., "Austin" → "Circuit of the Americas")
  - Preserved all historical round associations

**Medium Priority — User-Facing Polish**
- [x] About page content creation (mission, team, FAQs)
- [x] SEO optimization for public pages (meta tags, Open Graph, structured data)
- [x] Accessibility audit and fixes for UI components (WCAG 2.1 AA)
- [x] Ensure Series Logo's are always readable (Completed: Jan 9, 2026)
  - Added white background with rounded corners and padding to all logo images
  - Applied to PageHeader component (series/season detail pages)
  - Applied to SeriesListPage cards
  - Applied to RoundDetailPage team logos
  - Ensures logos with transparent backgrounds or dark text (e.g., MotoGP) remain readable on dark UI

**Data & Ingestion**
- [x] Add results-only sync mode for historical data (Completed: Jan 7, 2026)
  - Added `--results-only` flag to bulk_sync CLI that syncs results without modifying driver/team/session entities
  - Enhanced entrant lookup to use DriverAliases for historical driver numbers (e.g., Max Verstappen #1 → #3)
  - Added `sync_results_only_year()`, `get_completed_sessions_by_year()`, `get_entrants_by_round()` methods
  - Synced 1218 results for 2023 season, 311 results for 2024 (partial)
- [x] Add safety flags for historical sync (Completed: Jan 8, 2026)
  - Added `--create-only` flag: Only creates new entities, never updates existing ones
  - Added `--preserve-names` flag: Keeps canonical names, creates aliases for variations
  - Added `--preserve-numbers` flag: Keeps canonical driver numbers, creates aliases for historical numbers
  - SyncOptions dataclass with modes: "full", "create_only", "skip"
  - Enables safe syncing while preserving curated canonical data
- [x] Complete 2024-2025 results sync (run with `--pause 5` to avoid rate limits)

**Lower Priority — Future Prep**
- [x] Frontend e2e tests for critical flows (Playwright setup with homepage, auth, discovery, spoiler-shield tests)
- [x] Design system documentation (colors, typography, component patterns) → docs/DESIGN_SYSTEM.md

##### Manual (Priority Order)

**Pre-Launch Critical**
- [ ] Legal review of historical data usage and user-generated content policies

**Launch Prep**
- [ ] Finalize marketing materials (press kit, screenshots, feature list)
- [ ] Setup social media accounts (Twitter/X, Bluesky, Instagram) + initial posts

**Growth Phase**
- [ ] Find and onboard community members for data contributions (MotoGP, IndyCar, WEC) and feedback


#### 1. Complete Discovery Flow (Browse → Find → View)
- [x] Season browser + detail pages + API (Completed: Jan 7, 2026)
  - Per-series calendar/round list with filtering
  - Progress indicators (completed/upcoming/current)
  - Spoiler-safe aggregates only
  - SeasonsPage for browsing all seasons across series
  - SeasonDetailPage with real API integration
  - Navigation links added to header dropdown
- [x] Round (weekend) detail pages + API (Completed: Jan 8, 2026)
  - Sessions timeline with session cards, status badges, spoiler indicators
  - Circuit context with link to circuit guide
  - Round stats (sessions, entrants, excitement rating)
  - Adjacent round navigation (prev/next)
  - Loading skeletons, error states, empty states
  - GET /{seriesSlug}/{year}/{roundSlug} for round detail
  - GET /{seriesSlug}/{year} for rounds listing
  - 24 integration tests covering all scenarios
- [ ] Navigation flow between Series → Season → Round → Session
  - Check that all links/buttons work correctly
  - Ensure "Statistics" like for the Series detail page the "Teams" and "Drivers" sections link to the correct pre-filtered pages. E.g. For Formula 1 if you click on "Teams" it should take you to the Teams page filtered to only show teams that have participated in Formula 1.
  - Ensure breadcrumb navigation works correctly across all new pages.
  
#### 2. Core Logging Flow (The MVP Feature)
- [ ] "Log a Race" flow
  - Multi-step modal or dedicated page
  - Session selection
  - Basic info (date, watched vs attended)
  - Optional: car/team/driver focus, comments
  - Post-log redirect with results revealed
- [ ] Logs API (CRUD for race logs)
- [ ] Reviews API (create, read, like)

#### 3. User Experience Polish
- [ ] User profiles API + page (favorites [whatever entities they want basically, teams, drivers, circuits], stats, logs, reviews)
- [ ] User settings page (spoiler mode, preferences, themeing based on favorite series (store seperatly from the favorites on the profile page))
- [ ] Gravatar integration
- [ ] Basic feed/home page with recent activity
- [ ] Password reset flow (email + token) + Remember Me option
- [ ] Email verification flow
- [ ] Google OAuth integration (login/register)

#### 4. Supporting Discovery Pages
- [ ] Driver discovery + detail pages + API
  - Profile, teams over time, seasons participated
  - Spoiler-safe by default
- [ ] Team discovery + detail pages + API
  - Overview, seasons, drivers roster over time
- [ ] Circuit discovery + detail pages + API
  - Overview, location/map, sessions hosted
  - "Attended" venue aggregates when available
- [ ] Global search UI + API
  - Covers sessions, drivers, teams, circuits, users, logs
- [ ] Navigation flow between Entities (Driver, Team, Circuit) → Seasons → Rounds → Sessions
  - Check that all links/buttons work correctly and that all things that are a reference is a link to the correct page.
  - Ensure breadcrumb navigation works correctly across all new pages.

##### 5. Miscellaneous
- [ ] Develop "Standings" module in the backend to calculate championship points based on the official points system for each series taking historical changes into account.
- [ ] Retroactively calculate and store championship standings for past seasons using the new "Standings" module.
- [ ] Add "Points System" section to Series detail pages explaining how points are awarded for that series.
- [ ] Add "Current/Final Championship Standings" section to Series detail pages
- [ ] Add "Championship Standings" tab to Season detail pages


---

## 🗓️ Phase 1: Shakedown (MVP Release)

**Goal:** F1 2024-2025 fully functional, users can log races and see profiles

### Remaining Items
- [ ] Complete auth endpoints (password reset, email verification)
- [ ] OpenF1 scheduled sync job (automated weekly updates)
- [ ] Seed complete 2024-2025 F1 calendar data

### Infrastructure for Launch
- [ ] Production deployment setup
- [ ] Error tracking (Sentry or similar)
- [ ] Basic analytics

### [DEFERRED] Items moved to later phases
- [ ] ~~Admin/Mod tools~~ → Moved to Phase 2 (not MVP critical)
- [ ] ~~WEC data integration~~ → Moved to Phase 3 (complex multi-driver/multi-class requires significant effort)

---

## 🗓️ Phase 2: Midfield (Growth & Engagement)

**Goal:** Historical archive, social features, lists, search

### Historical Data
- [x] Historical F1 data import (1950-2017 from Ergast archive) → **MOVED TO CURRENT SPRINT** (database now available)
  - See [ERGAST_MIGRATION.md](./docs/ERGAST_MIGRATION.md) for full strategy
- [ ] Extend historical data to 2018-2022 (OpenF1 or alternative sources)
- [ ] Historical season browser UI

### Social & Discovery
- [ ] Lists API (create, share, collaborate)
- [ ] Lists feature UI (create, edit, share)
- [ ] Social feed algorithm
- [ ] Activity notifications + notification center
- [ ] Enhanced user profiles (stats, badges, year in review)

### Search & Performance
- [ ] Search API (Elasticsearch integration)
- [ ] Advanced search UI with filters

### Moderation (Moved from Phase 1)
- [ ] Admin/Mod tools (moderation + data quality triage)
  - **Goal:** Provide a lightweight internal tool for staff/moderators to manage users, review reported content, and triage missing/low-quality data without direct DB access.
  - **Scope (MVP):**
    - **User management**
      - View user profile summary (id, email/username, created date, membership tier)
      - Actions: suspend/unsuspend, revoke refresh tokens, force sign-out
      - Audit log for all admin actions (who/when/what)
    - **Moderation queue (logs/reviews)**
      - Central queue fed by user reports
      - Review reported item, reporter reason, history
      - Actions: dismiss, remove/hide content, warn user, suspend user
      - Notes on resolution (required) + audit log entry
    - **Data quality triage queue**
      - Create a queue of “data issues” (missing fields, suspected duplicates, bad names/aliases)
      - Each issue has: entity type/id, field(s), severity (Required/NiceToHave), source, description, status, assignee
      - Actions: mark resolved / needs community / won’t fix
  - **Acceptance Criteria:**
    - All actions are permission-gated to Admin/Moderator roles
    - Every action writes an immutable audit log row
    - Queue views support filtering (status, type, severity) and basic pagination
    - No spoilers exposed by default in moderation views unless the moderator explicitly reveals them

- [ ] Community reporting + transparency tooling
  - **Reporting (User-facing):**
    - Report a log/review for: spoiler violation, harassment, spam, other (free-text)
    - Report a data issue for an entity (driver/team/circuit/round/session): incorrect name, missing fields, duplicate entity, wrong dates/locations
  - **Transparency (Public-facing):**
    - Show “data completeness” indicators for entities (e.g., missing wikipediaUrl/altitude, missing results, missing entrants)
    - Provide a “Suggest an edit” entry point that creates a structured data issue (not a free-form comment)
  - **Acceptance Criteria:**
    - Reporting endpoints validate input and rate-limit per user/IP
    - Report creation immediately appears in the admin moderation/data triage queues
    - Public completeness indicators are spoiler-safe (never reveal winners/results)
- [ ] Distinguished mod/admin roles with elevated permissions and badges

### Mobile & Responsive
- [ ] Mobile-responsive improvements across all pages

---

## 🗓️ Phase 3: The Third Turn - Historic Multi-Series Expansion

**Goal:** Leverage The Third Turn's comprehensive motorsport database to rapidly expand beyond F1 with minimal manual data entry

**Data Source:** [The Third Turn](https://www.thethirdturn.com/wiki/) — CC BY-NC-SA 4.0 licensed historic motorsport database covering most major racing series from 1900s-present

**Why This Works:**
- Structured, scrapable HTML with consistent patterns across series
- Already includes MotoGP, IndyCar, WEC, NASCAR, Formula E, and dozens more series
- Includes historical data, driver rosters, team lineups, race results
- JavaScript extraction examples already documented in [THETHIRDTURN.md](./docs/THETHIRDTURN.md)
- Can be implemented in Python following existing ingestion patterns

### Phase 3A: The Third Turn Scraper Foundation

**Goal:** Build a Python scraper that can extract motorsport data from The Third Turn website following the patterns documented in [THETHIRDTURN.md](./docs/THETHIRDTURN.md)

**Reference Documentation:** All extraction patterns, JavaScript examples, and data mappings are in `docs/THETHIRDTURN.md`

#### Tasks

**1. Build the scraper foundation**
- [ ] Set up The Third Turn scraper module in `src/python/ingestion/sources/thethirdturn/`
  - Follow the patterns from OpenF1 and Ergast integrations
  - See THETHIRDTURN.md for URL structure and extraction examples
  - Implement respectful crawling (rate limiting, caching, proper User-Agent)
  - Add CC BY-NC-SA 4.0 attribution to all scraped content vua the various "Source" fields (add missing ones) and add any required attribution in the UI as per licensing terms.

**2. Scrape the series database index**
- [ ] Extract all available series from the database index page
  - JavaScript extraction example is in THETHIRDTURN.md under "Series Database Index"
  - Store series metadata and prepare for season extraction
  - Filter out "Local Racing Division" entries as documented

**3. Scrape individual series pages**
- [ ] Extract series metadata and season listings
  - Alternative names with date ranges (SeriesAlias pattern in THETHIRDTURN.md)
  - Season links and years (see JavaScript example in doc)
  - Map to existing Series/Season models

**4. Scrape season race listings**
- [ ] Extract race calendars from season pages
  - Round numbers, names, circuits, dates (extraction pattern in THETHIRDTURN.md)
  - Use existing CircuitMatcher for circuit name variations
  - Create PendingMatch entries for uncertain matches
  - Map to Round model

**5. Add race detail scraping (optional for Phase 3A)**
- [ ] Extract full results from individual race pages if time permits
  - Defer to Phase 3B if needed to maintain velocity

**What Good Looks Like:**
- Scraper respects The Third Turn's bandwidth (rate limiting, caching)
- Entity matching leverages existing DriverMatcher/TeamMatcher/CircuitMatcher
- Uncertain matches go to review queue (no silent failures)
- CLI commands for each extraction level (series-index, series-detail, season)
- Can extract a complete series (all seasons + races) in under 10 minutes

### Phase 3B: Multi-Series Data Import

**Goal:** Use The Third Turn scraper to bring in major non-F1 series, focusing on recent seasons first for MVP coverage

**Priority Order:**

**1. MotoGP**
- [ ] Import MotoGP series, seasons (1949-present), and recent race calendars (2020-2025)
- [ ] Import 2024-2025 results to enable logging
- [ ] Historical backfill (1949-2019) can wait until post-launch
- [ ] Estimated effort: 2-3 days

**2. IndyCar**
- [ ] Import IndyCar series, modern-era seasons (1996-present), and recent calendars
- [ ] Handle CART/IRL split era (1996-2007) appropriately
- [ ] Import 2024-2025 results to enable logging
- [ ] Estimated effort: 2-3 days

**3. WEC (World Endurance Championship)**
- [ ] Import WEC series, seasons (2012-present), and recent calendars
- [ ] Handle multi-class races (Hypercar, LMP2, LMGTE)
- [ ] Handle multi-driver entries (3 drivers per car)
- [ ] Import 2024-2025 results to enable logging
- [ ] Estimated effort: 3-4 days (complexity from multi-class/multi-driver)

**4. Formula E**
- [ ] Import Formula E series, seasons (2014-present), and recent calendars
- [ ] Import 2024-2025 results to enable logging
- [ ] Estimated effort: 1-2 days

**5. Future series (post-launch)**
- [ ] NASCAR Cup Series (~70 seasons, massive dataset)
- [ ] Formula 2, Formula 3
- [ ] IMSA WeatherTech SportsCar Championship
- [ ] Super Formula, DTM, BTCC

**Import Strategy:**
1. Series + Seasons first (fast, establishes structure)
2. Recent calendars (2020-2025, shows what's available)
3. Recent results (2024-2025, enables user logging)
4. Historical backfill (post-launch, nice-to-have)

### Phase 3C: Multi-Series UI Polish

**Goal:** Make the UI work seamlessly for all series, not just F1

**Tasks:**

**1. Fix series-specific UI elements**
- [ ] Series switcher in navigation (currently hardcoded to F1)
- [ ] Series logos and brand colors for MotoGP, IndyCar, WEC, Formula E
- [ ] Session type badges for different formats (MotoGP Sprint, WEC multi-hour races, Formula E qualifying duels)

**2. Handle series-specific race formats**
- [ ] Multi-class results display for WEC (Hypercar, LMP2, LMGTE in separate tables/tabs)
- [ ] Multi-driver entrants for WEC/IMSA (show all drivers for a car)
- [ ] Oval/road course/street circuit distinction for IndyCar/NASCAR

**3. Verify core features work across all series**
- [ ] Spoiler shield behaves identically for all series
- [ ] Entity matching works for non-F1 drivers/teams
- [ ] Navigation flows work across all series
- [ ] No hardcoded F1 assumptions break other series

---

## 🗓️ Phase 4: Podium (Premium, Gamification, Mobile)

**Goal:** Venue guides, gamification, monetization, mobile app

### Venue & Circuit Guides
- [ ] Circuit/Venue guides API
- [ ] Circuit guide pages (crowdsourced seat views, travel tips)
- [ ] Seat map overlays with user ratings

### Gamification
- [ ] Gamification system (achievements, streaks, XP/Superlicence levels)
- [ ] Achievement system UI
- [ ] Stats dashboards

### Premium Tier (PaddockPass)
- [ ] PaddockPass premium features definition
- [ ] Payment integration (Stripe)
- [ ] PaddockPass upgrade flow
- [ ] Advanced stats dashboards (premium-only)

### Mobile App
- [ ] React Native app scaffold
- [ ] Core features parity with web
- [ ] Push notifications

---

## 🗓️ Phase : Smart Calendar Sync

**Goal:** Become the single sync point for motorsport calendars—never hunt for ICS files again

### Philosophy
Traditional motorsport calendars are static files you download once per year. We want dynamic, personalized calendars that:
1. **Auto-update** when schedules change (session times, cancellations, new events)
2. **Personalize** based on user preferences (series, teams, drivers they follow)
3. **Link back** to ParcFerme session pages as an entry point to the platform
4. **Just work** with modern calendar apps (Google, Apple, Outlook, etc.)

### Core Features
- [ ] iCalendar (.ics) subscription feeds (not static downloads)
  - `/api/v1/calendar/{userId}/subscribe.ics` - personalized feed
  - `/api/v1/calendar/series/{seriesSlug}.ics` - per-series public feed
  - Event descriptions with deep links to session pages
  - Location data for attended-mode reminders
- [ ] Smart profile inference
  - Auto-detect preferred series from logging history
  - Infer timezone from most-viewed sessions
  - Suggest calendar based on followed drivers/teams
- [ ] Calendar customization settings
  - Include/exclude session types (skip FP1/FP2 for casual fans)
  - Lead time reminders (30min, 1hr, 1 day before)
  - Spoiler-safe event titles option ("F1 Race" vs "Monaco Grand Prix")
- [ ] Automatic schedule sync
  - Background job to update ICS feeds when source data changes
  - Push notifications for last-minute schedule changes (PaddockPass feature)

### Technical Implementation
- [ ] ICS generation service (iCalendar RFC 5545 compliant)
- [ ] User calendar preferences model and API
- [ ] Feed caching with cache invalidation on schedule changes
- [ ] VTIMEZONE support for local session times
- [ ] Recurring event handling for multi-day weekends

### Future Enhancements
- [ ] "Add to Calendar" one-click buttons on session pages
- [ ] Calendar widget for mobile app home screen
- [ ] Outlook/Exchange direct sync (enterprise users)
- [ ] Shared team calendars for watch parties

---

## 🎯 Backlog (Unprioritized / Future Consideration)

### Additional Features
- [ ] OAuth providers (Discord, Apple) — [PARTIAL: Google planned for MVP]
- [ ] Import from other platforms (CSV, potential BoxBoxd migration)
- [ ] Export user data (GDPR compliance)
- [ ] Public API for third-party apps
- [ ] Browser extension for spoiler blocking
- [ ] Watch party coordination
- [ ] Prediction games
- [ ] Fantasy league integration

### Technical Improvements
- [ ] GraphQL API option — [LOW PRIORITY: REST approach is sufficient]
- [ ] WebSocket for live updates — [FUTURE: For live session tracking]
- [ ] CDN for images (user-uploaded seat photos)
- [ ] Database read replicas — [SCALE: When traffic demands]
- [ ] Rate limiting — [SECURITY: Before public launch]
- [ ] Performance monitoring
- [ ] A/B testing framework

### Content & Community
- [ ] Editorial content system (curated lists, "Essential Races")
- [ ] Verified accounts for drivers/teams/journalists
- [ ] Official series partnerships

### [COMPLETED] — Previously in backlog
- [x] ~~API versioning strategy~~ — URL path versioning implemented
- [x] ~~Automated testing suite~~ — Unit + Integration tests in place

### [OBSOLETE] — Superseded by completed work or restructured tasks
- [ ] ~~Auth pages (Login, Register, Forgot Password)~~ — [COMPLETED in Current Sprint]
- [ ] ~~Navigation header with user menu~~ — [COMPLETED in Current Sprint]
- [ ] ~~Session browser (by season, by round)~~ — [RESTRUCTURED: Now part of Discovery Flow]
- [ ] ~~Session detail page (with spoiler shield)~~ — [RESTRUCTURED: Now part of Discovery Flow]
- [ ] ~~Log race modal/page~~ — [RESTRUCTURED: Now "Log a Race" flow in Up Next]
- [ ] ~~User profile page~~ — [RESTRUCTURED: Now in Up Next section]
- [ ] ~~Home feed (recent logs from followed users)~~ — [RESTRUCTURED: Now "Basic feed/home page" in Up Next]
- [ ] ~~Admin/Mod dashboard~~ — [DEFERRED: Frontend follows backend, moved to Phase 2]
- [ ] ~~Community moderation tools~~ — [DUPLICATE: Covered by Admin/Mod tools in Phase 2]

---

## 📝 Notes

### Key Decisions Made
1. **Spoiler Shield is non-negotiable** — All UIs hide results by default
2. **Watched vs Attended** — Separate rating systems for broadcast and venue experience
3. **Free tier is generous** — Historical data never gated (unlike BoxBoxd competitor)
4. **Excitement ≠ Quality** — Separate ratings for "how exciting" vs "how good"
5. **Multi-color brand support** — Series can have multiple brand colors for visual identity
6. **Entity normalization** — Alias tracking for consistent driver/team/circuit identity across data sources

### Open Questions
- How to handle live session updates without spoilers?
- Should lists be collaborative by default?
- PaddockPass pricing strategy? (Letterboxd model: ~$4/mo Pro, ~$10/mo Patron)
- Community contribution model details for non-F1 series data?

### External Dependencies
- **OpenF1 API** — Unofficial, may change; fallback to SportMonks (~€55/mo) if needed
- **Ergast archive** — Deprecated but archived; loaded into `ergastf1` database (1950-2017)
- **The Third Turn** — Used for many series historical data points, we should look into contributing back to the project with our community data once we have data thats not already present there
- **RacingNews365** — Used for F1 calendar ICS parsing
- **Community contributors** — Required for MotoGP/IndyCar/WEC data
- **Legal review** — Historical data usage rights

### Risk Mitigation
- **OpenF1 dependency**: Can migrate to SportMonks commercial API if needed
- **Data gaps**: Community Wiki model for missing race data
- **Scale**: Redis caching + query optimization before considering read replicas

---

## 🔗 Quick Links

- [Product Blueprint](./docs/BLUEPRINT.md)
- [AI Coding Guidelines](./AGENTS.md)
- [API Documentation](http://localhost:5000/swagger) (local dev)
- [Bulk Sync Guide](./docs/BULK_SYNC.md)
- [Ergast Migration Strategy](./docs/ERGAST_MIGRATION.md)
