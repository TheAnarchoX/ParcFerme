"""
Seed F1 2026 calendar data from ICS file.

Parses the RacingNews365 Dutch calendar ICS file, translates to English,
removes branding references, and seeds the database with rounds and sessions.

Usage:
    cd src/python
    python -m ingestion.seed_f1_2026
"""

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

import structlog  # type: ignore

from ingestion.models import Circuit, Round, Season, Series, Session, SessionStatus, SessionType, slugify
from ingestion.repository import RacingRepository

logger = structlog.get_logger()

# =========================
# Translation Maps
# =========================

# Dutch GP names to English
GP_NAME_TRANSLATIONS = {
    "Australië": "Australian Grand Prix",
    "China": "Chinese Grand Prix",
    "Japan": "Japanese Grand Prix",
    "Bahrein": "Bahrain Grand Prix",
    "Saoedi-Arabië": "Saudi Arabian Grand Prix",
    "Miami": "Miami Grand Prix",
    "Canada": "Canadian Grand Prix",
    "Monaco": "Monaco Grand Prix",
    "Barcelona": "Spanish Grand Prix",
    "Oostenrijk": "Austrian Grand Prix",
    "Groot-Brittannië": "British Grand Prix",
    "België": "Belgian Grand Prix",
    "Hongarije": "Hungarian Grand Prix",
    "Nederland": "Dutch Grand Prix",
    "Italië": "Italian Grand Prix",
    "Spanje": "Madrid Grand Prix",  # Madrid race (new circuit for 2026)
    "Azerbeidzjan": "Azerbaijan Grand Prix",
    "Singapore": "Singapore Grand Prix",
    "Verenigde Staten": "United States Grand Prix",
    "Mexico": "Mexican Grand Prix",
    "Brazilië": "Brazilian Grand Prix",
    "Las Vegas": "Las Vegas Grand Prix",
    "Qatar": "Qatar Grand Prix",
    "Abu Dhabi": "Abu Dhabi Grand Prix",
}

# Session type translations (Dutch to English)
SESSION_TYPE_TRANSLATIONS = {
    "Eerste vrije training": SessionType.FP1,
    "Tweede vrije training": SessionType.FP2,
    "Derde vrije training": SessionType.FP3,
    "Kwalificatie": SessionType.QUALIFYING,
    "Sprintkwalificatie": SessionType.SPRINT_QUALIFYING,
    "Sprintrace": SessionType.SPRINT,
    "Race": SessionType.RACE,
}

