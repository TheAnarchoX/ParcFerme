# Parc Fermé - Development Roadmap

> Last updated: January 9, 2026
>
> **📋 Completed work:** See [COMPLETED.md](./COMPLETED.md) for historical archive of all finished tasks.

---

## 🏁 Current Sprint: Core Discovery & Logging

### 🚧 In Progress

_No active tasks_

### 📋 Up Next (Priority Order)

#### 1. Supporting Discovery Pages (Full Entity Discovery)

**Current State:** DriversPage, TeamsPage, CircuitsPage and their detail pages exist with mock data. Routes configured. Need to wire up real API endpoints and replace mock data.

##### 1.1 Driver Discovery + Detail Pages + API
- [ ] **Backend: DriversController + DTOs**
  - Create `DriverDtos.cs` with: `DriverSummaryDto`, `DriverDetailDto`, `DriverCareerDto`
  - Create `DriversController.cs` with endpoints:
    - `GET /api/v1/drivers` - paginated list with optional `?series=slug` filter
    - `GET /api/v1/drivers/{slug}` - full profile with career history
    - `GET /api/v1/drivers/{slug}/seasons` - seasons participated in
  - Include nationality, driver number, headshot URL in responses
- [ ] **Frontend: Wire up real API**
  - Create `driversService.ts` with API client methods
  - Create `types/driver.ts` with TypeScript interfaces matching DTOs
  - Update `DriversPage.tsx` to fetch from API (replace mock data)
  - Update `DriverDetailPage.tsx` to fetch from API
  - Add loading skeletons and error states

##### 1.2 Team Discovery + Detail Pages + API
- [ ] **Backend: TeamsController + DTOs**
  - Create `TeamDtos.cs` with: `TeamSummaryDto`, `TeamDetailDto`, `TeamHistoryDto`
  - Create `TeamsController.cs` with endpoints:
    - `GET /api/v1/teams` - paginated list with optional `?series=slug` filter
    - `GET /api/v1/teams/{slug}` - full profile with driver roster
    - `GET /api/v1/teams/{slug}/seasons` - seasons competed in
- [ ] **Frontend: Wire up real API**
  - Create `teamsService.ts` with API client methods
  - Create `types/team.ts` with TypeScript interfaces
  - Update pages to fetch from API

##### 1.3 Circuit Discovery + Detail Pages + API
- [ ] **Backend: CircuitsController + DTOs**
  - Create `CircuitDtos.cs` with: `CircuitSummaryDto`, `CircuitDetailDto`, `CircuitVenueDto`
  - Create `CircuitsController.cs` with endpoints:
    - `GET /api/v1/circuits` - paginated list with optional `?series=slug` filter
    - `GET /api/v1/circuits/{slug}` - full profile with venue info
    - `GET /api/v1/circuits/{slug}/rounds` - races hosted at this circuit
- [ ] **Frontend: Wire up real API**
  - Create `circuitsService.ts` with API client methods
  - Create `types/circuit.ts` with TypeScript interfaces
  - Update pages to fetch from API

##### 1.4 Navigation Flow Verification
- [ ] **Cross-link entities throughout the app**
  - Driver detail → link to teams they've driven for
  - Team detail → link to drivers on roster
  - Circuit detail → link to rounds held there
  - Round detail → link to circuit, drivers, teams competing
- [ ] **Breadcrumb verification** across all new pages

##### 1.5 Global Search (Deferred)
- [ ] **Deferred:** Global search UI + API (requires Elasticsearch setup)

---

#### 2. Core Logging Flow (The MVP Feature)

- [ ] **"Log a Race" flow**
  - Multi-step modal or dedicated page
  - Session selection
  - Basic info (date, watched vs attended)
  - Optional: car/team/driver focus, comments
  - Post-log redirect with results revealed

- [ ] **"Weekend Wrapper" logging mode**
  - Quick Log (Race Only) as default for casual fans
  - Full Weekend Log with checkboxes for FP1/FP2/FP3/Quali/Sprint/Race
  - Individual session ratings + weekend aggregate rating (weighted)
  - "Weekend Completeness" badge for full-weekend watchers

- [ ] **APIs:** Logs CRUD, Reviews CRUD

---

#### 3. User Experience Polish

- [ ] User profiles API + page (favorites, stats, logs, reviews)
- [ ] User settings page (spoiler mode, preferences, theming)
- [ ] Gravatar integration
- [ ] Basic feed/home page with recent activity
- [ ] Password reset flow (email + token) + Remember Me option
- [ ] Email verification flow
- [ ] Google OAuth integration

