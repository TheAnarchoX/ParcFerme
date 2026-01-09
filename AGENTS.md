# Parc Fermé - AI Coding Instructions

## Project Overview

Parc Fermé is a "Letterboxd for motorsport" - a social cataloging platform for racing fans to log, rate, and review races they've watched or attended. The key differentiator is the **"Watched" vs. "Attended" duality**: users can rate both the broadcast experience AND the live venue experience separately.

## Architecture

### Tech Stack
- **Backend**: .NET 10 (ASP.NET Core) with Entity Framework Core
- **Auth**: ASP.NET Core Identity with JWT + OAuth2 (Google/Discord initially)
- **Database**: PostgreSQL with Redis caching
- **Frontend**: React 18 + TypeScript + Redux Toolkit + Tailwind CSS
- **Mobile**: React Native (planned)
- **Search**: Elasticsearch

### Monorepo Structure
```
/src
    /api          # ASP.NET Core backend
    /web          # React frontend
    /mobile       # React Native app
    /python       # Python utilities and scripts
        /ingestion  # Data pipeline scripts
/docs
  BLUEPRINT.md  # Full product specification
```

### Data Sources
- **OpenF1 API**: Primary source for current F1 data (free, real-time). Use `meeting_key` to group sessions into Events. Cache aggressively—API may rate-limit or change.
- **Community Contribution**: MotoGP, IndyCar, WEC via "Wiki" model (no reliable APIs)

## API Design Conventions

### Versioning & Typing
- Use URL path versioning: `/api/v1/`, `/api/v2/`
- **Strict typing required** on all request/response DTOs—no `dynamic` or `object` types
- Use records for immutable DTOs: `public record RaceDto(int Id, string Name, ...)`

### Spoiler-Aware Endpoints
All endpoints must respect user's `spoiler_mode` preference:
```csharp
// Pattern: Conditional result serialization
if (user.Logs.Any(l => l.SessionId == sessionId))
    return FullResultDto(result);
else
    return MaskedResultDto(result); // winner: null, status: "completed"
```

### Key Endpoints
- `/api/v1/sessions/{id}` - returns masked data unless user has logged it
- `/api/v1/circuits/{id}/reviews` - venue rating aggregates for Circuit Guides

## Critical Design Patterns

### The "Spoiler Shield" Protocol
**Non-negotiable.** All APIs and UIs must hide race results by default.
- Default `spoiler_mode`: "Strict" (hide everything)
- Images: Generic circuit maps only, never winner celebration photos
- Push notifications: "Australian GP finished. Rate it now!" (never "Hamilton wins!")

### The "Watched" vs. "Attended" Split
Every `Log` entry tracks `is_attended` boolean. Attended logs include:
- `seat_location` (grandstand dropdown)
- `view_rating`, `access_rating`, `facilities_rating` (1-5 each)
- `view_photo_url` (crowdsourced seat view database)

