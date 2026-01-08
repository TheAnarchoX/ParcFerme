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

##### Phase 5: Validation & Cleanup
- [ ] Verify row counts and data integrity
- [ ] Spot-check famous races (1950 British GP, 1976 Japan, 1994 San Marino, 2008 Brazil)
- [ ] Verify championship points calculations possible
- [ ] Remove temporary correlation IDs if not needed

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
- [ ] Ensure Series Logo's are always readable (take the transparent motogp logo as an example, mainly black with red text. Not readable at all) by adding a white background or border around them where necessary.

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
- [ ] Complete 2024-2025 results sync (run with `--pause 5` to avoid rate limits)

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
- [ ] Admin/Mod tools (user management, content moderation queue, missing datapoint reports and work queue)
- [ ] Community reporting tools (flag logs/reviews, report data issues)
- [ ] Distinguished mod/admin roles with elevated permissions and badges

### Mobile & Responsive
- [ ] Mobile-responsive improvements across all pages

---

## 🗓️ Phase 3: Podium (Multi-Series & Premium)

**Goal:** Expand beyond F1, venue guides, gamification, monetization

### Multi-Series Expansion
- [ ] MotoGP data integration (community contribution model)
- [ ] IndyCar data integration (community JSON sources)
- [ ] WEC data integration (complex: multi-class, multi-driver per car, time-based races)
  - Custom scraper for https://fiawec.alkamelsystems.com/
- [ ] Multi-series navigation UI updates

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

## 🗓️ Phase 4: Smart Calendar Sync

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