---

#### 4. Standings Module

- [ ] Develop "Standings" module to calculate championship points
- [ ] Retroactively calculate standings for past seasons
- [ ] Add "Points System" section to Series detail pages
- [ ] Add "Championship Standings" to Season detail pages

---

#### 5. Chores

##### Agentic (Priority Order)
- [ ] Add UIOrder to Series for consistent ordering in dropdowns/lists

##### Manual (Priority Order)
- [ ] Legal review of historical data usage and user-generated content policies
- [ ] Finalize marketing materials (press kit, screenshots, feature list)
- [ ] Find community members for data contributions (MotoGP, IndyCar, WEC)

---

## 🗓️ Phase 1: Shakedown (MVP Release)

**Goal:** F1 2024-2025 fully functional, users can log races and see profiles

### Remaining Items
- [ ] Complete auth endpoints (password reset, email verification)
- [ ] OpenF1 scheduled sync job (automated weekly updates)
- [ ] Seed complete 2024-2025 F1 calendar data
- [ ] Finalize CC BY-SA 4.0 licensing and attribution requirements
- [ ] Create "Data & Licensing" page with full legal text
- [ ] Add footer attribution snippet to all pages

### Infrastructure for Launch
- [ ] Production deployment setup
- [ ] Error tracking (Sentry or similar)
- [ ] Basic analytics

### Deferred to Later Phases
- ~~Admin/Mod tools~~ → Phase 2
- ~~WEC data integration~~ → Phase 3

---

## 🗓️ Phase 2: Midfield (Growth & Engagement)

**Goal:** Historical archive, social features, lists, search

### Historical Data
- [ ] Extend historical data to 2018-2022 (OpenF1 or alternative sources)
- [ ] Historical season browser UI

### Social & Discovery
- [ ] Lists API + UI (create, share, collaborate)
- [ ] **"Sagas" (Chronological Playlists)**
  - Special list type with `saga_mode` flag enforcing chronological ordering
  - Timeline/subway-map UI view
  - Chapter markers with annotations
  - Examples: "Hamilton vs Verstappen 2021", "Ford vs Ferrari Le Mans Era"
- [ ] Social feed algorithm
- [ ] Activity notifications + notification center
- [ ] Enhanced user profiles (stats, badges, year in review)

### Search & Performance
- [ ] Search API (Elasticsearch integration)
- [ ] Advanced search UI with filters

### Moderation
- [ ] Admin/Mod tools (moderation + data quality triage)
- [ ] Community reporting + transparency tooling
- [ ] Distinguished mod/admin roles with badges
- [ ] Contributor attribution system for community-submitted data

### Mobile & Responsive
- [ ] Mobile-responsive improvements across all pages

---

## 🗓️ Phase 3: The Third Turn - Historic Multi-Series Expansion

**Goal:** Use The Third Turn database to bring MotoGP, IndyCar, WEC, Formula E, NASCAR into Parc Fermé

**See:** [docs/THETHIRDTURN.md](./docs/THETHIRDTURN.md) for technical details

### Phase 3A: Build The Third Turn Scraper
- [ ] Build scraper in `src/python/ingestion/sources/thethirdturn/`
- [ ] Scrape series index, series, season, race, driver and circuit
- [ ] Use existing entity matchers, respect CC BY-NC-SA 4.0 license

### Phase 3B: Import Major Series
- [ ] MotoGP (2020-2025 calendars + results)
- [ ] IndyCar (1996-present)
- [ ] WEC (multi-class + multi-driver complexity)
- [ ] Formula E
- [ ] NASCAR
- [ ] Future: F2/F3, IMSA, Super Formula, DTM, BTCC, and more

### Phase 3C: Multi-Series UI
- [ ] Fix F1-specific assumptions in navigation and results display
- [ ] Handle WEC multi-class, multi-driver formats
- [ ] Verify spoiler shield + entity matching work across all series

### Phase 3D: Data Exports & Third-Party Access
- [ ] Public API for third-party apps
- [ ] API documentation site (Swagger/OpenAPI)
- [ ] Bulk data download system (torrent, PostgreSQL dumps)
- [ ] Document API rate limits and usage guidelines

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

### Premium Tier (Paddock Pass)

**Philosophy:** "Show your colors, manage your schedule, see your stats." Paddock Pass enhances identity and convenience, never gatekeeps data.

