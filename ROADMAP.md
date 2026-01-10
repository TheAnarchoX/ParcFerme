# Parc Fermé - Development Roadmap

> Last updated: January 10, 2026
>
> **📋 Completed work:** See [COMPLETED.md](./COMPLETED.md) for historical archive of all finished tasks.

---

## 🤖 AI Agent Workflow

This project uses **custom VS Code agents** (`.github/agents/`) to accelerate development. Each agent is specialized for specific tasks and can hand off to other agents.

### Available Agents

| Agent | Use For | Handoffs To |
|-------|---------|-------------|
| **Staff Engineer** | Complex cross-cutting features, architecture, performance, escalations | All agents |
| **Planner** | Breaking down features, creating specs, analyzing requirements | Backend, Frontend, Data, Staff, QA, Security, Spoiler |
| **Backend** | .NET API, EF Core, authentication, caching, DTOs | Frontend, QA, Security, Reviewer, Staff, Spoiler |
| **Frontend** | React components, Redux, Tailwind, TypeScript | Backend, QA, Reviewer, Staff, Spoiler, Planner |
| **Data Engineer** | Python ingestion, OpenF1 sync, bulk imports | Backend, QA, Security, Staff, Planner |
| **QA** | Unit tests, integration tests, E2E tests, coverage | Backend, Frontend, Data, Reviewer, Security, Staff |
| **Reviewer** | Code review, pattern compliance, quality checks | Backend, Frontend, Security, QA, Staff |
| **Security** | Security audits, auth review, vulnerability assessment | Staff, Backend, Frontend, Reviewer, QA |
| **Spoiler Shield** | Implementing/reviewing the critical spoiler protection feature | Backend, Frontend, QA, Security, Reviewer |

### Recommended Workflow

1. **Planning Phase**: Use `@planner` to break down complex features
2. **Complex/Cross-cutting**: Use `@staff-engineer` for work spanning multiple domains
3. **Implementation**: Hand off to `@backend`, `@frontend`, or `@data-engineer`
4. **Testing**: Use `@qa` to write tests for new code
5. **Review**: Use `@reviewer` for code quality, `@security` for security audit
6. **Spoiler Features**: Always involve `@spoiler-shield` for result-related features
7. **Escalation**: Any agent can hand off to `@staff-engineer` for complex issues

### Agent Tags in Tasks

Tasks below are tagged with recommended agents:
- `[🔧 backend]` - Use Backend Engineer agent
- `[🎨 frontend]` - Use Frontend Engineer agent
- `[🐍 data]` - Use Data Engineer agent
- `[📋 plan]` - Use Planner agent first
- `[🏗️ staff]` - Use Staff Engineer for complex/cross-cutting work
- `[🧪 qa]` - Use QA Engineer agent
- `[🔒 security]` - Use Security Reviewer agent
- `[🏁 spoiler]` - Use Spoiler Shield specialist

---

## 🏁 Current Sprint: Core Discovery & Logging

### 🚧 In Progress

*No items currently in progress - pick up the next priority item below.*

### 📋 Up Next (Priority Order)

#### 1. Core Logging Flow - Remaining Work

- [ ] **Delete Log/Review functionality** `[🎨 frontend]` `[🔧 backend]`
  - Add delete confirmation modal
  - Wire up DELETE endpoints (already exist in backend)
  - Add delete option to log edit or session detail page
  > **Prompt**: `Implement Delete functionality for user logs and reviews. The backend DELETE endpoints already exist. Create a delete confirmation modal component that warns users about permanent data loss. Add a delete button accessible from the session detail page when viewing your own log. Handle the API call and refresh data after successful deletion. Ensure proper authorization checks.`

- [ ] **Integration tests for Logs/Reviews controllers** `[🧪 qa]`
  > **Prompt**: `Write comprehensive integration tests for LogsController and ReviewsController. Test all CRUD operations, authorization (users can only edit/delete their own logs), spoiler mode behavior when fetching logs with results, and the weekend logging endpoint. Use the existing test patterns in tests/api/Integration/. Ensure tests cover edge cases like logging a session twice, editing non-existent logs, and unauthorized access attempts.`

---

#### 2. User Experience Polish

- [ ] **User profiles API + page** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement the user profiles feature. Backend: Create ProfilesController with endpoints for GET /api/v1/users/{username} returning public profile data (display name, join date, log count, review count, favorite series/drivers). Include recent activity (last 10 logs). Frontend: Create a /users/{username} page with profile header, stats cards, and activity feed. Reference existing page patterns. Respect privacy - only show public data.`

- [ ] **User settings page** `[🎨 frontend]` `[🏁 spoiler]`
  > **Prompt**: `Create a user settings page at /settings. Include sections for: 1) Spoiler Mode toggle (Strict/Moderate/None) with clear explanations of each level, 2) Theme preferences (dark/light - prepare for Paddock Pass customization), 3) Notification preferences, 4) Account info (email, password change link). Use the Spoiler Shield patterns from AGENTS.md. Save settings via existing user update endpoint.`

- [ ] **Gravatar integration** `[🎨 frontend]`
  > **Prompt**: `Add Gravatar support for user avatars. Create a utility function that generates Gravatar URLs from user email (MD5 hash). Add fallback to initials-based placeholder. Update all avatar displays (nav bar, profile page, review cards, activity feed). Use the ?d=identicon parameter for users without Gravatar. Add to UserAvatar component or create one if needed.`

- [ ] **Basic feed/home page** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement the home page activity feed. Backend: Create GET /api/v1/feed endpoint that returns recent public activity (new logs, reviews) from all users, paginated. Frontend: Create the / home page with a feed of activity cards showing "User X logged Session Y" and "User X reviewed Session Y". Include Spoiler Shield - mask results in feed items unless viewer has logged that session. Add filtering by series.`

- [ ] **Password reset flow** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Implement secure password reset flow. Create: 1) POST /api/v1/auth/forgot-password - accepts email, generates secure token, stores hash in DB with expiry (1 hour). 2) POST /api/v1/auth/reset-password - accepts token + new password, validates token, updates password. Use ASP.NET Identity's built-in token generation. Add rate limiting to prevent abuse. Log password reset attempts for security audit. Do NOT send actual emails yet - just log the reset URL.`

