# Parc Fermé - Completed Work Archive

> This file contains all completed development tasks, organized chronologically with implementation details. For active development work, see [ROADMAP.md](./ROADMAP.md).

---

## 📅 January 2026

### 🏁 Current Sprint: Core Discovery & Logging

#### Infrastructure & Foundation
- [x] **Project scaffolding** (monorepo structure)
- [x] **.NET 10 API setup** with EF Core, Identity, PostgreSQL
- [x] **React 18 + Vite + TypeScript + Tailwind** frontend
- [x] **Docker Compose** for local services (PostgreSQL, Redis, Elasticsearch)
- [x] **CI/CD pipeline** (GitHub Actions)
- [x] **Unit and Integration tests** (backend + frontend)

#### Authentication & Authorization
- [x] **Authentication infrastructure** (JWT + refresh tokens)
- [x] **Authorization with membership tiers** (Free / PaddockPass)
- [x] **Frontend auth state management** (Redux Toolkit)
- [x] **Protected routes and membership gates**
- [x] **Auth UI pages** (Login, Register, Profile)

#### Data Layer
- [x] **Domain models** (Series, Season, Round, Session, Circuit, Driver, Team, etc.)
- [x] **Social models** (Log, Review, Experience, UserList, UserFollow)
- [x] **Caching infrastructure** (Redis service, response caching)
- [x] **Python ingestion project structure**
- [x] **OpenF1 data sync implementation** (Python ingestion pipeline)
- [x] **Entity normalization and alias tracking** (Teams, Drivers, Circuits, Series)
  - DriverAlias, TeamAlias, SeriesAlias, CircuitAlias database tables
  - EntityResolver service with multi-strategy matching
  - known_aliases.json config with canonical names and historical aliases
  - Repository updates for ID-first upsert logic
  - Comprehensive tests (33 entity resolver tests, 81 total Python tests)
- [x] **Multi-color brand support** for Series (database, API, frontend)

#### Spoiler Shield (Core Feature)
- [x] **Backend**: SpoilerShieldService, SessionDtos, SessionsController
- [x] **Frontend**: spoilerSlice, useSpoilerShield hook, SpoilerMask/SpoilerBlur components

#### Navigation & Discovery Foundation
- [x] **Navigation header + IA refactor** for multi-series + discovery
- [x] **Global search box** (spoiler-safe, respects spoiler_mode)
- [x] **Breadcrumbs** for deep pages
- [x] **Series hub pages + API endpoints**
  - SeriesController with full CRUD
  - SeriesDtos with summary and detail types
  - Frontend SeriesListPage and SeriesDetailPage
  - 19 integration tests for SeriesController

#### Bug Fixes
- [x] **Fix Antonelli driver duplicate** (added DriverNumber field, merged duplicates)

#### Chores
- [x] **Privacy policy and terms of service** pages + links in footer
- [x] **Integration tests for SessionsController** (31 tests covering spoiler logic)
- [x] **Fix cyclic include bug** in SpoilerShieldService
- [x] **Fix session ordering bug** in GetSessionsWithSpoilerShieldAsync
- [x] **Enhance Swagger documentation** (API info, JWT auth scheme, XML docs)
- [x] **Update README** with architecture overview and development workflow
- [x] **Unit tests for SpoilerShieldService** edge cases (16 tests)

---

### Session Detail Pages (Completed: Jan 7, 2026)
- [x] **SessionDetailPage** with real API integration via `spoilerApi.getSession()`
- [x] **Spoiler-protected results display** using SpoilerMask/SpoilerRevealButton components
- [x] **Session info card, stats grid, results table** with driver/team/time columns
- [x] **Other sessions navigation** for switching between sessions in a round
- [x] **Updated breadcrumbs** builder to use session ID pattern (`/session/{id}`)
- [x] **Added driverNumber** to DriverSummaryDto in backend and frontend
- [x] **Loading skeletons and error states** with retry functionality
- [x] **Full integration** with spoiler reveal flow (temp reveal + permanent via log)

---

### Season Browser + Detail Pages (Completed: Jan 7, 2026)
- [x] **Per-series calendar/round list** with filtering
- [x] **Progress indicators** (completed/upcoming/current)
- [x] **Spoiler-safe aggregates only**
- [x] **SeasonsPage** for browsing all seasons across series
- [x] **SeasonDetailPage** with real API integration
- [x] **Navigation links** added to header dropdown

