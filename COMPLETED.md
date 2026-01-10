# Parc Fermé - Completed Work Archive

> This file contains all completed development tasks, organized chronologically with implementation details. For active development work, see [ROADMAP.md](./ROADMAP.md).

---

## 📅 January 2026

### Add UIOrder to Series (Completed: Jan 10, 2026)

Added UIOrder column to the Series entity for consistent ordering in dropdowns and lists.

#### Backend Implementation
- [x] **Series entity model** - Added nullable `UIOrder` int property with XML doc
- [x] **EF Core migration** - Created `20260110112536_AddUIOrderToSeries`
  - Adds `UIOrder` column to `Series` table
  - Sets default values via SQL: F1=1, MotoGP=2, IndyCar=3, WEC=4, Formula E=5, NASCAR=6
  - Feeder series: F2=10, F3=11, Moto2=12, Moto3=13
  - Unknown series default to 99

- [x] **SeriesDtos.cs** - Added `UIOrder` to both DTOs
  - `SeriesSummaryDto` now includes `int? UIOrder`
  - `SeriesDetailDto` now includes `int? UIOrder`

- [x] **SeriesController.cs** - Updated ordering logic
  - `GetAllSeries` now orders by `.OrderBy(s => s.UIOrder ?? int.MaxValue).ThenBy(s => s.Name)`
  - Both DTO creation sites include `UIOrder` in response

#### Frontend Implementation
- [x] **TypeScript types** - Added `uiOrder?: number` to `SeriesSummaryDto` and `SeriesDetailDto`
- [x] Frontend automatically respects server-side ordering (no client-side re-sorting)

#### Files Changed
- `src/api/Models/EventModels.cs` - Added UIOrder property
- `src/api/Dtos/SeriesDtos.cs` - Added UIOrder to DTOs
- `src/api/Controllers/SeriesController.cs` - Updated ordering and DTO creation
- `src/api/Migrations/20260110112536_AddUIOrderToSeries.cs` - New migration
- `src/web/src/types/series.ts` - Added uiOrder to TypeScript interfaces

---

### Edit Logs and Reviews (Completed: Jan 10, 2026)

Implemented the ability to edit existing logs and reviews.

#### Frontend Implementation
- [x] **LogModal edit mode** - Updated to support editing existing logs
  - Added `existingLog` prop handling with `updateLog` API call
  - Handles review updates: create new, update existing, or delete cleared reviews
  - Pre-fills all form fields from existing log data
  - Different submit behavior for create vs update mode

- [x] **SessionDetailPage enhancements**
  - Added "Edit Log" button in header when user has existing log
  - Fetches user's log data via `logsApi.getLogBySession()`
  - Passes `existingLog` to LogModal when in edit mode
  - Refreshes log data after successful edit

- [x] **ReviewCard edit support**
  - Added `currentUserId` and `onEdit` props
  - Shows "Edit" button on user's own reviews
  - Triggers log edit modal when clicked (reviews are part of logs)

- [x] **Files changed**:
  - `src/web/src/components/logging/LogModal.tsx` - Added update logic
  - `src/web/src/components/ReviewCard.tsx` - Added edit button for own reviews
  - `src/web/src/pages/discovery/SessionDetailPage.tsx` - Added edit button and user log fetching

---

### Community Reviews on Session Pages (Completed: Jan 10, 2026)

Implemented the Community Reviews section on SessionDetailPage, displaying user reviews with spoiler protection.

#### Frontend Implementation
- [x] **ReviewCard component** - Reusable review display with spoiler protection
  - User avatar with initials fallback when no avatar URL
  - Read-only star rating display (0.5-5.0)
  - Excitement rating badge (color-coded by value)
  - "Attended" badge for live venue logs
  - "Spoilers" warning badge for spoiler-marked reviews
  - Review body with spoiler blur/reveal (click to reveal)
  - "Read more" expansion for long reviews (300+ chars)
  - Engagement stats (like count, comment count)
  - Loading skeleton component for loading state

- [x] **ReviewsSection component** - Handles fetching and pagination
  - Fetches reviews on mount using `reviewsApi.getSessionReviews()`
  - Pagination with 10 reviews per page
  - Loading state with skeleton cards
  - Error state with retry button
  - Empty state prompting users to write reviews