- [ ] **Email verification flow** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Implement email verification for new accounts. On registration, generate verification token and store with user. Create GET /api/v1/auth/verify-email?token=X endpoint to verify. Add EmailVerified boolean to ApplicationUser if not present. Prevent unverified users from certain actions (logging, reviewing). Add resend verification endpoint. Log verification for audit. Do NOT send actual emails - log the verification URL.`

- [ ] **Google OAuth integration** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Add Google OAuth login. Configure ASP.NET Identity external login with Google provider. Create POST /api/v1/auth/google endpoint that accepts Google ID token, validates it, creates or links user account, returns JWT. Handle edge cases: existing email with password-only account (offer to link), first-time OAuth user (create account). Store Google ID for future logins. Follow OAuth security best practices.`

---

#### 3. Standings Module

- [ ] **Develop "Standings" module** `[📋 plan]` `[🔧 backend]`
  > **Prompt**: `Design and implement the championship standings module. Create: 1) PointsSystem entity storing points-per-position rules (configurable per series/era - F1 changed in 2010, 2019). 2) StandingsService that calculates driver/constructor standings from Results. 3) GET /api/v1/seasons/{id}/standings endpoint returning current standings. Handle: fastest lap points, sprint race points, dropped scores if applicable. Make it recalculable on demand. This is SPOILER DATA - implement Spoiler Shield.`

- [ ] **Calculate standings for past seasons** `[🐍 data]`
  > **Prompt**: `Create a Python script to calculate and populate championship standings for all existing seasons. Use the new StandingsService via API or direct DB access. Process each season's results chronologically to build accurate point-by-round data. Handle edge cases: DSQs, post-race penalties, point system changes mid-season. Add verification by comparing final standings against known historical data. Store intermediate standings (after each round) for "standings as of round X" feature.`

- [ ] **Points System UI** `[🎨 frontend]`
  > **Prompt**: `Add a "Points System" section to Series detail pages. Display the current points allocation table (P1-P10 or however many score). Show historical changes with dates (e.g., "2010: Top 10 score, 2019: Fastest lap point added"). Pull data from new PointsSystem API endpoint. Make it collapsible/expandable. Use a clean table format with racing-themed styling.`

- [ ] **Championship Standings UI** `[🎨 frontend]` `[🏁 spoiler]`
  > **Prompt**: `Add Championship Standings to Season detail pages. Show both Driver and Constructor standings in tabs or side-by-side. Display: position, name, points, wins, podiums. CRITICAL: This is SPOILER DATA - implement full Spoiler Shield. If user hasn't logged all races up to current round, show masked standings with "Log races to reveal" prompt. Add "Standings after Round X" historical view. Link driver/team names to their detail pages.`

---

#### 4. Chores

##### Agentic (Priority Order)
- [ ] **Add UIOrder to Series** `[🔧 backend]`
  > **Prompt**: `Add UIOrder column to the Series entity for consistent ordering in dropdowns and lists. Create migration to add nullable int UIOrder column. Set default values: F1=1, MotoGP=2, IndyCar=3, WEC=4, etc. Update SeriesController GET endpoints to order by UIOrder. Update frontend discovery pages to respect this ordering. Add UIOrder to SeriesDto.`

##### Manual (Priority Order)
- [ ] Legal review of historical data usage and user-generated content policies
- [ ] Finalize marketing materials (press kit, screenshots, feature list)
- [ ] Find community members for data contributions (MotoGP, IndyCar, WEC)

---

## 🗓️ Phase 1: Shakedown (MVP Release)

**Goal:** F1 2024-2025 fully functional, users can log races and see profiles

### Remaining Items
- [ ] **Complete auth endpoints** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Complete the authentication system. Ensure password reset and email verification endpoints are working (see User Experience Polish tasks). Add Remember Me functionality via extended JWT expiry or refresh token. Audit all auth endpoints for security: rate limiting, secure token generation, proper password hashing. Create integration tests for the full auth flow.`

- [ ] **OpenF1 scheduled sync job** `[🐍 data]`
  > **Prompt**: `Create an automated weekly sync job for OpenF1 data. Options: 1) Python script with cron/systemd timer, 2) .NET background service with Hangfire. The job should: sync current season sessions and results (use --no-results for upcoming races), handle rate limiting gracefully, log sync results, send alert on failure. Add idempotency - running twice shouldn't duplicate data. Target: runs every Sunday night after race weekends.`

- [ ] **Seed 2024-2025 F1 calendar data** `[🐍 data]`
  > **Prompt**: `Ensure complete F1 2024-2025 calendar data is seeded. Run full sync for both years: python -m ingestion sync --year 2024 and python -m ingestion sync --year 2025. Verify all rounds, sessions, drivers, teams, and results are present. Check for gaps using python -m ingestion.db audit. Document any missing data and source alternatives.`

- [ ] **Data & Licensing page** `[🎨 frontend]`
  > **Prompt**: `Create a /legal/data-licensing page explaining data sources and licensing. Include: 1) OpenF1 attribution (CC BY-SA 4.0), 2) Ergast attribution, 3) The Third Turn attribution (CC BY-NC-SA 4.0), 4) User-generated content policy, 5) How users can contribute corrections. Use a clean, readable layout. Link to this from footer.`

- [ ] **Footer attribution snippet** `[🎨 frontend]`
  > **Prompt**: `Add a footer component to all pages with proper attribution. Include: "Data from OpenF1, Ergast, community contributors" with links. Add copyright notice, links to Terms/Privacy/Data Licensing pages, and social links placeholder. Use subtle, unobtrusive design that doesn't distract from content. Make it a reusable Layout component part.`

### Infrastructure for Launch
- [ ] **Production deployment setup**
  > **Prompt (Manual/DevOps)**: `Set up production deployment. Recommended: Railway/Render for simplicity, or Azure/AWS for scale. Need: PostgreSQL instance, Redis instance, environment variables for secrets. Create deploy scripts or GitHub Actions workflow. Set up SSL, domain configuration. Document in DEPLOYMENT.md.`