---

### Round (Weekend) Detail Pages (Completed: Jan 8, 2026)
- [x] **Sessions timeline** with session cards, status badges, spoiler indicators
- [x] **Circuit context** with link to circuit guide
- [x] **Round stats** (sessions, entrants, excitement rating)
- [x] **Adjacent round navigation** (prev/next)
- [x] **Loading skeletons, error states, empty states**
- [x] **GET /{seriesSlug}/{year}/{roundSlug}** for round detail
- [x] **GET /{seriesSlug}/{year}** for rounds listing
- [x] **24 integration tests** covering all scenarios

---

### Navigation Flow Verification (Completed: Jan 9, 2026)
- [x] **All series hierarchy links verified** working (Series → Season → Round → Session)
- [x] **Statistics cards on Series detail page** now link to filtered entity pages
  - Drivers card links to `/drivers?series={slug}` showing only drivers from that series
  - Teams card links to `/teams?series={slug}` showing only teams from that series
  - Circuits card links to `/circuits?series={slug}` showing only circuits from that series
- [x] **DriversPage, TeamsPage, CircuitsPage** updated to support `?series=` query parameter filtering
- [x] **Filter badge UI** with clear button to remove series filter
- [x] **Breadcrumbs update dynamically** when filtering by series (include series in trail)
- [x] **Added ROUTES helpers**: DRIVERS_FILTERED, TEAMS_FILTERED, CIRCUITS_FILTERED

---

### Discovery Pages Enhancement (Completed: Jan 9, 2026)
- [x] **Unified FilterBar component** with search, sort, and filter controls
- [x] **Server-side search** across all discovery pages (drivers, teams, circuits)
- [x] **Enhanced filters**: nationality for drivers/teams, region for circuits, active status for drivers
- [x] **Active filter badges** with clear buttons
- [x] **SVG placeholder refinement** for entities without images

---

## 🗃️ Ergast Historical F1 Data Import (1950-2017)

> **Documentation:** [docs/ERGAST_MIGRATION.md](./docs/ERGAST_MIGRATION.md)

**Data Volume Imported:**
- 68 seasons (1950-2017)
- 976 race weekends
- 22,925 race results (97.0% of Ergast)
- 7,064 qualifying results (95.5% of Ergast)
- 864 drivers (including modern)
- 204 teams
- 109 circuits

### Phase 1: Schema Migration (Completed: Jan 8, 2026)
- [x] **Added new columns to domain models:**
  - Circuit: `Altitude`, `WikipediaUrl`
  - Driver: `DateOfBirth`, `WikipediaUrl`
  - Team: `Nationality`, `WikipediaUrl`
  - Round: `ErgastRaceId`, `WikipediaUrl`
  - Result: `TimeMilliseconds`, `FastestLapNumber`, `FastestLapRank`, `FastestLapTime`, `FastestLapSpeed`, `StatusDetail`, `Q1Time`, `Q2Time`, `Q3Time`
- [x] **EF Core migration**: `20260108004257_AddErgastHistoricalFields`
- [x] **Updated DTOs and API responses** where applicable

### Phase 2: Reference Data Import (Completed: Jan 8, 2026)
- [x] **Refactored OpenF1 ingestion** to be more generic/reusable
  - Created `sources/` package with BaseDataSource protocol and SourceXxx dataclasses
  - Created `OpenF1DataSource` adapter wrapping existing client
  - Created `ErgastDataSource` reading directly from ergastf1 PostgreSQL database
  - CLI script: `python -m ingestion.ergast_import --year-range 1950 2017`
- [x] **Import/merge 73 Ergast circuits** into ParcFerme (with 22 aliases)
- [x] **Import/merge 840 drivers** (with 21 aliases for name variations)
- [x] **Import/merge 208 teams/constructors** (with 11 aliases for rebrands)
- [x] **Create F1 seasons 1950-2019** (70 historical + 7 modern = 77 total)

### Phase 3: Event Data Import (Completed: Jan 8, 2026)
- [x] **Import 976 Rounds** from Ergast races table
- [x] **Create 1,315 Sessions** (Race for all years, Qualifying for 1994+)
- [x] **Create 23,568 Entrants** (driver-team-round links)