# Circuit location normalizations
CIRCUIT_INFO = {
    "Albert Park": {
        "name": "Albert Park Circuit",
        "location": "Melbourne",
        "country": "Australia",
        "country_code": "AU",
    },
    "Shanghai International Circuit": {
        "name": "Shanghai International Circuit",
        "location": "Shanghai",
        "country": "China",
        "country_code": "CN",
    },
    "Suzuka Circuit": {
        "name": "Suzuka International Racing Course",
        "location": "Suzuka",
        "country": "Japan",
        "country_code": "JP",
    },
    "Bahrain International Circuit": {
        "name": "Bahrain International Circuit",
        "location": "Sakhir",
        "country": "Bahrain",
        "country_code": "BH",
    },
    "Jeddah Street Circuit": {
        "name": "Jeddah Corniche Circuit",
        "location": "Jeddah",
        "country": "Saudi Arabia",
        "country_code": "SA",
    },
    "Miami International Autodrome": {
        "name": "Miami International Autodrome",
        "location": "Miami",
        "country": "United States",
        "country_code": "US",
    },
    "Circuit Gilles Villeneuve": {
        "name": "Circuit Gilles Villeneuve",
        "location": "Montreal",
        "country": "Canada",
        "country_code": "CA",
    },
    "Circuit de Monaco": {
        "name": "Circuit de Monaco",
        "location": "Monte Carlo",
        "country": "Monaco",
        "country_code": "MC",
    },
    "Circuit de Barcelona-Catalunya": {
        "name": "Circuit de Barcelona-Catalunya",
        "location": "Barcelona",
        "country": "Spain",
        "country_code": "ES",
    },
    "Red Bull Ring": {
        "name": "Red Bull Ring",
        "location": "Spielberg",
        "country": "Austria",
        "country_code": "AT",
    },
    "Silverstone": {
        "name": "Silverstone Circuit",
        "location": "Silverstone",
        "country": "United Kingdom",
        "country_code": "GB",
    },
    "Spa-Francorchamps": {
        "name": "Circuit de Spa-Francorchamps",
        "location": "Stavelot",
        "country": "Belgium",
        "country_code": "BE",
    },
    "Hungaroring": {
        "name": "Hungaroring",
        "location": "Mogyoród",
        "country": "Hungary",
        "country_code": "HU",
    },
    "Circuit Zandvoort": {
        "name": "Circuit Zandvoort",
        "location": "Zandvoort",
        "country": "Netherlands",
        "country_code": "NL",
    },
    "Autodromo Nazionale Monza": {
        "name": "Autodromo Nazionale Monza",
        "location": "Monza",
        "country": "Italy",
        "country_code": "IT",
    },
    "Circuito de Madring": {
        "name": "Circuito de Madrid",
        "location": "Madrid",
        "country": "Spain",
        "country_code": "ES",
    },
    "Baku City Circuit": {
        "name": "Baku City Circuit",
        "location": "Baku",
        "country": "Azerbaijan",
        "country_code": "AZ",
    },
    "Marina Bay Street Circuit": {
        "name": "Marina Bay Street Circuit",
        "location": "Singapore",
        "country": "Singapore",
        "country_code": "SG",
    },
    "Circuit of the Americas": {
        "name": "Circuit of the Americas",
        "location": "Austin",
        "country": "United States",
        "country_code": "US",
    },
    "Autodromo Hermanos Rodriguez": {
        "name": "Autódromo Hermanos Rodríguez",
        "location": "Mexico City",
        "country": "Mexico",
        "country_code": "MX",
    },
    "Autodromo Jose Carlos Pace Interlagos": {
        "name": "Autódromo José Carlos Pace",
        "location": "São Paulo",
        "country": "Brazil",
        "country_code": "BR",
    },
    "Las Vegas Street Circuit": {
        "name": "Las Vegas Strip Circuit",
        "location": "Las Vegas",
        "country": "United States",
        "country_code": "US",
    },
    "Lusail International Circuit": {
        "name": "Lusail International Circuit",
        "location": "Lusail",
        "country": "Qatar",
        "country_code": "QA",
    },
    "Yas Marina Circuit": {
        "name": "Yas Marina Circuit",
        "location": "Abu Dhabi",
        "country": "United Arab Emirates",
        "country_code": "AE",
    },
}


@dataclass
class IcsEvent:
    """Parsed ICS event."""
    uid: str
    start: datetime
    end: datetime
    summary: str
    location: str


@dataclass  
class ParsedSession:
    """Parsed and translated session."""
    gp_name: str  # English GP name
    session_type: SessionType
    start_utc: datetime
    end_utc: datetime
    circuit_key: str  # Key into CIRCUIT_INFO


