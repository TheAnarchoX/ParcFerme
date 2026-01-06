# Parc Fermé - Data Ingestion Pipeline

Python scripts for fetching and normalizing racing data from external sources.

## Setup

```bash
cd src/python
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
```

## Database Prerequisites

Before running any sync, ensure the database has the required unique indexes:

```bash
cd src/api
dotnet ef database update
```

This applies the `AddUniqueIndexesForIngestion` migration which creates:
- Unique index on `Sessions.OpenF1SessionKey`
- Unique index on `Entrants (RoundId, DriverId)`

These are required for the upsert operations to work correctly.

## Data Sources

### OpenF1 API
- **Docs**: https://openf1.org/
- **Usage**: Current season F1 data, real-time during race weekends
- **Reliable data**: 2023-present
- **Historical data**: Varies by year, some gaps expected pre-2023
- **Key endpoints**:
  - `/sessions` - List sessions, filter by year/type
  - `/meetings` - Group sessions into race weekends via `meeting_key`
  - `/drivers` - Driver information
  - `/results` - ⚠️ SPOILER DATA - handle with care

### Ergast (Historical)
- **Status**: Deprecated end of 2024, but database dump available
- **Usage**: Import CSV/SQL for 1950-2023 historical data

## Running

### Single Year Sync

```bash
# Sync specific year
python -m ingestion sync --year 2024

# Sync recent meetings (last 7 days)
python -m ingestion sync --recent 7

# Sync without results (no spoilers, faster)
python -m ingestion sync --year 2024 --no-results

# Test connection
python -m ingestion healthcheck
```

### Bulk Sync (Entire API)

The bulk sync script is **idempotent** - you can run it multiple times safely without data corruption. It uses upserts to update existing records and insert new ones.

```bash
# Sync all reliable years (2023-present)
python -m ingestion.bulk_sync --all

# Sync current season only
python -m ingestion.bulk_sync --current

# Sync specific year range
python -m ingestion.bulk_sync --start-year 2023 --end-year 2024

# Sync without results (faster, no spoilers)
python -m ingestion.bulk_sync --all --no-results

# Custom pause between years for rate limiting (default 2s)
python -m ingestion.bulk_sync --all --pause 5

# Adjust max retries per year (default 3)
python -m ingestion.bulk_sync --all --max-retries 5
```

**Bulk Sync Features:**
- ✅ **Idempotent**: Run multiple times without duplicates or errors
- ✅ **Retry logic**: Automatic retry with exponential backoff on failures
- ✅ **Rate limiting**: Configurable pauses between years to respect API limits
- ✅ **Progress tracking**: Real-time progress and comprehensive summary
- ✅ **Partial recovery**: Continues on errors, reports failed years at end
- ✅ **API health check**: Validates OpenF1 API accessibility before starting

## Architecture

```
ingestion/
├── __main__.py         # CLI entry point for single year sync
├── bulk_sync.py        # Bulk scraper for entire API
├── sync.py             # Sync orchestration logic
├── repository.py       # Database operations with upserts
├── models.py           # Pydantic models for validation
├── config.py           # Settings from environment
├── healthcheck.py      # API and DB health checks
├── clients/
│   └── openf1.py      # OpenF1 API client with retry logic
└── tests/             # Unit tests
```

## Testing

```bash
pytest
pytest -v                    # Verbose
pytest tests/test_sync.py    # Specific file
```
