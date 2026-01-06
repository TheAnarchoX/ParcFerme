# Parc Fermé - Development Roadmap

> Last updated: January 6, 2026

## 🏁 Current Sprint: Foundation

### ✅ Completed
- [x] Project scaffolding (monorepo structure)
- [x] .NET 10 API setup with EF Core, Identity, PostgreSQL
- [x] React 18 + Vite + TypeScript + Tailwind frontend
- [x] Docker Compose for local services (PostgreSQL, Redis, Elasticsearch)
- [x] Authentication infrastructure (JWT + refresh tokens)
- [x] Authorization with membership tiers (Free / PaddockPass)
- [x] Caching infrastructure (Redis service, response caching)
- [x] Domain models (Series, Season, Round, Session, Circuit, Driver, Team, etc.)
- [x] Social models (Log, Review, Experience, UserList, UserFollow)
- [x] Frontend auth state management (Redux Toolkit)
- [x] Protected routes and membership gates
- [x] Python ingestion project structure
- [x] Unit and Integration tests (backend + frontend)
- [x] CI/CD pipeline (GitHub Actions)
- [x] Auth UI pages (Login, Register, Profile)
- [x] OpenF1 data sync implementation (Python ingestion pipeline)
- [x] Spoiler shield implementation (core feature, both backend and frontend)
  - [x] Backend: SpoilerShieldService, SessionDtos, SessionsController
  - [x] Frontend: spoilerSlice, useSpoilerShield hook, SpoilerMask/SpoilerBlur components
- [x] Bug: Fix Antonelli driver duplicate (added DriverNumber field as stable identifier, merged duplicates, updated ingestion to use driver numbers)
- [x] Entity normalization and alias tracking (Teams, Drivers, Circuits, Series)
  - [x] DriverAlias and TeamAlias database tables with EF Core migration
  - [x] SeriesAlias and CircuitAlias database tables with EF Core migration
  - [x] EntityResolver service with multi-strategy matching (driver number, slug, known alias, DB alias, fuzzy match)
  - [x] known_aliases.json config with F1 canonical names and historical aliases (drivers, teams, circuits, series)
  - [x] Repository updates for ID-first upsert logic to respect entity resolver decisions
  - [x] Comprehensive tests (33 entity resolver tests, 81 total Python tests passing)

### 🚧 In Progress


### 📋 Up Next
- [ ] Session discovery + detail pages (spoiler shield end-to-end; after this task users can browse sessions by series/season/round and view session details with results properly masked until logged)
- [ ] Driver discovery + detail pages (spoiler shield; profile, teams over time, seasons participated; includes tabular + statistical views)
- [ ] Team discovery + detail pages (spoiler shield; overview, seasons participated, drivers roster over time; includes tabular + statistical views)
- [ ] Circuit discovery + detail pages (spoiler-safe by default; circuit overview, location/map, sessions hosted by season/series, “Attended” venue aggregates when available; includes tabular + statistical views)
- [ ] Series hub pages (top-level entry point; series overview, supported seasons, quick links into season browser; establishes URL + navigation conventions for multi-series)
- [ ] Season browser + season detail pages (per-series; calendar/round list, filters by session type, progress indicators for “logged” vs “unlogged”; spoiler-safe aggregates only)
- [ ] Round (weekend) detail pages (per season; sessions timeline, circuit context, spoiler-safe status/metadata; acts as the primary “choose what to log” screen)
- [ ] Navigation header + IA refactor for multi-series (define primary nav: Series → Season → Round → Session; add persistent user menu + spoiler mode toggle; align structure with BLUEPRINT.md)
- [ ] "Log a Race" flow (core feature)
- [ ] Basic feed/home page with recent activity

---

## 🗓️ Phase 1: Shakedown (MVP)

**Goal:** F1 2024-2025 seasons, basic logging, user profiles