def parse_ics_file(ics_path: Path) -> list[IcsEvent]:
    """Parse ICS file and extract events."""
    content = ics_path.read_text()
    events: list[IcsEvent] = []
    
    # Split by VEVENT blocks
    event_blocks = re.findall(r'BEGIN:VEVENT.*?END:VEVENT', content, re.DOTALL)
    
    for block in event_blocks:
        # Extract fields
        uid_match = re.search(r'UID:(.+?)(?:\r?\n)', block)
        summary_match = re.search(r'SUMMARY:(.+?)(?:\r?\n)', block)
        location_match = re.search(r'LOCATION:(.+?)(?:\r?\n)', block)
        dtstart_match = re.search(r'DTSTART;TZID=Europe/Amsterdam:(\d{8}T\d{6})', block)
        dtend_match = re.search(r'DTEND;TZID=Europe/Amsterdam:(\d{8}T\d{6})', block)
        
        if not all([uid_match, summary_match, location_match, dtstart_match, dtend_match]):
            continue
            
        uid = uid_match.group(1).strip()  # type: ignore
        summary = summary_match.group(1).strip()  # type: ignore
        location = location_match.group(1).strip().replace('\\,', ',')  # type: ignore
        
        # Parse dates (Amsterdam timezone = CET/CEST)
        # Convert to UTC for storage
        start_str = dtstart_match.group(1)  # type: ignore
        end_str = dtend_match.group(1)  # type: ignore
        
        start_local = datetime.strptime(start_str, '%Y%m%dT%H%M%S')
        end_local = datetime.strptime(end_str, '%Y%m%dT%H%M%S')
        
        # Approximate UTC conversion (Amsterdam is +1 in winter, +2 in summer)
        # For 2026 dates, DST is roughly Mar 29 - Oct 25
        def to_utc(dt: datetime) -> datetime:
            # Simple DST check for 2026
            if dt.month >= 4 and dt.month <= 10:
                offset_hours = 2  # CEST
            elif dt.month == 3 and dt.day >= 29:
                offset_hours = 2  # CEST
            elif dt.month == 10 and dt.day < 25:
                offset_hours = 2  # CEST
            else:
                offset_hours = 1  # CET
            return dt.replace(tzinfo=timezone.utc) - timedelta(hours=offset_hours)
        
        events.append(IcsEvent(
            uid=uid,
            start=to_utc(start_local),
            end=to_utc(end_local),
            summary=summary,
            location=location,
        ))
    
    return events


def translate_event(event: IcsEvent) -> ParsedSession | None:
    """Translate a Dutch ICS event to English session data."""
    summary = event.summary
    
    # Remove RN365 prefix
    if summary.startswith('RN365 '):
        summary = summary[6:]
    
    # Split into GP name and session type
    # Format: "GPName - SessionType" (e.g., "Australië - Eerste vrije training")
    parts = summary.split(' - ', 1)
    if len(parts) != 2:
        logger.warning("Could not parse summary", summary=event.summary)
        return None
    
    gp_dutch, session_dutch = parts
    
    # Translate GP name
    gp_name = GP_NAME_TRANSLATIONS.get(gp_dutch)
    if not gp_name:
        logger.warning("Unknown GP name", gp_dutch=gp_dutch)
        return None
    
    # Translate session type
    session_type = SESSION_TYPE_TRANSLATIONS.get(session_dutch)
    if session_type is None:
        logger.warning("Unknown session type", session_dutch=session_dutch)
        return None
    
    # Extract circuit key from location
    # Location format: "CircuitName, city"
    circuit_key = event.location.split(',')[0].strip()
    
    return ParsedSession(
        gp_name=gp_name,
        session_type=session_type,
        start_utc=event.start,
        end_utc=event.end,
        circuit_key=circuit_key,
    )


def group_sessions_by_round(sessions: list[ParsedSession]) -> dict[str, list[ParsedSession]]:
    """Group sessions by GP (round)."""
    rounds: dict[str, list[ParsedSession]] = {}
    for session in sessions:
        if session.gp_name not in rounds:
            rounds[session.gp_name] = []
        rounds[session.gp_name].append(session)
    
    # Sort sessions within each round by start time
    for gp_sessions in rounds.values():
        gp_sessions.sort(key=lambda s: s.start_utc)
    
    return rounds


