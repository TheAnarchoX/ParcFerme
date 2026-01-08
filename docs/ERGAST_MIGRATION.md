# Ergast F1 Archive Migration Strategy

> Last updated: January 8, 2026

## Overview

This document outlines the strategy for importing historical F1 data (1950-2017) from the Ergast archive into the ParcFerme database. The Ergast dataset is loaded in a separate PostgreSQL database (`ergastf1`) and will be migrated into our main `parcferme` database.

## Data Analysis Summary

### Ergast Database Statistics

| Table | Row Count | Notes |
|-------|-----------|-------|
| `circuits` | 73 | All F1 circuits 1950-2017 |
| `constructors` | 208 | Teams/constructors |
| `drivers` | 840 | All drivers who participated |
| `seasons` | 68 | Years 1950-2017 |
| `races` | 976 | All race weekends |
| `results` | 23,657 | Race results (position, points, status) |
| `qualifying` | 7,397 | Qualifying results (from 1994) |
| `lapTimes` | 420,369 | Lap-by-lap times (from 1996) |
| `pitStops` | 6,070 | Pit stop data (from 2011) |
| `driverStandings` | 31,578 | Championship standings after each race |
| `constructorStandings` | 11,836 | Constructor standings after each race |
| `constructorResults` | 11,082 | Constructor points per race |
| `status` | 134 | Race finish statuses (Finished, DNF reasons, etc.) |

### Current ParcFerme Database

| Table | Row Count | Coverage |
|-------|-----------|----------|
| `Circuits` | 47 | Modern circuits (2023-2026) |
| `Drivers` | 42 | Recent/current drivers |
| `Teams` | 12 | Current teams |
| `Seasons` | 7 | 2020-2026 (F1 only) |
| `Rounds` | 102 | 2023-2026 rounds |
| `Sessions` | 491 | 2023-2026 sessions |
| `Results` | 96 | Partial 2023-2024 |

### Data Availability by Era

| Data Type | Available From | Notes |
|-----------|----------------|-------|
| Race Results | 1950 | Complete |
| Qualifying (Q1/Q2/Q3) | 1994 | Modern qualifying format |
| Lap Times | 1996 | Per-driver per-lap |
| Pit Stops | 2011 | Time, duration, lap |
| Driver/Constructor Standings | 1950 | After each race |

---

## Entity Mapping

### 1. Circuits (Ergast → ParcFerme)

**Strategy:** Upsert with alias creation for name variations.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `circuitId` | — | Not mapped (use internal GUID) |
| `circuitRef` | `Slug` | **Map directly** (e.g., `albert_park` → `albert-park`) |
| `name` | `Name` | **Map directly** |
| `location` | `Location` | **Map directly** |
| `country` | `Country` | **Map directly** |
| `lat` | `Latitude` | **Map directly** |
| `lng` | `Longitude` | **Map directly** |
| `alt` | `Altitude` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `Altitude` (int?) |
| `url` | `WikipediaUrl` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `WikipediaUrl` (string?) |

**Notes:**
- 73 circuits in Ergast, 25 canonical circuits in ParcFerme
- Create `CircuitAlias` entries for name variations
- Match existing circuits by slug similarity before creating new ones

### 2. Drivers (Ergast → ParcFerme)

**Strategy:** Upsert with alias creation. Historical drivers lack some modern fields.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `driverId` | — | Not mapped (use internal GUID) |
| `driverRef` | `Slug` | **Map directly** (e.g., `hamilton` → `hamilton`) |
| `number` | `DriverNumber` | **Map** (may be null for pre-2014 drivers) |
| `code` | `Abbreviation` | **Map directly** (e.g., `HAM`, `VET`) |
| `forename` | `FirstName` | **Map directly** |
| `surname` | `LastName` | **Map directly** |
| `dob` | `DateOfBirth` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `DateOfBirth` (DateOnly?) |
| `nationality` | `Nationality` | **Map directly** |
| `url` | `WikipediaUrl` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `WikipediaUrl` (string?) |

**Notes:**
- 840 drivers in Ergast, 42 current drivers in ParcFerme
- ~800 new historical drivers to create
- `driverRef` serves as stable identifier for matching
- Create `DriverAlias` for name variations (e.g., historical name spellings)

### 3. Teams/Constructors (Ergast → ParcFerme)

**Strategy:** Upsert with alias creation for historical team name variations.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `constructorId` | — | Not mapped (use internal GUID) |
| `constructorRef` | `Slug` | **Map directly** |
| `name` | `Name` | **Map directly** |
| `nationality` | `Nationality` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `Nationality` (string?) |
| `url` | `WikipediaUrl` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `WikipediaUrl` (string?) |

**Notes:**
- 208 constructors in Ergast, 12 current teams in ParcFerme
- Many historical constructors are defunct (Lotus, Brabham, Tyrrell, etc.)
- Create `TeamAlias` for rebrand history (e.g., Renault → Alpine, Toro Rosso → AlphaTauri → RB)