- [ ] **Error tracking (Sentry)** `[🔧 backend]`
  > **Prompt**: `Integrate Sentry for error tracking. Add Sentry.AspNetCore package. Configure in Program.cs with DSN from environment variable. Add user context (ID, username) to errors for debugging. Set up source maps for frontend errors. Configure alert rules for critical errors. Test with a deliberate error. Add Sentry to frontend React app as well.`

- [ ] **Basic analytics** `[🎨 frontend]`
  > **Prompt**: `Add privacy-respecting analytics. Options: 1) Plausible (privacy-first, paid), 2) Umami (self-hosted, free), 3) Simple custom event logging to our API. Track: page views, feature usage (logs created, reviews written), but NO personal data. Create analytics dashboard or use provider's. Add cookie consent banner if using cookies.`

### Deferred to Later Phases
- ~~Admin/Mod tools~~ → Phase 2
- ~~WEC data integration~~ → Phase 3

---

## 🗓️ Phase 2: Midfield (Growth & Engagement)

**Goal:** Historical archive, social features, lists, search

### Historical Data
- [ ] **Extend historical data to 2018-2022** `[🐍 data]`
  > **Prompt**: `Import F1 data for 2018-2022 seasons. OpenF1 may not have full historical data - check availability first. If gaps exist, use Ergast archive (already in ergastf1 database) as source. Create a migration script that maps Ergast data to our schema. Verify driver/team entity matching works correctly. Run python -m ingestion.db audit after import to check data quality.`

- [ ] **Historical season browser UI** `[🎨 frontend]`
  > **Prompt**: `Enhance the season browser to handle historical data. Add decade/era groupings (2020s, 2010s, etc.). Show visual indicators for data completeness (full results vs. calendar only). Add "vintage" styling for older eras. Improve performance for large season lists with virtualization if needed. Link to Wikipedia/external sources for pre-digital era context.`

### Social & Discovery
- [ ] **Lists API + UI** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement the Lists feature (like Letterboxd lists). Backend: Create List and ListItem entities. List has: title, description, isPublic, userId, createdAt. ListItem has: listId, sessionId, order, notes. CRUD endpoints: POST/GET/PUT/DELETE /api/v1/lists. Frontend: /lists page showing public lists, /lists/new for creation, /lists/{id} for viewing. Allow drag-and-drop reordering. Add "Add to List" button on session pages.`

- [ ] **"Sagas" (Chronological Playlists)** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`
  - Special list type with `saga_mode` flag enforcing chronological ordering
  - Timeline/subway-map UI view
  - Chapter markers with annotations
  - Examples: "Hamilton vs Verstappen 2021", "Ford vs Ferrari Le Mans Era"
  > **Prompt**: `Implement Sagas as a special List type. Add sagaMode boolean to List entity - when true, items are auto-sorted chronologically by session date. Add chapterTitle optional field to ListItem for narrative annotations. Backend: enforce chronological order on save when sagaMode=true. Frontend: create timeline/subway-map visualization for Saga view. Show chapter markers between items. Add "Create Saga" option distinct from regular list creation.`

- [ ] **Social feed algorithm** `[🔧 backend]`
  > **Prompt**: `Improve the home feed algorithm beyond chronological. Implement: 1) Following-first (show followed users' activity at top), 2) Series preference weighting (boost F1 for F1 fans), 3) Engagement signals (boost reviews over simple logs), 4) Recency decay. Create configurable feed service. Add personalization based on user's logged series/drivers. Keep it simple - no ML needed, just weighted scoring.`

- [ ] **Activity notifications** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement notification system. Backend: Create Notification entity (userId, type, sourceUserId, resourceId, resourceType, isRead, createdAt). Trigger notifications on: someone follows you, someone likes your review, someone comments on your review. GET /api/v1/notifications endpoint with unread count. Frontend: notification bell in header with dropdown, /notifications page for full history. Add real-time updates later via WebSocket.`

- [ ] **Enhanced user profiles** `[🎨 frontend]`
  > **Prompt**: `Enhance user profile pages with stats and badges. Add: total races logged, hours watched (estimate from session durations), favorite circuit (most logged), favorite driver (most logged sessions with), streak badges (consecutive weekends logged), "completionist" badges (logged full season). Create visual stats cards. Add Year in Review section showing annual stats. Prepare for future gamification.`

### Search & Performance
- [ ] **Search API (Elasticsearch)** `[🔧 backend]`
  > **Prompt**: `Integrate Elasticsearch for full-text search. Index: Sessions (name, round name, circuit), Drivers (name, aliases), Teams (name, aliases), Circuits (name, location, country), Reviews (text). Create SearchService with unified search endpoint GET /api/v1/search?q=monaco. Return typed results grouped by entity type. Set up Elasticsearch sync on entity changes. Handle Elasticsearch being unavailable gracefully with fallback to SQL LIKE.`

- [ ] **Advanced search UI** `[🎨 frontend]`
  > **Prompt**: `Create advanced search page at /search. Features: search input with instant results, filters by type (sessions, drivers, teams, circuits), filters by series, filters by year range. Show results in categorized sections. Add search to nav bar with keyboard shortcut (Cmd/Ctrl+K). Implement search-as-you-type with debouncing. Show recent searches.`

### Moderation
- [ ] **Admin/Mod tools** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]` `[🔒 security]`
  > **Prompt**: `Implement admin and moderator tools. Backend: Add Role enum (User, Moderator, Admin) to ApplicationUser. Create AdminController with: user management (ban/unban, role changes), content moderation (hide/delete reviews, flag logs), data quality dashboard (missing data, anomalies). Frontend: /admin dashboard (admin only), review queue for flagged content. Add [Authorize(Roles = "Admin,Moderator")] to protected endpoints. Log all mod actions for audit.`

- [ ] **Community reporting** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Add content reporting system. Backend: Create Report entity (reporterId, contentType, contentId, reason, status, resolvedBy, resolvedAt). POST /api/v1/reports endpoint. Reasons: spam, harassment, spoilers, inaccurate data. Frontend: "Report" option on reviews and lists (not on system data). Show report status to reporter. Add to mod queue. Create transparency page showing aggregate moderation stats (reports resolved, etc.).`

- [ ] **Mod/admin badges** `[🔧 backend]`
  > **Prompt**: `Add visual distinction for moderators and admins. Add UserRole to user DTOs. Frontend: show badge/flair next to usernames for Mods (shield icon) and Admins (star icon). Add subtle styling to their reviews/comments. Show role on profile pages. Don't make it too prominent - subtle but recognizable.`