- [x] **Spoiler Shield integration**
  - Reviews with `containsSpoilers=true` are blurred by default
  - Click-to-reveal per individual review
  - Auto-reveal if user has logged the session
  - Auto-reveal if user's spoilerMode is 'None'

- [x] **Files created/changed**:
  - `src/web/src/components/ReviewCard.tsx` - New ReviewCard component
  - `src/web/src/pages/discovery/SessionDetailPage.tsx` - Added ReviewsSection

---

### Weekend Wrapper UI (Completed: Jan 10, 2026)

Full weekend logging feature allowing users to log entire race weekends with one workflow.

#### Frontend Implementation
- [x] **WeekendWrapperModal component** - Multi-step wizard for logging full weekends
  - Session selection with checkboxes (sorted by type: FP1→Race)
  - Individual star rating + excitement slider per session
  - Live aggregate rating calculation across selected sessions
  - "Full Weekend!" badge when all sessions selected
  - Venue experience ratings (view, access, facilities) for attended events
  - Progress indicator showing current step
  
- [x] **RoundDetailPage integration**
  - "Log Full Weekend" button to launch modal
  - "Full Weekend Logged!" badge display when all sessions are logged
  - Uses existing `logWeekend` API endpoint

- [x] **Files changed**:
  - `src/web/src/components/WeekendWrapperModal.tsx` - Main modal component
  - `src/web/src/pages/RoundDetailPage.tsx` - Integration point

---

### Core Logging Flow (Completed: Jan 10, 2026)

The MVP logging feature allowing users to log races they've watched or attended.

#### Backend Implementation
- [x] **LogDtos.cs** - Complete DTO set for logging flow
  - `LogSummaryDto`, `LogDetailDto` for log display
  - `LogRoundDto` with full series/circuit info for log context
  - `CreateLogRequest`, `UpdateLogRequest` for CRUD operations
  - `CreateReviewRequest`, `UpdateReviewRequest` for reviews
  - `CreateExperienceRequest` for venue experience data
  - `LogWeekendRequest`, `LogWeekendResponse` for weekend wrapper
  - `UserLogsResponse`, `UserLogStatsDto` for user log history
  - Validation methods for star ratings (0.5-5.0), excitement (0-10), venue (1-5)

- [x] **LogsController.cs** - Full logging API
  - `POST /api/v1/logs` - Create log with optional review/experience
  - `GET /api/v1/logs/{id}` - Get log details
  - `GET /api/v1/logs/session/{sessionId}` - Get current user's log for a session
  - `PUT /api/v1/logs/{id}` - Update log
  - `DELETE /api/v1/logs/{id}` - Delete log
  - `GET /api/v1/logs/me` - Get current user's logs with pagination
  - `POST /api/v1/logs/weekend` - Log multiple sessions at once

- [x] **ReviewsController.cs** - Review management API
  - `POST /api/v1/reviews/log/{logId}` - Create review for a log
  - `GET /api/v1/reviews/{id}` - Get review details
  - `PUT /api/v1/reviews/{id}` - Update review
  - `DELETE /api/v1/reviews/{id}` - Delete review
  - `POST /api/v1/reviews/{id}/like` - Like a review
  - `DELETE /api/v1/reviews/{id}/like` - Unlike a review
  - `GET /api/v1/reviews/session/{sessionId}` - Get all reviews for a session

#### Frontend Implementation
- [x] **log.ts types** - TypeScript interfaces matching backend DTOs
  - All DTO types with proper nullability
  - Utility functions: `formatStarRating`, `formatExcitementRating`, `getExcitementColor`, `getExcitementLabel`, `formatDateWatched`, `isWithinSpoilerWindow`

- [x] **logsService.ts** - API client for logs and reviews
  - `logsApi`: createLog, getLog, getLogBySession, updateLog, deleteLog, getMyLogs, getUserLogs, getMyLogStats, logWeekend, getSessionLogs
  - `reviewsApi`: createReview, getReview, updateReview, deleteReview, likeReview, unlikeReview, getSessionReviews

