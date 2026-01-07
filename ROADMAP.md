# Parc Fermé - Development Roadmap

> Last updated: January 7, 2026

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

### 🚧 In Progress
_(None currently)_

### 📋 Up Next (Priority Order)

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
- [ ] Round (weekend) detail pages + API
  - Sessions timeline
  - Circuit context
  - Spoiler-safe status/metadata
  - Primary "choose what to log" screen
- [ ] Session detail pages + API (spoiler shield end-to-end)
  - Results properly masked until logged
  - Full integration with spoiler shield
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
- [ ] Historical F1 data import (1950-2023 from Ergast archive)
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
- [ ] Admin/Mod tools (user management, content moderation queue)
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

## 🎯 Backlog (Unprioritized / Future Consideration)

### Additional Features
- [ ] OAuth providers (Discord, Apple) — [PARTIAL: Google planned for MVP]
- [ ] Import from other platforms (CSV, potential BoxBoxd migration)
- [ ] Export user data (GDPR compliance)
- [ ] Public API for third-party apps
- [ ] Browser extension for spoiler blocking
- [ ] Calendar sync (Google Calendar, Apple Calendar)
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
- **Ergast archive** — Deprecated but archived; needed for 1950-2023 historical import
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