- [ ] **Contributor attribution** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Create system for attributing community data contributors. Backend: Add contributedBy field to entities that accept community submissions (future). Create ContributorProfile linked to User with: contribution count, contribution types, verified status. Frontend: show contributor badge on profile, "Data contributed by X" on entities. Create /contributors leaderboard page. Prepare for Phase 3 community data submission.`

### Mobile & Responsive
- [ ] **Mobile-responsive improvements** `[🎨 frontend]`
  > **Prompt**: `Audit and improve mobile responsiveness across all pages. Focus on: nav bar (hamburger menu), data tables (horizontal scroll or card view), forms (touch-friendly inputs), session cards (stack vertically), discovery grids (reduce columns). Test on various screen sizes. Use Tailwind responsive prefixes consistently. Fix any overflow issues. Ensure touch targets are at least 44x44px.`

---

## 🗓️ Phase 3: The Third Turn - Historic Multi-Series Expansion

**Goal:** Use The Third Turn database to bring MotoGP, IndyCar, WEC, Formula E, NASCAR into Parc Fermé

**See:** [docs/thethirdturn/THETHIRDTURN.md](./docs/thethirdturn/THETHIRDTURN.md) for technical details

**✅ Foundation Complete:**
- Data model updated with 8 new fields (GoverningBody, TrackType, TrackStatus, OpenedYear, Nickname, PlaceOfBirth, LapsLed, CarNumber)
- DTOs and API endpoints updated to expose new fields
- Python ingestion pipeline ready to populate new fields
- THETHIRDTURN.md documentation with JavaScript extraction examples

### Phase 3A: Build The Third Turn Scraper
- [ ] **Build scraper infrastructure** `[🐍 data]`
  > **Prompt**: `Create The Third Turn scraper in src/python/ingestion/sources/thethirdturn/. Structure: base.py (common scraping utilities), series.py (series index), season.py (season pages), race.py (race details), driver.py (driver profiles), circuit.py (circuit info). Use httpx for requests, beautifulsoup4 for parsing. Implement rate limiting (be respectful - 1 req/sec). Follow JavaScript extraction patterns from THETHIRDTURN.md. Add caching to avoid re-scraping.`

- [ ] **Scrape series, seasons, races** `[🐍 data]`
  > **Prompt**: `Implement scrapers for The Third Turn data. Start with series index page to get all available series. For each series: scrape season list, then each season's race list, then each race's details. Map to our entities: Series, Season, Round, Session. Handle The Third Turn's different naming conventions. Respect CC BY-NC-SA 4.0 license (attribute properly, no commercial use of raw data). Create CLI: python -m ingestion.sources.thethirdturn sync --series "MotoGP".`

- [ ] **Entity matching** `[🐍 data]`
  > **Prompt**: `Implement entity matching for The Third Turn imports. Use existing DriverAliases, TeamAliases, CircuitAliases tables to match incoming names to existing entities. For new entities: create them with TheThirdTurn source flag. Handle edge cases: driver name variations (Verstappen vs Max Verstappen), team rebrands, circuit name changes. Log unmatched entities for manual review. Create matching report after each import.`

### Phase 3B: Import Major Series
- [ ] **MotoGP import** `[🐍 data]`
  > **Prompt**: `Import MotoGP 2020-2025 data from The Third Turn. Run scraper for MotoGP series. Verify entity matching (riders, teams, circuits). Handle MotoGP-specific session types (FP1, FP2, Q1, Q2, Sprint, Race). Import results. Run data audit. Create MotoGP Series entry if not exists with proper UIOrder. Test spoiler shield works with MotoGP sessions.`

- [ ] **IndyCar import** `[🐍 data]`
  > **Prompt**: `Import IndyCar 1996-present from The Third Turn. Handle IndyCar specifics: oval vs road/street circuits, points system changes over years, Indy 500 as special event. Create proper season structure. Import drivers, teams, results. Note: IndyCar has double-headers sometimes - handle multiple races per weekend correctly.`

- [ ] **WEC import** `[📋 plan]` `[🐍 data]`
  > **Prompt**: `Import WEC data - this is complex due to multi-class, multi-driver format. First, plan the data model: WEC has classes (Hypercar, LMP2, GT), each car has 2-3 drivers, results are per-car not per-driver. May need new entities or fields. Create Car entity if needed (number, team, class, drivers). Import Le Mans 24h and full WEC seasons. Handle class-specific results (overall winner vs class winner).`

- [ ] **Formula E import** `[🐍 data]`
  > **Prompt**: `Import Formula E data from The Third Turn. Handle: double-header weekends (two races same weekend), points format differences, team name changes (Audi → Mahindra, etc.). Map circuits correctly (many are street circuits with generic names). Import from Season 1 (2014-15) to present.`

- [ ] **NASCAR import** `[🐍 data]`
  > **Prompt**: `Import NASCAR Cup Series data. Handle: large fields (40+ cars), stage racing format (since 2017), playoff system, points format changes. Start with 2020-present for manageable scope. Map drivers and teams correctly (many small teams). Handle restrictor plate races vs. other types if relevant to UI.`

### Phase 3C: Multi-Series UI
- [ ] **Fix F1-specific assumptions** `[🎨 frontend]`
  > **Prompt**: `Audit frontend for F1-specific assumptions and make multi-series compatible. Check: session type displays (Q1/Q2/Q3 vs single qualifying), result formats (laps led in NASCAR vs gaps in F1), terminology ("Grand Prix" vs "race" vs "round"), color schemes per series, navigation structure. Create series-aware components that adapt display based on series type.`

- [ ] **WEC multi-class UI** `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement UI for WEC's multi-class format. Show class tabs/filters on results (Hypercar, LMP2, GT). Display car entries with multiple drivers. Show class winners alongside overall winner. Handle class-specific spoiler shield (user might want to hide GT results but not Hypercar). Create car detail page showing driver rotation. This is a significant UI paradigm shift from single-driver racing.`