### Phase 4: Results Import (Completed: Jan 8, 2026)
- [x] **Import 22,001 race results** with status mapping
  - Maps 134 Ergast status codes to ResultStatus enum
  - Status detail field preserves original status text
  - Fastest lap data: lap number, rank, time, speed
- [x] **Import 6,043 qualifying results** with Q1/Q2/Q3 times

### Bug Fixes During Results Import
- [x] **Fixed corrupted driver aliases** causing wrong names in UI
- [x] **Fixed qualifying session ordering** (was appearing after race)
- [x] **Fixed wrong entrants in historical races** (modern drivers appearing in 1950s-2000s)
  - Root cause: Ergast lifetime permanent numbers matching to wrong drivers
  - Fixed 2,341 wrongly-matched entrants

### Phase 5: Validation & Cleanup (Completed: Jan 9, 2026)
- [x] **Created `ingestion/validate_ergast.py`** comprehensive validation script
- [x] **Spot-checked famous races** (all verified ✅):
  - 1950 British GP (first F1 race): 23/23 results
  - 1976 Japanese GP (Hunt vs Lauda): 26/26 results
  - 1994 San Marino GP (Senna): 28/28 results
  - 2008 Brazilian GP (Hamilton champion): 20/20 results
  - 2010 Abu Dhabi GP (4-way title fight): 24/24 results
  - 2016 Abu Dhabi GP (Rosberg champion): 22/22 results
- [x] **Fixed Unicode name matching bug** (Hülkenberg, Pérez, Räikkönen)
- [x] **Added 4 missing drivers** not imported in Phase 2

---

## 🔧 Entity Matching Framework

> Robust, score-based matching system for multi-source data ingestion

### Phase 1: Core Matching Engine (Completed: Jan 9, 2026)
- [x] **Created `matching/` module** with core.py, distance.py, normalization.py
- [x] **DriverMatcher**: last_name(0.3), first_name(0.2), number(0.15), abbreviation(0.15), nationality(0.1), fuzzy(0.1)
- [x] **TeamMatcher**: exact_name(0.4), containment(0.2), fuzzy(0.2), color(0.1), year(0.1)
- [x] **CircuitMatcher**: exact_name(0.3), location(0.25), country(0.15), fuzzy(0.15), coordinates(0.15)
- [x] **String distance utilities**: Levenshtein, Jaro-Winkler, Damerau-Levenshtein
- [x] **156 unit tests** for each matcher with edge cases

### Phase 2: Name Normalization Pipeline (Completed: Jan 9, 2026)
- [x] **`normalize_name()`**: Unicode NFD decomposition + lowercase + strip whitespace
- [x] **`strip_sponsor_text()`**: Removes sponsor names, "Formula 1/One", "Grand Prix" variations
- [x] **`normalize_grand_prix_name()`**: "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025" → "Chinese Grand Prix"
- [x] **`normalize_team_name()`**: "Oracle Red Bull Racing Honda" → "Red Bull"
- [x] **`normalize_circuit_name()`**: "Autódromo Hermanos Rodríguez" → "Hermanos Rodriguez"
- [x] **`expand_circuit_abbreviation()`**: "COTA" → "Circuit of the Americas"

### Phase 3: Review Queue System (Completed: Jan 9, 2026)
- [x] **PendingMatch database table** for uncertain matches
- [x] **EF Core migration**: `20260109010737_AddPendingMatchTable`
- [x] **CLI tool**: `python -m ingestion.review_matches`
  - `--list`, `--approve`, `--reject`, `--bulk-approve-above`, `--export`
- [x] **14 PendingMatch model tests**

### Phase 4: Integration & Migration (Completed: Jan 9, 2026)
- [x] **RoundMatcher**: exact_name(0.25), circuit(0.25), date(0.25), round_number_year(0.15), fuzzy(0.10)
- [x] **EntityResolver scoring methods**: `resolve_driver_with_scoring()`, `resolve_team_with_scoring()`, `resolve_circuit_with_scoring()`
- [x] **SyncOptions**: `use_scoring` flag for new matching behavior
- [x] **16 RoundMatcher tests + 15 EntityResolver scoring tests**