### Multi-Series Schema
Support F1, MotoGP, IndyCar, WEC without refactoring:
- `Entrant` links `driver_id` + `team_id` to specific `round_id`
- WEC: `Car` (e.g., #51) with multiple linked drivers
- Session types: `FP1`, `FP2`, `FP3`, `Quali`, `Sprint`, `Race`

### Domain Model
```
Series → Season → Round (Weekend) → Session
                      ↓
                  Circuit

User → Log → Review
         ↓
     Experience (venue data if attended)
```

## Key Business Rules

1. **Never gate historical data** - all race history free (unlike BoxBoxd)
2. **Excitement Rating** (0-10) separate from Star Rating (0.5-5.0) - excitement is spoiler-safe
3. **Spoiler Toggle on Reviews** - auto-checked if race <7 days old
4. **Venue ratings aggregate to Circuit Guides** - crowdsourced seat views

## Testing Priorities

- Spoiler logic: result visibility based on user log state
- Dual rating system: broadcast rating vs. venue rating
- Mock OpenF1 responses for CI
- WEC edge cases: multi-driver cars

## Ingestion / OpenF1 Sync

- Before running `python -m ingestion sync`, ensure the DB has the unique indexes expected by the ingest upserts: `Sessions.OpenF1SessionKey` unique and `Entrants (RoundId, DriverId, TeamId)` unique. Apply the migration `20260106195000_AddUniqueIndexesForIngestion` (e.g., `cd src/api && dotnet ef database update`) first.
- OpenF1 may rate-limit (429). The client retries automatically; if you see repeated 429s during a bulk year sync, add a small per-meeting pause or retry the command.

## Development Phases

1. **Shakedown** (MVP): F1 only, 2024-2025, basic logging + profiles
2. **Midfield**: Historical archive (1950-2023), Lists, Social Feed
3. **Podium**: Multi-series, Venue Guides, Gamification, Pro tier

## Git Workflow

### Commit Discipline
**Commit work between tasks/todos.** After completing each discrete task or todo item:
1. Stage relevant files with `git add`
2. Commit with a clear, descriptive message following conventional commits format
3. Examples:
   - `feat: add spoiler-aware session endpoint`
   - `fix: correct dual rating calculation for attended logs`
   - `refactor: extract OpenF1 cache logic to service`
   - `test: add WEC multi-driver entrant tests`

This ensures:
- Reviewable, atomic changes that can be easily understood and reverted if needed
- Clear history that tracks progress through multi-step tasks
- Safe checkpoints during complex refactoring or feature development

## Roadmap Hygiene

**Keep ROADMAP.md and COMPLETED.md in sync with actual work.**

### File Organization
- **ROADMAP.md**: Active and upcoming work only (current sprint, next priorities, future phases)
- **COMPLETED.md**: Historical archive of all finished tasks with implementation details

### When Getting A Task That is Not on the Roadmap
1. **Add it to the Roadmap first**: Before starting work on any new task or feature not already listed:
   - Create a new entry in the appropriate section of ROADMAP.md
   - Provide a clear description, acceptance criteria, and any relevant context
   - Assign priority level within the "Up Next" section or appropriate phase
   - Commit the updated roadmap before beginning implementation

### When Picking Up a Task

1. **Evaluate the task description first**: Before starting any work, critically review the task as written:
   - Is the scope clear and well-defined?
   - Are the acceptance criteria obvious?
   - Does the description match current codebase state?
   - Are there outdated assumptions or references?
   - Would a new developer understand what needs to be done?

2. **Rewrite if needed**: If the task description is unclear, outdated, or incomplete:
   - Update the description to reflect current understanding
   - Add specific deliverables or acceptance criteria
   - Remove outdated context or references
   - Break down vague tasks into concrete sub-tasks
   - Commit the roadmap update before starting implementation

3. **Move to In Progress**: Move the item to the "🚧 In Progress" section in ROADMAP.md

### During Work

Update the task status in ROADMAP.md as you progress. Mark the checkbox `[x]` when complete.

### Upon Completion

1. **Move to COMPLETED.md**: Once a task is fully implemented and tested:
   - Move the completed item from ROADMAP.md to COMPLETED.md
   - Add it under the appropriate date/section in COMPLETED.md (most recent first)
   - Include implementation summary with the completed task:
     - What was actually built/changed
     - Key files or commands added
     - Any deviations from original plan
     - Gotchas or lessons learned for future reference
   
   Example:
   ```markdown
   ### Discovery Pages Enhancement (Completed: Jan 9, 2026)
   - [x] **Unified FilterBar component** with search, sort, and filter controls
   - [x] **Server-side search** across all discovery pages (drivers, teams, circuits)
   - [x] **Enhanced filters**: nationality for drivers/teams, region for circuits, active status for drivers
   - [x] **Active filter badges** with clear buttons
   - [x] **SVG placeholder refinement** for entities without images
   ```

2. **Commit both files together**: When moving completed work to the archive:
   - Stage both ROADMAP.md and COMPLETED.md
   - Use commit message format: `chore: archive completed work to COMPLETED.md`
   - Include brief description of what was completed

### General Maintenance
- **ROADMAP.md**: Keep lean and focused on active/upcoming work only
- **COMPLETED.md**: Organize by date (most recent first), include implementation details
- Flag items that are blocked or need clarification
- Consolidate duplicate or overlapping tasks
- Ensure priority ordering makes sense from engineering and product perspectives

The roadmap is a living document—treat it as a source of truth for project status. COMPLETED.md is the historical record.