#### 🎨 "Livery" Customization (Identity)
- [ ] Team accent colors system
- [ ] Dark/Light mode overrides
- [ ] Custom app icons
- [ ] Profile flair and badges

#### 📊 "Telemetry" Personal Stats (Insight)
- [ ] Lap counter, track heatmap, constructor breakdown
- [ ] Driver bias analysis
- [ ] Year in Review (shareable card)
- [ ] GitHub-style activity heatmap

#### 🏆 "Pit Wall" Features (Lists & Logs)
- [ ] List forking, custom list headers
- [ ] Pinned reviews, advanced filtering

#### 🔧 "Scrutineering" Rights (Community Influence)
- [ ] Priority data queue for supporters
- [ ] Contributor recognition badges

#### 📅 Calendar Sync
- [ ] iCal subscription feeds
- [ ] Push notifications for schedule changes
- [ ] See Phase 5 for full implementation

#### Payment & Subscription
- [ ] Payment integration (Stripe)
- [ ] Paddock Pass upgrade flow ($2.99/mo or $24.99/yr)
- [ ] Subscription management
- [ ] Funding transparency page

### Mobile App
- [ ] React Native app scaffold
- [ ] Core features parity with web
- [ ] Push notifications

---

## 🗓️ Phase 5: Smart Calendar Sync

**Goal:** Become the single sync point for motorsport calendars—never hunt for ICS files again

### Philosophy
Dynamic, personalized calendars that:
1. Auto-update when schedules change
2. Personalize based on user preferences
3. Link back to ParcFerme session pages
4. Work with modern calendar apps

### Free Tier (Per-Series Public Feeds)
- [ ] `/api/v1/calendar/series/{seriesSlug}.ics` - public per-series feeds
- [ ] Event descriptions with deep links
- [ ] Automatic schedule sync

### Paddock Pass (Personalized Feeds)
- [ ] `/api/v1/calendar/{userId}/subscribe.ics` - personalized feed
- [ ] Smart profile inference from logging history
- [ ] Calendar customization settings
- [ ] Push notifications for schedule changes

### Technical Implementation
- [ ] ICS generation service (RFC 5545 compliant)
- [ ] User calendar preferences model
- [ ] Feed caching with invalidation
- [ ] VTIMEZONE support for local session times

---

## 🎯 Backlog (Unprioritized)

### Additional Features
- [ ] OAuth providers (Discord, Apple)
- [ ] Import from other platforms (CSV)
- [ ] Export user data (GDPR compliance)
- [ ] Bulk data download page
- [ ] Browser extension for spoiler blocking
- [ ] Watch party coordination
- [ ] Prediction games
- [ ] Fantasy league integration

### Technical Improvements
- [ ] GraphQL API option
- [ ] WebSocket for live updates
- [ ] CDN for images
- [ ] Database read replicas
- [ ] Rate limiting
- [ ] Performance monitoring
- [ ] A/B testing framework

### Content & Community
- [ ] Editorial content system (curated lists, "Essential Races")
- [ ] Verified accounts for drivers/teams/journalists
- [ ] Official series partnerships

---

## 📝 Notes

### Open Questions
- How to handle live session updates without spoilers?
- Should lists be collaborative by default?
- Community contribution model details for non-F1 series data?
- Should Sagas have a special "Rivalry" tag system?
- Calendar sync: Free tier gets per-series public feeds, Paddock Pass gets personalized feeds?

### External Dependencies
- **OpenF1 API** — Unofficial, may change; fallback to SportMonks (~€55/mo)
- **Ergast archive** — Deprecated but archived; loaded into `ergastf1` database (1950-2017)
- **The Third Turn** — Multi-series historical data
- **RacingNews365** — Used for F1 calendar ICS parsing
- **Community contributors** — Required for MotoGP/IndyCar/WEC data
- **Legal review** — Historical data usage rights

### Risk Mitigation
- **OpenF1 dependency**: Can migrate to SportMonks commercial API
- **Data gaps**: Community Wiki model for missing race data
- **Scale**: Redis caching + query optimization before read replicas

---

## 🔗 Quick Links

- [Completed Work Archive](./COMPLETED.md)
- [Product Blueprint](./docs/BLUEPRINT.md)
- [AI Coding Guidelines](./AGENTS.md)
- [API Documentation](http://localhost:5000/swagger) (local dev)
- [Bulk Sync Guide](./docs/BULK_SYNC.md)
- [Ergast Migration Strategy](./docs/ERGAST_MIGRATION.md)
- [The Third Turn Integration](./docs/THETHIRDTURN.md)
