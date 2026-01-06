# Bulk Sync Quick Reference

## Scrape Entire OpenF1 API

The bulk sync script can safely scrape all available F1 data from OpenF1 and can be run multiple times without issues.

### Common Commands

```bash
# Activate Python environment first
cd /home/lily/repositories/parcferme
source src/python/.venv/bin/activate

# Sync all reliable years (2023-present) - RECOMMENDED
python -m ingestion.bulk_sync --all

# Sync current season only
python -m ingestion.bulk_sync --current

# Sync specific years
python -m ingestion.bulk_sync --start-year 2023 --end-year 2024

# Faster sync without results (no spoiler data)
python -m ingestion.bulk_sync --all --no-results

# Be gentler on API (5 second pauses between years)
python -m ingestion.bulk_sync --all --pause 5
```

### What Gets Synced

For each year, the script fetches:
- ✅ All race meetings (weekends)
- ✅ All sessions (FP1, FP2, FP3, Qualifying, Sprint, Race)
- ✅ All drivers and their team assignments
- ✅ All teams
- ✅ Results (if `--no-results` not specified)

### Safety Features

**Idempotent**: Run as many times as you want
- Existing records are updated via upserts
- New records are inserted
- No duplicates, no errors

**Resilient**:
- Automatic retry on failures (default: 3 attempts per year)
- Exponential backoff for rate limiting
- Continues on errors, reports failed years at end

**Rate Limited**:
- Configurable pause between years (default: 2 seconds)
- Respects OpenF1 429 rate limit responses
- Health check before starting

### Expected Output

```
🏁 Starting bulk sync
  start_year=2023 end_year=2026 total_years=4

============================================================
📅 Processing year 2023 (1/4)
============================================================
[... progress logs ...]
✅ Successfully synced year 2023

Progress: 1/4 years processed (1 succeeded, 0 failed)
Pausing 2.0s before next year...

[... continues for each year ...]

======================================================================
🏁 BULK SYNC COMPLETE
======================================================================

📊 SUMMARY:
  Years attempted:    4
  ✅ Years succeeded:  4
  ❌ Years failed:     0

📈 TOTAL DATA SYNCED:
  Meetings:           100
  Sessions:           492
  Drivers:            2092
  Teams:              40
  Results:            15680

✅ All years synced successfully!
======================================================================
```

### Troubleshooting

**Rate limiting (429 errors)**:
```bash
# Increase pause between years
python -m ingestion.bulk_sync --all --pause 5
```

**Partial failures**:
```bash
# Script will show failed years at end:
⚠️  FAILED YEARS: 2022, 2021
   You can retry these individually with:
   python -m ingestion sync --year 2022
   python -m ingestion sync --year 2021
```

**Check what's in the database**:
```bash
docker compose exec postgres psql -U parcferme -d parcferme
```
```sql
-- Count records by year
SELECT s."Year", COUNT(*) 
FROM "Seasons" s 
JOIN "Rounds" r ON r."SeasonId" = s."Id"
GROUP BY s."Year" 
ORDER BY s."Year";
```

### Performance

Typical sync times (with 2s pause between years):
- Single year: ~30-60 seconds
- 2023-2026 (4 years): ~3-4 minutes
- With `--no-results`: ~50% faster

OpenF1 may rate limit (HTTP 429) - the client retries automatically with exponential backoff.