- [x] **LogModal.tsx** - Multi-step logging wizard
  - Step 1: Type selection (Watched vs Attended)
  - Step 2: Ratings (star rating, excitement slider, like toggle, date picker)
  - Step 3: Optional review (with spoiler toggle, auto-enabled for <7 days)
  - Step 4: Venue experience (only for attended - venue, view, access, facilities, atmosphere ratings)
  - Sub-components: `StarRating`, `ExcitementSlider`, `VenueRating`
  - Progress indicator, form validation, error handling

- [x] **SessionDetailPage.tsx integration**
  - "Log this Session" button opens LogModal
  - Redirects to login if not authenticated
  - On success: marks session as logged in Redux, refreshes session data

#### Also Fixed
- Pre-existing TypeScript issues in SpoilerModeToggle, store middleware, test-utils

---

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

### Driver Role Differentiation (Completed: Jan 10, 2026)

Implemented comprehensive driver role classification system to distinguish between regular drivers, reserve/substitute drivers, and FP1-only/test drivers on team pages.

**Backend (C#/.NET):**
- [x] Added `DriverRole` enum (Regular=0, Reserve=1, Fp1Only=2, Test=3) to EventModels.cs
- [x] Added `Role` property to `Entrant` model with migration
- [x] Created `TeamDriverDto` record with role and roundsParticipated fields
- [x] Updated `TeamsController` with sorting (regular drivers first by driver number)

**Frontend (React/TypeScript):**
- [x] Added `DriverRole` type and `TeamDriverDto` interface to team.ts
- [x] Implemented `getDriverRoleLabel()` and `getDriverRoleBadgeClasses()` utilities
- [x] Updated `TeamDetailPage` with role badges (amber=reserve, sky=FP1, purple=test)
- [x] Shows "(X rounds)" indicator for single-appearance non-regular drivers

**Python Ingestion:**
- [x] Added `DriverRole` IntEnum to Python models matching C# values
- [x] Created `role_detection.py` module with `RoleDetector` class
- [x] Created `detect_roles.py` CLI tool for running detection per season/year
- [x] Added `detect_driver_roles` option to SyncOptions
- [x] Detection algorithm considers:
  - Session participation patterns (FP1 vs Quali/Race)
  - Consecutive round blocks (start/end of season vs mid-season)
  - Team roster context (unique race drivers, typical team size)
  - Pre-season testing exclusion

**Key Classifications (2024-2025 F1):**
- Oliver Bearman @ Ferrari Saudi GP: RESERVE (filled in for sick Sainz)
- Oliver Bearman @ Haas Azerbaijan/São Paulo: RESERVE (filled in for banned Magnussen)
- Andrea Kimi Antonelli @ Mercedes: FP1_ONLY (rookie Friday practice sessions)
- Isack Hadjar @ Red Bull Racing: FP1_ONLY (2024) / RESERVE (2025 Bahrain)
- Robert Shwartzman, Felipe Drugovich, etc.: FP1_ONLY (test driver FP1 appearances)

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

### The Third Turn - Data Model Preparation (Completed: Jan 9, 2026)

**Goal:** Prepare data model and ingestion pipelines to support The Third Turn historical multi-series data.

#### Documentation
- [x] **THETHIRDTURN.md** - Complete technical guide for The Third Turn integration
  - Data gap analysis comparing Ergast DDL with TTT fields
  - JavaScript extraction examples for all 6 page types (Series Index, Season, Race, Driver, Circuit)
  - License compliance notes (CC BY-NC-SA 4.0)

#### Data Model Updates
- [x] **Added 8 new fields** to EventModels.cs:
  - Series: `GoverningBody` (e.g., "NASCAR", "FIA", "IndyCar")
  - Circuit: `TrackType` (road/oval/street), `TrackStatus` (open/closed), `OpenedYear`
  - Driver: `Nickname`, `PlaceOfBirth`
  - Result: `LapsLed`, `CarNumber` (string for #6T, #00, etc.)
- [x] **EF Core migration**: `20260109215421_AddTheThirdTurnFields`

#### Python Ingestion Pipeline Updates
- [x] **Result model** (models.py): Added `laps_led`, `car_number` fields
- [x] **SourceResult** (sources/base.py): Added `laps_led`, `car_number` fields
- [x] **Ergast source** (sources/ergast.py): Populates `car_number` from `r.number`
- [x] **OpenF1 source** (sources/openf1.py): Populates `car_number` from `driver_number`
- [x] **ErgastSyncService**: `_process_results()` passes through new fields
- [x] **sync.py**: Both OpenF1 Result creations include `car_number`

#### C# API Updates (DTOs & Controllers)
- [x] **ResultDto**: Added `LapsLed`, `CarNumber`
- [x] **CircuitDiscoveryDetailDto**: Added `TrackType`, `TrackStatus`, `OpenedYear`
- [x] **DriverDetailDto**: Added `Nickname`, `PlaceOfBirth`
- [x] **SeriesDetailDto**: Added `GoverningBody`
- [x] **SpoilerShieldService**: Updated `MapToResultDto()` with new fields
- [x] **CircuitsController**: Updated `GetCircuitById()` with new fields
- [x] **DriversController**: Updated `GetDriver()` with new fields
- [x] **SeriesController**: Updated `GetSeriesBySlug()` with new fields

**Note:** `laps_led` will only be populated from The Third Turn data (not available in OpenF1/Ergast).

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

### Supporting Discovery Pages - Full Implementation (Completed: Jan 9, 2026)

#### DriversPage + DriverDetailPage + API
- [x] **Backend: DriversController + DTOs**
  - Created `DriverDtos.cs` with DriverSummaryDto, DriverDetailDto, DriverCareerDto
  - Created `DriversController.cs` with endpoints:
    - `GET /api/v1/drivers` - paginated list with series/nationality/status filters, search, sort
    - `GET /api/v1/drivers/{slug}` - full profile with career history
  - Includes nationality, driver number, headshot URL, date of birth, Wikipedia link
- [x] **Frontend: Real API integration**
  - Created `driversService.ts` with API client methods
  - Created `types/driver.ts` with TypeScript interfaces
  - Updated `DriversPage.tsx` with FilterBar, server-side filtering/search/sort
  - Updated `DriverDetailPage.tsx` with real API data
  - Loading skeletons, error states, retry functionality

#### TeamsPage + TeamDetailPage + API
- [x] **Backend: TeamsController + DTOs**
  - Created `TeamDtos.cs` with TeamSummaryDto, TeamDetailDto, TeamHistoryDto
  - Created `TeamsController.cs` with endpoints:
    - `GET /api/v1/teams` - paginated list with series/nationality filters, search, sort
    - `GET /api/v1/teams/{slug}` - full profile with driver roster, season history
  - Includes nationality, primary color, logo URL, Wikipedia link
- [x] **Frontend: Real API integration**
  - Created `teamsService.ts` with API client methods
  - Created `types/team.ts` with TypeScript interfaces
  - Updated `TeamsPage.tsx` with FilterBar, server-side filtering/search/sort
  - Updated `TeamDetailPage.tsx` with real API data, season history, current drivers
  - SVG placeholders with team colors, loading skeletons, error states

#### CircuitsPage + CircuitDetailPage + API
- [x] **Backend: CircuitsController + DTOs**
  - Created `CircuitDtos.cs` with CircuitSummaryDto, CircuitDetailDto
  - Created `CircuitsController.cs` with endpoints:
    - `GET /api/v1/circuits` - paginated list with series/region filters, search, sort
    - `GET /api/v1/circuits/{slug}` - full profile with venue info, rounds hosted
  - Includes location, country, coordinates, length, altitude, Wikipedia link
- [x] **Frontend: Real API integration**
  - Created `circuitsService.ts` with API client methods
  - Created `types/circuit.ts` with TypeScript interfaces
  - Updated `CircuitsPage.tsx` with FilterBar, server-side filtering/search/sort
  - Updated `CircuitDetailPage.tsx` with real API data, rounds history
  - Circuit map placeholders, loading skeletons, error states

#### Navigation Flow & Cross-linking
- [x] **Entity cross-linking throughout the app**
  - Driver detail → links to teams they've driven for
  - Team detail → links to drivers on roster (current + historical)
  - Circuit detail → links to rounds held there
  - Round detail → links to circuit, drivers, teams competing
- [x] **Breadcrumb verification** - all discovery pages have correct breadcrumbs
- [x] **Filter state in URL** - all filters sync to URL params for shareable links

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
