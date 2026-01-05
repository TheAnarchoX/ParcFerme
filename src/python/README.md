# Parc Fermé - Data Ingestion Pipeline

Python scripts for fetching and normalizing racing data from external sources.

## Setup

```bash
cd src/python
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
```

## Data Sources

### OpenF1 API
- **Docs**: https://openf1.org/
- **Usage**: Current season F1 data, real-time during race weekends
- **Key endpoints**:
  - `/sessions` - List sessions, filter by year/type
  - `/meetings` - Group sessions into race weekends via `meeting_key`
  - `/drivers` - Driver information
  - `/results` - ⚠️ SPOILER DATA - handle with care

### Ergast (Historical)
- **Status**: Deprecated end of 2024, but database dump available
- **Usage**: Import CSV/SQL for 1950-2023 historical data

## Running

```bash
# One-time historical import
python -m ingestion.import_ergast

# Weekly sync (run via cron)
python -m ingestion.sync_openf1

# Test connection
python -m ingestion.healthcheck
```

## Architecture

```
ingestion/
├── clients/        # API clients (OpenF1, etc.)
├── models/         # Pydantic models for validation
├── importers/      # Data import scripts
└── config.py       # Settings from environment
```
