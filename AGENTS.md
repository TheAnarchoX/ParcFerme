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

## Docker / Development Environment

### Container Names (FIXED - DO NOT GUESS)
The docker-compose.yml defines these **fixed container names**. Never run `docker ps` to find them:

| Service       | Container Name        | Port  | Purpose                    |
|---------------|----------------------|-------|----------------------------|
| PostgreSQL    | `parcferme-db`       | 5432  | Primary database           |
| Redis         | `parcferme-cache`    | 6379  | Caching layer              |
| Elasticsearch | `parcferme-search`   | 9200  | Full-text search           |
| pgAdmin       | `parcferme-pgadmin`  | 5050  | DB admin UI (optional)     |

### Database Connection
```
Host: localhost (from host) or parcferme-db (from other containers)
Port: 5432
Database: parcferme
User: parcferme
Password: localdev
```

### Executing Database Commands

**⚠️ CRITICAL: Always run psql INSIDE the container, not on the host.**

```bash
# ✅ CORRECT - Run psql inside the container
docker exec -it parcferme-db psql -U parcferme -d parcferme

# ❌ WRONG - Don't run psql on host (may not be installed or wrong version)
psql -U parcferme -d parcferme

# ✅ CORRECT - One-liner query
docker exec -it parcferme-db psql -U parcferme -d parcferme -c "SELECT COUNT(*) FROM \"Drivers\";"

# ✅ CORRECT - Run a SQL file
docker exec -i parcferme-db psql -U parcferme -d parcferme < script.sql
```

### Makefile Commands
Use these instead of raw docker/dotnet commands:

| Command           | Purpose                                      |
|-------------------|----------------------------------------------|
| `make up`         | Start all Docker services                    |
| `make down`       | Stop all Docker services                     |
| `make api`        | Run .NET API with hot reload (port 5000)     |
| `make web`        | Run React frontend with hot reload (port 3000)|
| `make db-migrate` | Apply EF Core migrations                     |
| `make db-reset`   | Reset database (destroys all data)           |
| `make sync`       | Sync F1 data for current year                |
| `make sync-2024`  | Sync full 2024 F1 season                     |
| `make sync-2025`  | Sync full 2025 F1 season                     |

### Service Health Checks
```bash
# Check if services are healthy
docker compose ps

# View logs for a specific service
docker compose logs -f postgres
docker compose logs -f redis
```

### Data Sources
- **OpenF1 API**: Primary source for current F1 data (free, real-time). Use `meeting_key` to group sessions into Events. Cache aggressively—API may rate-limit or change.
- **Community Contribution**: MotoGP, IndyCar, WEC via "Wiki" model (no reliable APIs)

## Database Schema Reference

### Finding Model Definitions
All Entity Framework models are in `src/api/Models/`:
- **`EventModels.cs`** - Racing data: Series, Season, Round, Session, Circuit, Driver, Team, Entrant, Result
- **`SocialModels.cs`** - User content: Log, Review, Experience, UserList, UserFollow
- **`ApplicationUser.cs`** - User entity extending ASP.NET Identity

The DbContext is at `src/api/Data/ParcFermeDbContext.cs`.

### Table Names (PostgreSQL uses quoted PascalCase)
EF Core maps to these exact table names. **Always quote table names in raw SQL**:

```sql
-- ✅ CORRECT - Quoted table names
SELECT * FROM "Drivers" WHERE "Slug" = 'lewis-hamilton';
SELECT * FROM "Sessions" WHERE "OpenF1SessionKey" = 9574;

-- ❌ WRONG - Unquoted (PostgreSQL lowercases these)
SELECT * FROM Drivers;  -- Looks for table "drivers" which doesn't exist
```

### Core Tables & Key Columns

#### Event Cluster (Racing Data)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `"Series"` | `Id` (GUID), `Name`, `Slug`, `BrandColors` (jsonb) | F1, MotoGP, etc. |
| `"Seasons"` | `Id`, `SeriesId`, `Year` | Unique on (SeriesId, Year) |
| `"Rounds"` | `Id`, `SeasonId`, `CircuitId`, `Name`, `Slug`, `RoundNumber`, `OpenF1MeetingKey`, `ErgastRaceId` | Race weekend |
| `"Sessions"` | `Id`, `RoundId`, `Type` (enum), `StartTimeUtc`, `Status`, `OpenF1SessionKey` (unique) | FP1, Quali, Race |
| `"Circuits"` | `Id`, `Name`, `Slug`, `Location`, `Country`, `CountryCode`, `Latitude`, `Longitude` | |
| `"Drivers"` | `Id`, `FirstName`, `LastName`, `Slug`, `Abbreviation`, `Nationality`, `DriverNumber`, `OpenF1DriverNumber`, `DateOfBirth` | |
| `"Teams"` | `Id`, `Name`, `Slug`, `ShortName`, `PrimaryColor`, `Nationality` | |
| `"Entrants"` | `Id`, `RoundId`, `DriverId`, `TeamId`, `Role` (enum) | Driver-Team per round. Unique on (RoundId, DriverId) |
| `"Results"` | `Id`, `SessionId`, `EntrantId`, `Position`, `GridPosition`, `Status`, `Points`, `Time`, `FastestLap`, `Q1Time`, `Q2Time`, `Q3Time` | ⚠️ SPOILER DATA |