### Phase 5: Clean Existing Data (Completed: Jan 9, 2026)
- [x] **Fixed 1 round name** with sponsor text
- [x] **Fixed 2 driver names** with missing diacritics (Hulkenberg → Hülkenberg, Perez → Pérez)
- [x] **Created `ingestion/cleanup.py`** module with validation utilities

---

## ✅ Completed Chores

### High Priority — Code Quality & Testing
- [x] **Frontend component tests** for SpoilerMask/SpoilerBlur behavior (54 tests)
- [x] **Add logo** (/assets/logo.png) to frontend public folder and hero/header area
- [x] **Pre-fill 2026 data for F1** (Completed: Jan 7, 2026)
  - Parsed ICS calendar from RacingNews365, translated Dutch to English
  - Removed branding, created 24 rounds with 120 sessions
  - Added seed script: `python -m ingestion.seed_f1_2026`
- [x] **Add 2026 Pre-Season Testing Data** (Completed: Jan 7, 2026)
  - Added Round: "FORMULA 1 ARAMCO PRE-SEASON TESTING 2026" (Feb 11-13, 2026)
  - 3 testing sessions at Bahrain International Circuit
- [x] **Fix RoundNumbers not being Season specific** (Completed: Jan 7, 2026)
  - Created EF Core migration `20260107164012_FixRoundNumbersAndMergeCircuits`
  - Fixed `sync.py` to calculate round numbers correctly
  - Added 4 tests for round number calculation logic
- [x] **Fix Circuits data not being unique/complete** (Completed: Jan 7, 2026)
  - Merged 21 duplicate circuits into canonical entries (46→25 circuits)
  - Added short names as aliases

### Medium Priority — User-Facing Polish
- [x] **About page content creation** (mission, team, FAQs)
- [x] **SEO optimization** for public pages (meta tags, Open Graph, structured data)
- [x] **Accessibility audit and fixes** for UI components (WCAG 2.1 AA)
- [x] **Ensure Series Logos are always readable** (Completed: Jan 9, 2026)
  - Added white background with rounded corners and padding to logo images

### Data & Ingestion
- [x] **Add results-only sync mode** for historical data (Completed: Jan 7, 2026)
  - Added `--results-only` flag to bulk_sync CLI
  - Synced 1218 results for 2023 season, 311 results for 2024
- [x] **Add safety flags for historical sync** (Completed: Jan 8, 2026)
  - Added `--create-only`, `--preserve-names`, `--preserve-numbers` flags
  - SyncOptions dataclass with modes: "full", "create_only", "skip"
- [x] **Complete 2024-2025 results sync**

### Lower Priority — Future Prep
- [x] **Frontend e2e tests** for critical flows (Playwright setup)
- [x] **Design system documentation** → docs/DESIGN_SYSTEM.md

### Manual
- [x] **Setup social media accounts** (Twitter/X, Bluesky, Instagram) + initial posts

---

## 🗄️ Backlog Items Completed

- [x] **API versioning strategy** — URL path versioning implemented
- [x] **Automated testing suite** — Unit + Integration tests in place
- [x] **Historical F1 data import (1950-2017)** — Moved from Phase 2 to Current Sprint

---

## 📝 Key Technical Decisions

1. **Spoiler Shield is non-negotiable** — All UIs hide results by default
2. **Watched vs Attended** — Separate rating systems for broadcast and venue experience
3. **Free tier is generous** — Historical data never gated
4. **Excitement ≠ Quality** — Separate ratings for "how exciting" vs "how good"
5. **Multi-color brand support** — Series can have multiple brand colors
6. **Entity normalization** — Alias tracking for consistent identity across data sources
7. **Open data philosophy** — All motorsport data is CC BY-SA 4.0
8. **Paddock Pass = identity + convenience** — Never gatekeeps data
9. **Weekend-level logging** — Support both quick race-only and full weekend logging

---

## 🔗 Related Documentation

- [Product Blueprint](./docs/BLUEPRINT.md)
- [AI Coding Guidelines](./AGENTS.md)
- [Ergast Migration Strategy](./docs/ERGAST_MIGRATION.md)
- [Bulk Sync Guide](./docs/BULK_SYNC.md)
- [Design System](./docs/DESIGN_SYSTEM.md)