### Backend
- [ ] Complete auth endpoints (password reset, email verification)
- [ ] Sessions API with spoiler protection
- [ ] Logs API (CRUD for race logs)
- [ ] Reviews API (create, read, like)
- [ ] User profiles API
- [ ] Gravatar integration
- [ ] OpenF1 data sync (scheduled job)
- [ ] Seed 2024-2025 F1 calendar data
- [ ] WEC data integration (multi-series, multi-class and multi-driver support. This task requires the development of a custom scraper for https://fiawec.alkamelsystems.com/)
- [ ] Admin/Mod tools (basic user management, content moderation queue) + distinguished mod/admin roles that are separate from normal users and membership tiers with elevated permissions and their own badges

### Frontend
- [ ] Auth pages (Login, Register, Forgot Password)
- [ ] Navigation header with user menu
- [ ] Home feed (recent logs from followed users)
- [ ] Session browser (by season, by round)
- [ ] Session detail page (with spoiler shield)
- [ ] Log race modal/page
- [ ] User profile page
- [ ] User settings page (spoiler mode, preferences)
- [ ] Admin/Mod dashboard

### Infrastructure
- [ ] Production deployment setup
- [ ] Error tracking (Sentry or similar)
- [ ] Basic analytics

---

## 🗓️ Phase 2: Midfield

**Goal:** Historical archive, lists, social features

### Backend
- [ ] Historical F1 data import (1950-2023)
- [ ] Lists API (create, share, collaborate)
- [ ] Social feed algorithm
- [ ] Search API (Elasticsearch integration)
- [ ] Activity notifications

### Frontend
- [ ] Historical season browser
- [ ] Advanced search UI
- [ ] Lists feature (create, edit, share)
- [ ] Notifications center
- [ ] Enhanced user profiles (stats, badges)
- [ ] Mobile-responsive improvements

---

## 🗓️ Phase 3: Podium

**Goal:** Multi-series, venue guides, gamification, premium tier

### Backend
- [ ] MotoGP data integration
- [ ] IndyCar data integration
- [ ] Circuit/Venue guides API
- [ ] Gamification system (achievements, streaks)
- [ ] PaddockPass premium features
- [ ] Payment integration (Stripe)

### Frontend
- [ ] Multi-series navigation
- [ ] Circuit guide pages (crowdsourced seat views)
- [ ] Achievement system UI
- [ ] PaddockPass upgrade flow
- [ ] Advanced stats dashboards (premium)

### Mobile
- [ ] React Native app scaffold
- [ ] Core features parity
- [ ] Push notifications

---

## 🎯 Backlog (Unprioritized)

### Features
- [ ] OAuth providers (Discord, Apple)
- [ ] Import from other platforms
- [ ] Export user data
- [ ] Public API for third-party apps
- [ ] Browser extension for spoiler blocking
- [ ] Calendar sync (Google, Apple)
- [ ] Watch party coordination
- [ ] Prediction games
- [ ] Fantasy league integration

### Technical
- [ ] GraphQL API option
- [ ] WebSocket for live updates
- [ ] CDN for images
- [ ] Database read replicas
- [ ] Rate limiting
- [ ] API versioning strategy
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] A/B testing framework

### Content
- [ ] Editorial content system
- [ ] Community moderation tools
- [ ] Verified accounts for drivers/teams
- [ ] Official series partnerships

---

## 📝 Notes

### Key Decisions Made
1. **Spoiler Shield is non-negotiable** - All UIs hide results by default
2. **Watched vs Attended** - Separate rating systems for broadcast and venue
3. **Free tier is generous** - Historical data never gated
4. **Excitement != Quality** - Separate ratings for "how exciting" vs "how good"

### Open Questions
- How to handle live session updates without spoilers?
- Should lists be collaborative by default?
- PaddockPass pricing strategy?

### External Dependencies
- OpenF1 API reliability
- Community contribution model for non-F1 series
- Legal considerations for historical data

---

## 🔗 Quick Links

- [Product Blueprint](./docs/BLUEPRINT.md)
- [AI Coding Guidelines](./.github/copilot-instructions.md)
- [API Documentation](http://localhost:5000/swagger) (local dev)