- [ ] **Verify spoiler shield across series** `[🏁 spoiler]` `[🧪 qa]`
  > **Prompt**: `Comprehensively test Spoiler Shield with non-F1 series. Test scenarios: log MotoGP race, verify F1 results still hidden (and vice versa). Test class-based spoilers for WEC. Verify search doesn't leak results. Check feed algorithm doesn't expose cross-series spoilers. Create test suite covering all series × spoiler mode combinations. Document any series-specific spoiler edge cases.`

### Phase 3D: Data Exports & Third-Party Access
- [ ] **Public API design** `[📋 plan]` `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Design and implement public API for third-party developers. Create /api/v1/public/* endpoints with: API key authentication, rate limiting (100 req/min free, more for approved apps), read-only access to non-spoiler data. Document available endpoints, data formats, attribution requirements. Create developer signup flow for API keys. Consider webhooks for new data notifications.`

- [ ] **API documentation (Swagger)** `[🔧 backend]`
  > **Prompt**: `Set up comprehensive API documentation. Enable Swagger UI at /swagger. Add XML comments to all public endpoints. Group endpoints by feature area. Include authentication examples. Add request/response examples. Create /docs page with getting started guide, rate limits, terms of use. Consider generating OpenAPI spec file for SDK generation.`

- [ ] **Bulk data download** `[🔧 backend]`
  > **Prompt**: `Implement bulk data download system. Create nightly PostgreSQL dumps of public data (no user PII). Generate CSV exports per entity type (sessions, results, drivers, etc.). Host on CDN or provide torrent links for large files. Create /data-downloads page listing available exports with dates and sizes. Include checksums. Document schema for each export format.`

---

## 🗓️ Phase 4: Podium (Premium, Gamification, Mobile)

**Goal:** Venue guides, gamification, monetization, mobile app

### Venue & Circuit Guides
- [ ] **Circuit guides API** `[📋 plan]` `[🔧 backend]`
  > **Prompt**: `Design and implement Circuit Guides API. Create endpoint GET /api/v1/circuits/{slug}/guide that returns: grandstand list with ratings (aggregated from Experiences), amenities info, travel tips, nearby accommodations. Add new CircuitGuide entity if needed, or aggregate from existing Experience data. Include: average view rating per grandstand, accessibility ratings, food/beverage ratings. Consider caching as this data changes slowly.`

- [ ] **Circuit guide pages** `[🎨 frontend]`
  > **Prompt**: `Build circuit guide pages at /circuits/{slug}/guide. Show: interactive track map with grandstand locations (use SVG), grandstand cards with aggregated ratings and user comments, seat view photo gallery (from Experience uploads), travel tips section, weather info. Make it the go-to resource for "where should I sit?" decisions. Include CTA to submit your own experience.`

- [ ] **Seat map overlays** `[🎨 frontend]`
  > **Prompt**: `Create interactive seat map component for circuits. Use SVG track layouts with clickable grandstand areas. On hover: show quick stats (avg rating, price tier, view description). On click: expand to full grandstand detail with photos, reviews, pros/cons. Allow users to submit their seat location when logging attended sessions. Consider using Leaflet.js for zoom/pan if maps get complex.`

### Gamification
- [ ] **Gamification system** `[📋 plan]` `[🔧 backend]`
  > **Prompt**: `Design and implement gamification system. Create Achievement entity (type, name, description, icon, rarity, criteria). Implement achievement types: logging milestones (10/50/100 races), attendance (first live race, attended 5 circuits), engagement (first review, 10 reviews), exploration (logged race from 5 different series), streaks (logged every race weekend for a month). Create AchievementUnlock entity linking users to achievements with unlock date. Trigger achievement checks after relevant actions.`

- [ ] **Achievement system UI** `[🎨 frontend]`
  > **Prompt**: `Build achievement UI components. Create: achievement badge component (icon, name, rarity color), achievement unlock toast notification, profile achievements section showing earned badges, achievement detail modal with progress toward locked achievements. Add achievement showcase on profile (pin up to 5). Consider animations for unlock moments. Include "Superlicence" level calculation based on XP from activities.`

- [ ] **Stats dashboards** `[🎨 frontend]`
  > **Prompt**: `Create personal stats dashboard at /profile/stats. Show: total races logged (watched vs attended), favorite driver/team/circuit (by log count), rating distributions (histogram), monthly activity chart, series breakdown pie chart, "Year in Review" summary. Make it shareable—generate OG image for social sharing. Include fun stats like "total race hours watched".`

### Premium Tier (Paddock Pass)

**Philosophy:** "Show your colors, manage your schedule, see your stats." Paddock Pass enhances identity and convenience, never gatekeeps data.

#### 🎨 "Livery" Customization (Identity)
- [ ] **Team accent colors system** `[🎨 frontend]`
  > **Prompt**: `Implement team accent color system for Paddock Pass subscribers. Allow users to select a team as their "colors"—apply team's primary color as accent throughout app (buttons, links, highlights). Store preference in user profile. Use CSS variables for easy theme switching. Handle dark/light mode contrast. Include all series teams, not just F1.`

- [ ] **Dark/Light mode overrides** `[🎨 frontend]`
  > **Prompt**: `Add advanced theme controls for Paddock Pass. Beyond system default: force dark, force light, or auto. Add "Lights Out" mode (extra dark for race watching). Store preference. Apply consistently across all components. Consider per-session theme (dark during race, light after).`

- [ ] **Custom app icons** `[🎨 frontend]`
  > **Prompt**: `Design custom app icon variants for Paddock Pass users (web manifest + mobile). Create team-themed icons, dark variants, special event icons (Monaco GP, Le Mans). Allow users to select in settings. For web: update manifest.json dynamically. Document how this will work in React Native app later.`

