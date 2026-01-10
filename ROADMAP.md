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

- [x] **"Weekend Wrapper" UI** `[🎨 frontend]` - COMPLETED
  - ✅ `WeekendWrapperModal` component with multi-step wizard
  - ✅ Session selection with checkboxes (sorted by type: FP1→Race)
  - ✅ Individual star rating + excitement slider per session
  - ✅ Live aggregate rating calculation
  - ✅ "Full Weekend!" badge when all sessions selected
  - ✅ Venue experience ratings (for attended)
  - ✅ "Log Full Weekend" button on RoundDetailPage
  - ✅ "Full Weekend Logged!" badge on RoundDetailPage when complete

### 📋 Up Next (Priority Order)

#### 0. Community Reviews (HIGH PRIORITY)

The backend API and frontend service already exist - we just need to wire up the UI!

- [ ] **Community Reviews on Session Pages** `[🎨 frontend]` `[🏁 spoiler]`
  - Backend API exists: `GET /api/v1/reviews/session/{sessionId}`
  - Frontend service exists: `reviewsApi.getSessionReviews()`
  - UI shows placeholder - needs to fetch and display real reviews
  > **Prompt**: `Implement Community Reviews section on SessionDetailPage. The backend API already exists (GET /api/v1/reviews/session/{sessionId}) and frontend service exists (reviewsApi.getSessionReviews). Replace the EmptyState placeholder with actual review data. Implementation: 1) Add useState for reviews and loading state, 2) Add useEffect to fetch reviews on mount using reviewsApi.getSessionReviews(sessionId), 3) Create a ReviewCard component showing author avatar/name, star rating, excitement rating, date, and review text with "Read more" expansion for long reviews, 4) Handle spoiler-marked reviews with SpoilerMask based on user's spoilerMode - reviews marked as containing spoilers should be blurred until clicked, 5) Show loading state while fetching, 6) Keep EmptyState when reviews array is empty after fetch, 7) Add pagination if more than 10 reviews.`

- [ ] **Review Card Component** `[🎨 frontend]` `[🏁 spoiler]`
  > **Prompt**: `Create a reusable ReviewCard component at src/web/src/components/ReviewCard.tsx. Props: review (ReviewDto), spoilerMode (SpoilerMode), onReveal callback. Display: author avatar (use Gravatar or initials), author username linking to profile, star rating (use existing StarRating component in read-only mode), excitement rating badge, "Attended" badge if isAttended, review date, review body text. For reviews with containsSpoilers=true: wrap body in SpoilerMask unless spoilerMode is 'None'. Add like button with count. Truncate long reviews with "Read more" expansion. Follow existing component patterns.`

---

#### 1. Core Logging Flow - Remaining Work

- [ ] **Edit/Delete Log functionality** `[🎨 frontend]` `[🔧 backend]`
  - Hook up edit mode in LogModal (existingLog prop already supported)
  - Add delete confirmation modal
  - Add "Edit Log" button to session detail page when user has logged
  > **Prompt**: `Implement Edit/Delete functionality for user logs. The LogModal component already supports an existingLog prop for edit mode - wire this up. Add a DELETE endpoint to LogsController if not present. Create a delete confirmation modal component. Add an "Edit Log" button that appears on session detail pages when the current user has already logged that session. Ensure proper authorization checks.`

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