### 4. Seasons (Ergast → ParcFerme)

**Strategy:** Create missing seasons 1950-2019.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `year` | `Year` | **Map directly** |
| `url` | — | Not mapped (Wikipedia URL for season) |

**Notes:**
- 68 seasons in Ergast (1950-2017)
- ParcFerme has 2020-2026
- Create seasons 1950-2019 for F1 series

### 5. Rounds/Races (Ergast → ParcFerme)

**Strategy:** Create historical rounds. Ergast `races` table maps to ParcFerme `Rounds`.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `raceId` | `ErgastRaceId` | **⚠️ REQUIRES SCHEMA CHANGE** — Add for correlation |
| `year` | → `SeasonId` | Look up via Season.Year |
| `round` | `RoundNumber` | **Map directly** |
| `circuitId` | → `CircuitId` | Look up via Circuit match |
| `name` | `Name` | **Map directly** (e.g., "Australian Grand Prix") |
| `date` | `DateStart`, `DateEnd` | **Map** (same date for historical) |
| `time` | → Session.StartTimeUtc | Use for Race session |
| `url` | `WikipediaUrl` | **⚠️ REQUIRES SCHEMA CHANGE** — Add `WikipediaUrl` (string?) |

**Notes:**
- Ergast `races` = our `Rounds` (race weekends)
- Generate `Slug` from name (e.g., `australian-grand-prix`)
- Historical rounds are single-day events; modern ones span 3 days

### 6. Sessions (Derived from Ergast)

**Strategy:** Create Sessions from Ergast race data. Ergast doesn't have separate FP/Quali sessions pre-modern era.

| Data Source | Session Creation | Notes |
|-------------|------------------|-------|
| `races.time` | Race Session | Create one `Race` session per race |
| `qualifying` table exists | Qualifying Session | Create if qualifying data exists |

**Notes:**
- For 1950-1993: Create only Race session (no qualifying data)
- For 1994+: Create Race + Qualifying sessions (qualifying data available)
- FP sessions not available in Ergast (only modern OpenF1 has these)

### 7. Results (Ergast → ParcFerme)

**Strategy:** Import race results. This is the largest and most valuable dataset.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `resultId` | — | Not mapped |
| `raceId` | → `SessionId` | Look up via Round → Race Session |
| `driverId` | → `EntrantId` | Look up/create Entrant |
| `constructorId` | → `EntrantId` | Part of Entrant lookup |
| `number` | — | Stored on Entrant (car number for that race) |
| `grid` | `GridPosition` | **Map directly** |
| `position` | `Position` | **Map directly** (null if DNF) |
| `positionText` | — | Not needed (derive from Position) |
| `positionOrder` | — | Not needed (use Position) |
| `points` | `Points` | **Map directly** |
| `laps` | `Laps` | **Map directly** |
| `time` | `Time` | **Map** (parse to TimeSpan) |
| `milliseconds` | `TimeMilliseconds` | **⚠️ REQUIRES SCHEMA CHANGE** — Add for precision |
| `fastestLap` | `FastestLapNumber` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (int?) |
| `rank` | `FastestLapRank` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (int?) |
| `fastestLapTime` | `FastestLapTime` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (string?) |
| `fastestLapSpeed` | `FastestLapSpeed` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (string?) |
| `statusId` | `Status` + `StatusDetail` | **Map** status to enum + store detail |

### 8. Entrants (Derived from Ergast Results)

**Strategy:** Create Entrant records linking Driver + Team for each Round.

| Ergast Source | ParcFerme Column | Action |
|---------------|------------------|--------|
| `results.raceId` | → `RoundId` | Via Round lookup |
| `results.driverId` | → `DriverId` | Via Driver lookup |
| `results.constructorId` | → `TeamId` | Via Team lookup |
| `results.number` | `CarNumber` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (int?) |

### 9. Qualifying Results (Ergast → ParcFerme)

**Strategy:** Import as Results for Qualifying sessions.

| Ergast Column | ParcFerme Column | Action |
|---------------|------------------|--------|
| `qualifyId` | — | Not mapped |
| `raceId` | → `SessionId` | Via Round → Qualifying Session |
| `driverId` | → `EntrantId` | Via Driver lookup |
| `constructorId` | → `EntrantId` | Via Team lookup |
| `number` | — | On Entrant |
| `position` | `Position` | **Map directly** |
| `q1` | `Q1Time` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (string?) |
| `q2` | `Q2Time` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (string?) |
| `q3` | `Q3Time` | **⚠️ REQUIRES SCHEMA CHANGE** — Add (string?) |

### 10. Status Codes (Ergast → ParcFerme)

**Strategy:** Map to our `ResultStatus` enum + new `StatusDetail` field.