- [ ] **Profile flair and badges** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement profile flair system. Create Flair entity (icon, color, title, criteria). Types: Paddock Pass supporter badge, attendance badges (5/10/25 races attended), veteran badges (member since year), contribution badges (helpful reviews). Display on profile and next to username in comments/reviews. Allow users to select which flair to display prominently.`

#### 📊 "Telemetry" Personal Stats (Insight)
- [ ] **Lap counter and heatmaps** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Build "Telemetry" stats for Paddock Pass. Backend: calculate total laps watched (sum race laps from logged sessions), create circuit heatmap data (which tracks logged most), constructor breakdown. Frontend: display lap counter prominently, show world map with circuits colored by visit count, show team loyalty chart. Make calculations efficient—consider background jobs for heavy aggregations.`

- [ ] **Driver bias analysis** `[🔧 backend]`
  > **Prompt**: `Implement driver bias analysis for Paddock Pass. Analyze user's ratings: do they rate races higher when their favorite driver wins? Calculate correlation. Show "You rate races 0.3 stars higher when Verstappen wins" style insights. Aggregate from logs + results data. Make it fun and self-aware, not accusatory. Include disclaimer about statistical significance.`

- [ ] **Year in Review** `[🎨 frontend]`
  > **Prompt**: `Create Year in Review shareable cards for Paddock Pass. At season end, generate personalized summary: races logged, total hours, favorite driver/team/circuit, rating distribution, achievements unlocked, memorable reviews written. Design as shareable image cards (like Spotify Wrapped). Allow sharing to social media. Store generated reviews for historical access.`

- [ ] **GitHub-style activity heatmap** `[🎨 frontend]`
  > **Prompt**: `Add GitHub-style activity heatmap to user profiles. Show logging activity over past year—darker squares for days with more logs. Include: races logged, reviews written, comments made. Show on profile page. Make it motivating—encourage consistent engagement. Calculate contribution score.`

