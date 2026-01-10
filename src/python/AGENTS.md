# Parc Fermé - Python Data Ingestion Agent Instructions

## Project Context

This is the Python data ingestion pipeline for Parc Fermé. It fetches F1 data from OpenF1 API, normalizes it, and inserts it into the PostgreSQL database. This pipeline is critical for keeping race data current.

## Tech Stack

- **Python**: 3.11+
- **Database**: PostgreSQL via psycopg
- **HTTP**: httpx for async API calls
- **Package Management**: pip with pyproject.toml

## Project Structure

```
/ingestion
  __init__.py
  __main__.py       # CLI entry point
  bulk_sync.py      # Batch sync for full seasons
  clients/          # API clients (OpenF1, etc.)
  config.py         # Configuration and environment
  db.py             # Database utilities
  healthcheck.py    # Connection health checks
  models.py         # Domain models for ingestion
  repository.py     # Database operations
  sync.py           # Core sync logic
  verify.py         # Data verification
/tests              # Test files
```

## Critical Patterns

### Database Prerequisites
**Before running any sync**, ensure migrations are applied:
```bash
cd src/api && dotnet ef database update
```

Required unique indexes:
- `Sessions.OpenF1SessionKey` - unique
- `Entrants (RoundId, DriverId, TeamId)` - unique composite

### OpenF1 API Integration

The OpenF1 API is our primary data source. Key considerations:

1. **Rate Limiting**: API may return 429 errors during heavy use
2. **meeting_key**: Groups sessions into Events/Rounds
3. **session_key**: Unique identifier for each session
4. **Caching**: Cache responses aggressively

```python
# Pattern: OpenF1 session correlation
async def sync_sessions(year: int):
    meetings = await client.get_meetings(year=year)
    for meeting in meetings:
        sessions = await client.get_sessions(meeting_key=meeting['meeting_key'])
        # Group sessions by meeting_key to create Rounds
```

### Upsert Pattern
All data operations use upserts to handle re-sync gracefully:
```python
# Pattern: Upsert on OpenF1 keys
INSERT INTO sessions (...)
ON CONFLICT (open_f1_session_key) 
DO UPDATE SET ...
```

### Spoiler Data Handling
**Result data is SPOILER DATA.** When syncing:
- Results are stored but NOT exposed by default via API
- The `--no-results` flag skips result sync entirely
- Results should only be synced for historical data or post-race

```bash
# Safe sync (no spoilers)
python -m ingestion sync --year 2025 --no-results

# Full sync (includes results)
python -m ingestion sync --year 2024
```

### Entity Relationships

```
Meeting (from OpenF1)
  └── Session
       └── Result (SPOILER DATA)

Meeting → Round (our domain)
Session → Session (1:1 correlation via OpenF1SessionKey)
Driver + Team + Round → Entrant
```

## CLI Commands

```bash
# Sync current year
python -m ingestion sync

# Sync specific year
python -m ingestion sync --year 2024

# Sync recent (last N days)
python -m ingestion sync --recent 7

# Full sync without results (spoiler-safe)
python -m ingestion sync --year 2025 --no-results

# Bulk sync multiple years
python -m ingestion.bulk_sync --all

# Health check
python -m ingestion.healthcheck

# Data verification
python -m ingestion verify

# Clean racing data (preserves users)
python -m ingestion.db clean-racing

# Audit data quality
python -m ingestion.db audit
```

## Configuration

Environment variables (via `.env` or system):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/parcferme
OPENF1_BASE_URL=https://api.openf1.org/v1
```

## Error Handling

- **429 Rate Limit**: Automatic retry with backoff
- **Missing Data**: Log warning, continue sync
- **Duplicate Keys**: Handle via upsert (no error)

## Testing

```bash
cd src/python
.venv/bin/pytest
.venv/bin/pytest --cov=ingestion
```

## Common Issues

### "No meeting_key found"
OpenF1 sometimes has incomplete meeting data. Check the year/session exists on OpenF1 directly.

### "Unique constraint violation"
Run migrations to add unique indexes:
```bash
cd src/api && dotnet ef database update
```

### "Connection refused"
Ensure PostgreSQL is running:
```bash
make up  # From repo root
```

## File Naming Conventions

- Modules: `snake_case.py`
- Classes: `PascalCase`
- Functions/Variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`

## 🚨 Roadmap Hygiene (MANDATORY)

**ROADMAP.md is the single source of truth. COMPLETED.md is the historical archive.**

### NEVER Do This:
- ❌ Mark tasks `[x]` in place and leave them in ROADMAP.md
- ❌ Add "COMPLETED" text to tasks and leave them in the roadmap
- ❌ Use status markers like `[IN PROGRESS]` or `[COMPLETED]` inline

### ALWAYS Do This:

1. **Before starting work**: Move the task to the "🚧 In Progress" section in ROADMAP.md
2. **Upon completion**:
   - **REMOVE the task from ROADMAP.md entirely**
   - **ADD the task to COMPLETED.md** under the current date with:
     - What was synced/imported (years, series, records)
     - Data quality notes
   - **Commit both files together**: `chore: archive [feature] to COMPLETED.md`

### General Maintenance
- **ROADMAP.md**: Active and upcoming work ONLY - keep it lean
- **COMPLETED.md**: Historical archive with implementation details (most recent first)
- Flag items that are blocked or need clarification
- Consolidate duplicate or overlapping tasks

The roadmap is a living document—treat it as a source of truth for project status. COMPLETED.md is the historical record.

See root `AGENTS.md` for complete documentation.