| Ergast statusId | Ergast status | ParcFerme ResultStatus | StatusDetail |
|-----------------|---------------|------------------------|--------------|
| 1 | Finished | `Finished` | null |
| 2 | Disqualified | `DSQ` | "Disqualified" |
| 3-10, 20-136 | Various DNF | `DNF` | Store original status text |
| 11-19, 45, 50, etc. | +N Laps | `Finished` | Store laps down |
| 54 | Withdrew | `DNS` | "Withdrew" |
| 62 | Not classified | `NC` | "Not classified" |
| 77 | 107% Rule | `DNS` | "107% Rule" |
| 81 | Did not qualify | `DNS` | "Did not qualify" |
| 97 | Did not prequalify | `DNS` | "Did not prequalify" |

---

## Schema Changes Required

### Circuit Model Additions
```csharp
public int? Altitude { get; set; }        // meters above sea level
public string? WikipediaUrl { get; set; } // external reference
```

### Driver Model Additions
```csharp
public DateOnly? DateOfBirth { get; set; }
public string? WikipediaUrl { get; set; }
```

### Team Model Additions
```csharp
public string? Nationality { get; set; }
public string? WikipediaUrl { get; set; }
```

### Round Model Additions
```csharp
public int? ErgastRaceId { get; set; }    // for correlation during import
public string? WikipediaUrl { get; set; }
```

### Entrant Model Additions
```csharp
public int? CarNumber { get; set; }        // race number for that weekend
```

### Result Model Additions
```csharp
public int? TimeMilliseconds { get; set; }   // precise timing
public int? FastestLapNumber { get; set; }   // which lap was fastest
public int? FastestLapRank { get; set; }     // rank among all fastest laps
public string? FastestLapTime { get; set; }  // e.g., "1:27.452"
public string? FastestLapSpeed { get; set; } // e.g., "218.300" km/h
public string? StatusDetail { get; set; }    // detailed status text (e.g., "Engine", "Collision")

// For qualifying results:
public string? Q1Time { get; set; }
public string? Q2Time { get; set; }
public string? Q3Time { get; set; }
```

---

## Data NOT Being Imported (Deferred)

### Lap Times (`lapTimes`)
- **Rows:** 420,369
- **Reason:** Large volume, specialized use case
- **Future:** Consider separate `LapTime` entity if needed for analytics

### Pit Stops (`pitStops`)
- **Rows:** 6,070
- **Reason:** Specialized data, only from 2011
- **Future:** Consider `PitStop` entity for race analysis features

### Championship Standings (`driverStandings`, `constructorStandings`)
- **Rows:** 31,578 + 11,836
- **Reason:** Can be calculated from results
- **Future:** Implement standings calculation module in backend

### Constructor Results (`constructorResults`)
- **Rows:** 11,082
- **Reason:** Aggregatable from driver results
- **Future:** Calculate dynamically or cache

### Target Table (`target`)
- **Rows:** Unknown purpose
- **Reason:** Appears to be Ergast-internal data

---

## Migration Phases

### Phase 1: Schema Migration
1. Create EF Core migration for new columns
2. Run migration against development database
3. Verify no breaking changes to existing functionality

### Phase 2: Reference Data Import
1. Import Circuits (with alias creation)
2. Import Drivers (with alias creation)
3. Import Teams/Constructors (with alias creation)
4. Create Seasons 1950-2019 for F1 Series

### Phase 3: Event Data Import
1. Import Rounds (races) with circuit linking
2. Create Sessions (Race + Qualifying where data exists)

### Phase 4: Results Import
1. Create Entrants (driver-team-round links)
2. Import Race Results (largest dataset)
3. Import Qualifying Results (where available)

### Phase 5: Validation
1. Verify row counts match expectations
2. Spot-check famous races (1950 British GP, 1994 San Marino, 2008 Brazil, etc.)
3. Verify championship points totals

---

## Implementation Notes

### Import Script Location
Create Python script: `src/python/ingestion/ergast_import.py`

### Safety Measures
- Use `--dry-run` mode for testing
- Import in year batches with `--year` flag
- Transaction per year to allow rollback
- Progress logging with counts

### ID Correlation
- Store `ErgastRaceId` on Round for debugging
- Consider temporary mapping table for import process
- Log mapping decisions for audit trail

### Performance Considerations
- Bulk insert for large tables (Results, Entrants)
- Create indexes after bulk import
- Consider disabling triggers during import

---

## Acceptance Criteria

- [ ] All 68 seasons (1950-2017) created in F1 Series
- [ ] All 976 rounds imported with correct circuits
- [ ] All 23,657 race results imported
- [ ] All 7,397 qualifying results imported (1994+)
- [ ] All circuits matched or created with aliases
- [ ] All drivers matched or created with aliases
- [ ] All teams matched or created with aliases
- [ ] Status codes correctly mapped to ResultStatus enum
- [ ] Spoiler Shield still functions correctly
- [ ] No data loss in existing 2023-2026 data

---

## References

- [Ergast Developer API](http://ergast.com/mrd/) - Original API documentation
- [ERGAST_DDL.md](./ERGAST_DDL.md) - Database schema
- [BLUEPRINT.md](./BLUEPRINT.md) - Product specification
- [BULK_SYNC.md](./BULK_SYNC.md) - OpenF1 sync documentation