#### 🏆 "Pit Wall" Features (Lists & Logs)
- [ ] **List forking and headers** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Add advanced list features for Paddock Pass. Backend: implement list forking (copy another user's list to your account), custom list headers (banner image, description formatting). Frontend: fork button on public lists, header customization in list edit mode. Track fork count as engagement metric.`

- [ ] **Pinned reviews and filtering** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement pinned reviews and advanced filtering for Paddock Pass. Allow users to pin up to 3 reviews to top of their profile. Add advanced log filtering: by series, by year range, by rating range, attended only. Create saved filters for quick access. These are power-user features for serious collectors.`

#### 🔧 "Scrutineering" Rights (Community Influence)
- [ ] **Priority data queue** `[🔧 backend]`
  > **Prompt**: `Implement priority data queue for Paddock Pass supporters. When users request missing data (races, results, circuits), Paddock Pass requests get priority processing. Create DataRequest entity (entity type, details, requester, priority, status). Build queue processing system. Show estimated time for requests.`

- [ ] **Contributor recognition** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Build contributor recognition system. Track contributions: data corrections, helpful reviews, seat photos submitted. Award contributor badges at thresholds. Show "Top Contributors" leaderboard. Give Paddock Pass contributors special recognition (different badge color). This incentivizes community data improvement.`

#### 📅 Calendar Sync
- [ ] **iCal subscription feeds** `[🔧 backend]`
  > **Prompt**: `Implement iCal subscription feeds for Paddock Pass. See Phase 5 for full implementation. For Paddock Pass: personalized feed URL with user's followed series, smart session filtering based on what they typically watch (if they never log FP sessions, option to exclude), push notifications for schedule changes.`

- [ ] **Push notifications** `[🔧 backend]`
  > **Prompt**: `Implement push notification system. Use web push (Service Worker + Push API) for web, plan for FCM/APNs for mobile later. Notification types: schedule changes, race starting soon, followed user posted review, achievement unlocked. User preferences for each type. Respect spoiler mode—never include results in notifications.`

#### Payment & Subscription
- [ ] **Stripe integration** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Integrate Stripe for Paddock Pass payments. Create Stripe Customer on user signup (or first upgrade attempt). Implement subscription products: monthly ($2.99) and yearly ($24.99). Handle webhook events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted. Store subscription status in ApplicationUser. Use Stripe Customer Portal for management. Never store card details—use Stripe's secure tokenization.`

- [ ] **Paddock Pass upgrade flow** `[🎨 frontend]` `[🔒 security]`
  > **Prompt**: `Build Paddock Pass upgrade UI. Create upgrade page showing: feature comparison (free vs Paddock Pass), pricing options (monthly/yearly with savings highlighted), testimonials if available. Use Stripe Checkout for payment (redirect flow for security). Handle success/cancel redirects. Show confetti on successful upgrade. Update UI immediately to reflect new status.`

- [ ] **Subscription management** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement subscription management. Link to Stripe Customer Portal from settings page for: update payment method, change plan, cancel subscription. Handle cancellation gracefully—allow access until period end, show "We'll miss you" message, offer feedback form. Track cancellation reasons for product improvement.`

- [ ] **Funding transparency** `[🎨 frontend]`
  > **Prompt**: `Create funding transparency page at /about/funding. Show: how Paddock Pass revenue supports the project, breakdown of costs (hosting, API access, development), any community funding goals. Be honest and transparent—this builds trust. Consider showing supporter count (anonymized). Link to GitHub sponsors if applicable.`

### Mobile App
- [ ] **React Native scaffold** `[📋 plan]`
  > **Prompt**: `Plan React Native app scaffold. Analyze which web components can be shared vs need native implementation. Plan: navigation structure (tab bar: Home, Discover, Log, Profile), authentication flow, offline support requirements. Create project structure in src/mobile/. Choose: Expo (easier) vs bare React Native (more control). Document decisions for future implementation.`

- [ ] **Core features parity** `[🎨 frontend]`
  > **Prompt**: `Implement core mobile app features to match web. Priority order: authentication, session browsing, logging races, viewing profile. Use React Navigation. Share types and API client with web where possible. Consider React Native Paper or similar for components. Focus on native feel—don't just wrap the web app.`

- [ ] **Mobile push notifications** `[🔧 backend]`
  > **Prompt**: `Implement mobile push notifications. Integrate Firebase Cloud Messaging (FCM) for Android and APNs for iOS. Store device tokens per user. Reuse notification preferences from web. Send to appropriate platform(s) based on user's registered devices. Handle token refresh. Test thoroughly on both platforms.`

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
- [ ] **Public series ICS feeds** `[🔧 backend]`
  > **Prompt**: `Implement public ICS calendar feeds at GET /api/v1/calendar/series/{seriesSlug}.ics. Generate RFC 5545 compliant ICS files with all sessions for a series. Include VEVENT for each session with: summary (e.g., "F1: Monaco GP - Race"), location (circuit name), start/end times (use session duration estimates), description with link to ParcFerme session page. Set proper VTIMEZONE. Cache generated ICS (invalidate when schedule changes). No authentication required for public feeds.`

- [ ] **Event descriptions with deep links** `[🔧 backend]`
  > **Prompt**: `Enhance ICS event descriptions with useful deep links. Include: direct link to session page (https://parcferme.com/sessions/{id}), link to log the session, link to circuit guide. Format nicely for calendar app display. Consider adding: previous year's winner (spoiler-safe since it's historical), track characteristics, timezone conversion tips.`

- [ ] **Automatic schedule sync** `[🐍 data]`
  > **Prompt**: `Implement automatic schedule synchronization. Monitor official calendars for changes (use cron job or scheduled task). When schedule changes detected: update Session entities, invalidate ICS cache, queue notifications for affected users. Handle: race postponements, time changes, cancellations. Log all changes for audit. Consider using official FIA/FOM calendar feeds where available.`

### Paddock Pass (Personalized Feeds)
- [ ] **Personalized calendar feeds** `[🔧 backend]`
  > **Prompt**: `Implement personalized ICS feeds for Paddock Pass users at GET /api/v1/calendar/{userId}/subscribe.ics. Include only series user follows. Add authentication via unique user token in URL (not password in ICS - that's not secure). Allow filtering: all sessions vs race-only, include support races option. Regenerate when user preferences change.`

- [ ] **Smart profile inference** `[🔧 backend]`
  > **Prompt**: `Implement smart calendar defaults based on logging history. Analyze what user logs: if they never log FP sessions, default to excluding FP from calendar. If they always log qualifying, include it. Calculate: most-logged session types, series engagement levels. Present as suggestions in calendar settings. Allow manual override of all inferences.`

- [ ] **Calendar customization settings** `[🎨 frontend]`
  > **Prompt**: `Build calendar settings UI at /settings/calendar. Options: series to include (checkboxes), session types to include (FP1/FP2/FP3/Quali/Sprint/Race), reminder times (15min/1hr/1day before), display preferences. Show ICS subscription URL with copy button. Include setup instructions for Google Calendar, Apple Calendar, Outlook. Preview upcoming events based on current settings.`

- [ ] **Schedule change notifications** `[🔧 backend]`
  > **Prompt**: `Implement push notifications for schedule changes. When schedule sync detects changes affecting user's followed series: queue notification with details (session, old time, new time). Batch multiple changes into single notification if they occur together. Respect user notification preferences. Include link to update local calendar if they're not using subscription.`

### Technical Implementation
- [ ] **ICS generation service** `[🔧 backend]`
  > **Prompt**: `Create ICS generation service in Services/CalendarService.cs. Implement RFC 5545 specification properly: VCALENDAR wrapper, VEVENT per session, proper datetime formatting (YYYYMMDDTHHmmssZ for UTC), DTSTART/DTEND, UID (use session GUID), DTSTAMP, proper line folding (75 chars), CRLF line endings. Consider using iCal.NET library for .NET. Write unit tests for ICS output validity.`

- [ ] **User calendar preferences** `[🔧 backend]`
  > **Prompt**: `Create UserCalendarPreference entity. Fields: UserId, IncludedSeriesIds (JSON array), IncludedSessionTypes (enum flags), ReminderMinutes, CalendarToken (unique secure string for URL auth), LastGeneratedAt. Add migration. Create CalendarPreferencesController for CRUD. Generate secure token on first calendar access request.`

- [ ] **Feed caching with invalidation** `[🔧 backend]`
  > **Prompt**: `Implement smart caching for ICS feeds. Cache generated ICS content in Redis with key pattern calendar:{seriesSlug} or calendar:user:{userId}. Set TTL to 1 hour. Invalidate when: schedule changes (via event), user preferences change. Use ETag headers for client-side caching. Consider: serving from CDN for public feeds.`

- [ ] **VTIMEZONE support** `[🔧 backend]`
  > **Prompt**: `Implement proper VTIMEZONE handling in ICS feeds. Sessions are stored as UTC but users need local times. Include VTIMEZONE definitions for common timezones. Consider user's preferred timezone from profile. Test with: Google Calendar, Apple Calendar, Outlook—they handle timezones differently. Provide both floating time and UTC options for user preference.`

---

## 🎯 Backlog (Unprioritized)

### Additional Features
- [ ] **Discord OAuth** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Add Discord OAuth provider. Install Discord OAuth NuGet package. Configure in AuthExtensions.cs alongside Google. Add Discord client ID/secret to appsettings. Create Discord icon button on login page. Map Discord user data to ApplicationUser (username, avatar). Discord is popular in motorsport communities.`

- [ ] **Apple OAuth** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Add Apple Sign In OAuth provider. Note: Apple requires special handling (private key, team ID). Configure in AuthExtensions.cs. Handle Apple's email relay feature (privaterelay.appleid.com). Required for iOS App Store compliance if we want mobile app. Test on Safari and iOS devices.`

- [ ] **Platform import (CSV)** `[🐍 data]`
  > **Prompt**: `Build CSV import for users migrating from other platforms. Support import of: watched sessions (date, session, rating), reviews (text, date). Create import format documentation. Build Python script to process CSV, match sessions, create Logs. Handle: partial matches, duplicates, validation errors. Provide import preview before committing.`

- [ ] **GDPR data export** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Implement GDPR-compliant user data export. Create endpoint GET /api/v1/users/me/data-export that generates ZIP file containing: profile data (JSON), all logs (JSON), all reviews (JSON), uploaded images, activity history. Queue generation as background job (large exports take time). Email download link when ready. Retain export for 7 days then delete.`

- [ ] **Bulk data download page** `[🎨 frontend]`
  > **Prompt**: `Create /data/downloads page showing available bulk data exports. List: PostgreSQL dumps (updated nightly), CSV per entity type, API documentation link. Show file sizes, last updated dates, checksums. Include usage terms and attribution requirements. Link to Kaggle mirror if we create one.`

- [ ] **Browser extension** `[📋 plan]` `[🏁 spoiler]`
  > **Prompt**: `Plan browser extension for spoiler blocking. Extension would: detect motorsport result pages (r/formula1, official sites, news), blur/hide results until user confirms they want to see, integrate with ParcFerme spoiler mode setting. Research: Chrome Extension API, Firefox WebExtensions. Define scope carefully—this is a significant project. Consider partnering with existing extensions.`

- [ ] **Watch party coordination** `[📋 plan]`
  > **Prompt**: `Plan watch party feature. Allow users to: create watch party events (link to session, time, location/online), invite friends, RSVP. Show who in your network is watching. Consider: Discord integration for voice chat coordination, time zone handling for global parties. Define MVP scope vs full feature set.`

- [ ] **Prediction games** `[📋 plan]`
  > **Prompt**: `Plan prediction game feature. Before each session: users predict results (podium, pole, fastest lap). Score based on accuracy. Leaderboards: per-round, per-season, all-time. Consider: making predictions spoiler-safe (don't show predictions for sessions user hasn't logged), integrating with social features. Research fantasy F1 for ideas.`

- [ ] **Fantasy league integration** `[📋 plan]`
  > **Prompt**: `Plan fantasy league integration. Options: build our own, integrate with official F1 Fantasy, support multiple providers. If building: team selection, budget cap, scoring rules. If integrating: API access (check availability), sync user teams, show fantasy context on session pages. Define scope—this could be its own product.`

### Technical Improvements
- [ ] **GraphQL API** `[📋 plan]` `[🔧 backend]`
  > **Prompt**: `Plan and implement GraphQL API as alternative to REST. Use Hot Chocolate library for .NET. Define schema covering main entities: Series, Season, Round, Session, Driver, Team, Log. Implement resolvers with spoiler awareness. Add DataLoader for N+1 query prevention. Deploy alongside REST at /graphql. Add GraphQL Playground for exploration. Consider: complexity limits, depth limits for DoS prevention.`

- [ ] **WebSocket live updates** `[🔧 backend]` `[🎨 frontend]`
  > **Prompt**: `Implement WebSocket support for real-time updates. Use SignalR for .NET. Create hubs: LiveSessionHub (session status changes during race weekend), ActivityFeedHub (new logs/reviews from followed users), NotificationHub (personal notifications). Frontend: create useSignalR hook, connect on relevant pages. Handle reconnection gracefully. Don't send spoiler content through WebSocket.`

- [ ] **CDN for images** `[🔧 backend]`
  > **Prompt**: `Set up CDN for image delivery. Options: CloudFront, Cloudflare, Bunny CDN. Configure for: user uploads (profile pics, seat photos), static assets (driver photos, team logos, circuit maps). Implement image optimization (WebP conversion, responsive sizes). Update image URLs to use CDN domain. Set proper cache headers.`

- [ ] **Database read replicas** `[🔧 backend]`
  > **Prompt**: `Plan database read replica setup for scaling. PostgreSQL streaming replication to read replica(s). Update EF Core configuration to route read queries to replica. Identify read-heavy queries: discovery pages, public profiles, search. Handle replication lag (eventual consistency). Document operational procedures for replica promotion if primary fails.`

- [ ] **Rate limiting** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Implement API rate limiting. Use AspNetCoreRateLimit NuGet package. Define limits: anonymous (60/min), authenticated (300/min), Paddock Pass (600/min). Special limits for: auth endpoints (10/min to prevent brute force), search (30/min). Return proper 429 responses with Retry-After header. Log rate limit hits for abuse detection. Consider Redis-backed distributed rate limiting for multi-instance deployment.`

- [ ] **Performance monitoring** `[🔧 backend]`
  > **Prompt**: `Set up application performance monitoring. Options: Application Insights, Datadog, New Relic. Implement: request timing, database query logging, exception tracking, custom metrics (logins, logs created, searches). Create dashboard for: P99 latency, error rates, slow queries. Set up alerts for anomalies. Add correlation IDs for request tracing.`

- [ ] **A/B testing framework** `[🎨 frontend]`
  > **Prompt**: `Implement A/B testing framework for UI experiments. Options: LaunchDarkly, Statsig, custom solution. Create: experiment definition (name, variants, traffic split), user bucketing (consistent per user), variant rendering hook. Track: conversion events, engagement metrics. Start simple: button colors, copy changes. Document experiment process and statistical significance requirements.`

### Content & Community
- [ ] **Editorial content system** `[📋 plan]`
  > **Prompt**: `Plan editorial content system for curated lists and articles. Create content types: "Essential Races" (staff-curated best races), "Rivalry Highlights" (notable battles), educational content ("Understanding DRS"). Define: who can create (staff initially), content workflow (draft → review → publish), where content appears (homepage, relevant pages). Consider headless CMS vs custom solution.`

- [ ] **Verified accounts** `[🔧 backend]` `[🔒 security]`
  > **Prompt**: `Implement verified account system. Create VerificationRequest entity with: user, requested type (driver/team/journalist/creator), evidence (links, documentation). Build admin review workflow. Add verified badge to profile. Verified accounts get: badge, priority in search, ability to claim driver/team pages. Define verification criteria per type. Prevent impersonation.`

- [ ] **Official series partnerships** `[📋 plan]`
  > **Prompt**: `Plan official series partnership outreach. Identify contact points at F1, MotoGP, IndyCar, WEC. Prepare: pitch deck showing user engagement, data accuracy, community value. Potential benefits: official data feed access, promotion, verified team accounts. Start with smaller series (F2/F3) for easier access. Document partnership terms and data usage agreements.`

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
- [Custom Agents](./.github/agents/) - VS Code AI agents for development
- [API Documentation](http://localhost:5000/swagger) (local dev)
- [Bulk Sync Guide](./docs/BULK_SYNC.md)
- [Ergast Migration Strategy](./docs/ERGAST_MIGRATION.md)
- [The Third Turn Integration](./docs/thethirdturn/THETHIRDTURN.md)