def seed_2026_calendar(ics_path: Path, dry_run: bool = False) -> None:
    """Seed the 2026 F1 calendar from ICS file.
    
    Args:
        ics_path: Path to the ICS calendar file
        dry_run: If True, only log what would be done without writing to DB
    """
    logger.info("Parsing ICS file", path=str(ics_path))
    events = parse_ics_file(ics_path)
    logger.info("Parsed ICS events", count=len(events))
    
    # Translate and filter
    sessions = []
    for event in events:
        parsed = translate_event(event)
        if parsed:
            sessions.append(parsed)
    
    logger.info("Translated sessions", count=len(sessions))
    
    # Group by round
    rounds_map = group_sessions_by_round(sessions)
    logger.info("Grouped into rounds", count=len(rounds_map))
    
    # Sort rounds by their first session's start time
    sorted_rounds = sorted(rounds_map.items(), key=lambda x: x[1][0].start_utc)
    
    if dry_run:
        logger.info("DRY RUN - Would seed the following:")
        for i, (gp_name, gp_sessions) in enumerate(sorted_rounds, 1):
            circuit_key = gp_sessions[0].circuit_key
            circuit_info = CIRCUIT_INFO.get(circuit_key, {})
            logger.info(
                "Round",
                number=i,
                name=gp_name,
                circuit=circuit_info.get("name", circuit_key),
                country=circuit_info.get("country", "Unknown"),
                sessions=len(gp_sessions),
            )
            for s in gp_sessions:
                logger.info(
                    "  Session",
                    type=s.session_type.name,
                    start=s.start_utc.isoformat(),
                )
        return
    
    # Seed to database
    with RacingRepository() as repo:
        # Ensure F1 series exists
        f1_series = repo.get_series_by_slug("formula-1")
        if not f1_series:
            f1_series = Series(name="Formula 1", slug="formula-1")
            series_id = repo.upsert_series(f1_series)
            f1_series = Series(id=series_id, name="Formula 1", slug="formula-1")
            logger.info("Created F1 series", series_id=str(series_id))
        
        # Ensure 2026 season exists
        season = repo.get_season(f1_series.id, 2026)
        if not season:
            season = Season(series_id=f1_series.id, year=2026)
            season_id = repo.upsert_season(season)
            season = Season(id=season_id, series_id=f1_series.id, year=2026)
            logger.info("Created 2026 season", season_id=str(season_id))
        
        # Cache for circuits we create
        circuit_cache: dict[str, UUID] = {}
        
        # Create rounds and sessions
        for round_number, (gp_name, gp_sessions) in enumerate(sorted_rounds, 1):
            # Get circuit info
            circuit_key = gp_sessions[0].circuit_key
            circuit_info = CIRCUIT_INFO.get(circuit_key)
            
            if not circuit_info:
                logger.warning("Unknown circuit", key=circuit_key)
                continue
            
            # Create or get circuit
            circuit_slug = slugify(circuit_info["name"])
            if circuit_slug not in circuit_cache:
                existing = repo.get_circuit_by_slug(circuit_slug)
                if existing:
                    circuit_cache[circuit_slug] = existing.id
                else:
                    circuit = Circuit(
                        name=circuit_info["name"],
                        slug=circuit_slug,
                        location=circuit_info["location"],
                        country=circuit_info["country"],
                        country_code=circuit_info.get("country_code"),
                    )
                    circuit_id = repo.upsert_circuit(circuit)
                    circuit_cache[circuit_slug] = circuit_id
                    logger.info("Created circuit", name=circuit_info["name"], id=str(circuit_id))
            
            circuit_id = circuit_cache[circuit_slug]
            
            # Create round
            date_start = gp_sessions[0].start_utc.date()
            date_end = gp_sessions[-1].start_utc.date()
            round_slug = slugify(f"2026-{gp_name}")
            
            round_obj = Round(
                season_id=season.id,
                circuit_id=circuit_id,
                name=gp_name,
                slug=round_slug,
                round_number=round_number,
                date_start=date_start,
                date_end=date_end,
            )
            
            round_id = repo.upsert_round(round_obj)
            logger.info("Created round", number=round_number, name=gp_name, id=str(round_id))
            
            # Create sessions
            for session in gp_sessions:
                session_obj = Session(
                    round_id=round_id,
                    type=session.session_type,
                    start_time_utc=session.start_utc,
                    status=SessionStatus.SCHEDULED,
                )
                # Use upsert_session_by_round_type since we don't have OpenF1 keys
                session_id = repo.upsert_session_by_round_type(session_obj)
                logger.info(
                    "Created session",
                    round=gp_name,
                    type=session.session_type.name,
                    id=str(session_id),
                )
    
    logger.info("Seeding complete", rounds=len(sorted_rounds))


def main() -> None:
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed F1 2026 calendar from ICS file")
    parser.add_argument(
        "--ics-path",
        type=Path,
        default=Path(__file__).parent.parent.parent.parent / "docs" / "calendar-formula-1-2026.ics",
        help="Path to the ICS calendar file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only log what would be done, don't write to database",
    )
    
    args = parser.parse_args()
    
    if not args.ics_path.exists():
        logger.error("ICS file not found", path=str(args.ics_path))
        raise SystemExit(1)
    
    seed_2026_calendar(args.ics_path, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