#### Social Cluster (User Content)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `"Logs"` | `Id`, `UserId`, `SessionId`, `StarRating`, `ExcitementRating`, `Liked`, `IsAttended`, `LoggedAt` | User's diary entry |
| `"Reviews"` | `Id`, `LogId`, `Body`, `ContainsSpoilers`, `Language` | Text review |
| `"Experiences"` | `Id`, `LogId`, `GrandstandId`, `VenueRating`, `ViewRating`, `AccessRating`, `FacilitiesRating` | Only when IsAttended=true |
| `"AspNetUsers"` | `Id`, `UserName`, `Email`, `DisplayName`, `SpoilerMode`, `MembershipTier` | Extended Identity user |

#### Alias Tables (for name variations)
| Table | Purpose |
|-------|---------|
| `"DriverAliases"` | Historical/alternate driver names |
| `"TeamAliases"` | Team rebrands, sponsor changes |
| `"CircuitAliases"` | Track name variations |
| `"SeriesAliases"` | Series rebrands |

### Common Column Gotchas

**⚠️ Column names are PascalCase, not snake_case:**
```sql
-- ✅ CORRECT
SELECT "FirstName", "LastName", "OpenF1DriverNumber" FROM "Drivers";

-- ❌ WRONG  
SELECT first_name, last_name, openf1_driver_number FROM drivers;
```

**Key external identifiers:**
- `OpenF1SessionKey` - Links Sessions to OpenF1 API (unique, nullable)
- `OpenF1MeetingKey` - Links Rounds to OpenF1 meetings
- `OpenF1DriverNumber` - Links Drivers to OpenF1 (different from `DriverNumber`)
- `ErgastRaceId` - Links Rounds to historical Ergast data

**Enum columns (stored as integers):**
- `Sessions.Type`: 0=FP1, 1=FP2, 2=FP3, 3=Qualifying, 4=SprintQualifying, 5=Sprint, 6=Race
- `Sessions.Status`: 0=Scheduled, 1=InProgress, 2=Completed, 3=Cancelled, 4=Delayed
- `Results.Status`: 0=Finished, 1=DNF, 2=DNS, 3=DSQ, 4=NC
- `Entrants.Role`: 0=Regular, 1=Reserve, 2=Fp1Only, 3=Test
- `AspNetUsers.SpoilerMode`: 0=Strict, 1=Moderate, 2=None

### Useful Queries for Debugging

```sql
-- Check what data exists
SELECT s."Name", COUNT(r."Id") as rounds 
FROM "Series" s 
LEFT JOIN "Seasons" se ON s."Id" = se."SeriesId"
LEFT JOIN "Rounds" r ON se."Id" = r."SeasonId"
GROUP BY s."Name";

-- Find a driver by name (case-insensitive)
SELECT * FROM "Drivers" WHERE LOWER("LastName") LIKE '%hamilton%';

-- Check sessions for a round
SELECT s."Type", s."Status", s."StartTimeUtc", s."OpenF1SessionKey"
FROM "Sessions" s
JOIN "Rounds" r ON s."RoundId" = r."Id"
WHERE r."Slug" = '2024-bahrain-grand-prix';

-- Results with driver/team info (common join pattern)
SELECT d."LastName", t."Name" as team, r."Position"
FROM "Results" r
JOIN "Entrants" e ON r."EntrantId" = e."Id"
JOIN "Drivers" d ON e."DriverId" = d."Id"
JOIN "Teams" t ON e."TeamId" = t."Id"
WHERE r."SessionId" = 'some-guid';
```

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

## AI-Assisted Development

### Custom VS Code Agents

This project uses specialized AI agents in `.github/agents/` for accelerated development. See [ROADMAP.md](./ROADMAP.md#-ai-agent-workflow) for the full workflow guide.

| Agent | File | Use For |
|-------|------|---------|
| **Planner** | `planner.agent.md` | Breaking down features, creating specs |
| **Backend** | `backend.agent.md` | .NET API, EF Core, caching, DTOs |
| **Frontend** | `frontend.agent.md` | React, Redux, Tailwind, TypeScript |
| **Data Engineer** | `data-engineer.agent.md` | Python ingestion, OpenF1 sync |
| **QA** | `qa.agent.md` | Unit/integration/E2E tests |
| **Reviewer** | `reviewer.agent.md` | Code review, pattern compliance |
| **Security** | `security.agent.md` | Security audits, auth review |
| **Spoiler Shield** | `spoiler-shield.agent.md` | Spoiler protection feature |

### Selecting an Agent

Tasks in ROADMAP.md are tagged with recommended agents:
- `[📋 plan]` → Start with `@planner`, then hand off
- `[🔧 backend]` → Use `@backend` 
- `[🎨 frontend]` → Use `@frontend`
- `[🐍 data]` → Use `@data-engineer`
- `[🧪 qa]` → Use `@qa`
- `[🔒 security]` → Use `@security`
- `[🏁 spoiler]` → Involve `@spoiler-shield`

**For multi-tagged tasks** (e.g., `[📋 plan]` `[🔧 backend]` `[🎨 frontend]`):
1. If `[📋 plan]` is present → Start with `@planner` to get implementation spec
2. Hand off to implementation agents (`@backend`, `@frontend`) for each part
3. Or use default Agent with the full prompt if you want one-shot execution

### Prompt-Based Workflow

Each task in ROADMAP.md includes a copy-paste prompt. To work on a task:
1. Find the task in ROADMAP.md
2. Copy the prompt from the `> **Prompt**: ` block
3. Paste into VS Code chat with the appropriate agent (or default Agent)
4. Commit changes, move task to COMPLETED.md when done

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
