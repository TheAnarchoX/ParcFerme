"""
CLI tool for reviewing and resolving pending entity matches.

Usage:
    python -m ingestion.review_matches --list
    python -m ingestion.review_matches --entity-type driver
    python -m ingestion.review_matches --approve <id>
    python -m ingestion.review_matches --reject <id>
    python -m ingestion.review_matches --bulk-approve-above 0.85
    python -m ingestion.review_matches --export
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from typing import Any
from uuid import UUID

import structlog  # type: ignore

from ingestion.config import settings
from ingestion.models import (
    DriverAlias,
    TeamAlias,
    CircuitAlias,
    PendingMatchEntityType,
    PendingMatchStatus,
    PendingMatchResolution,
    slugify,
)
from ingestion.repository import RacingRepository

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


def format_score(score: float) -> str:
    """Format a match score with color coding."""
    if score >= 0.9:
        return f"\033[92m{score:.3f}\033[0m"  # Green
    elif score >= 0.7:
        return f"\033[93m{score:.3f}\033[0m"  # Yellow  
    elif score >= 0.5:
        return f"\033[91m{score:.3f}\033[0m"  # Red
    else:
        return f"\033[90m{score:.3f}\033[0m"  # Gray


def format_status(status: str) -> str:
    """Format status with color coding."""
    colors = {
        "pending": "\033[93m",    # Yellow
        "approved": "\033[92m",   # Green
        "rejected": "\033[91m",   # Red
        "merged": "\033[94m",     # Blue
    }
    color = colors.get(status, "")
    reset = "\033[0m" if color else ""
    return f"{color}{status}{reset}"


def list_pending_matches(
    repo: RacingRepository,
    entity_type: str | None = None,
    status: str = "pending",
    min_score: float | None = None,
    max_score: float | None = None,
    source: str | None = None,
    limit: int = 50,
) -> None:
    """List pending matches with optional filtering."""
    matches = repo.get_pending_matches(
        entity_type=entity_type,
        status=status,
        min_score=min_score,
        max_score=max_score,
        source=source,
        limit=limit,
    )
    
    if not matches:
        print(f"\nNo {status} matches found.")
        return
    
    # Get counts by type
    counts = repo.count_pending_matches(status)
    total = sum(counts.values())
    
    print(f"\n{'='*80}")
    print(f"Pending Matches ({status}): {total} total")
    if counts:
        count_str = ", ".join(f"{k}: {v}" for k, v in sorted(counts.items()))
        print(f"By type: {count_str}")
    print(f"{'='*80}\n")
    
    # Map entity type integers to strings
    entity_type_map = {
        0: "driver",
        1: "team",
        2: "circuit",
        3: "round",
    }
    
    for i, match in enumerate(matches, 1):
        entity_type_val = match.get("entity_type")
        if isinstance(entity_type_val, int):
            entity_type_str = entity_type_map.get(entity_type_val, str(entity_type_val))
        else:
            entity_type_str = str(entity_type_val)
            
        match_id = match["id"]
        if hasattr(match_id, "hex"):
            short_id = str(match_id)[:8]
        else:
            short_id = str(match_id)[:8]
        
        print(f"{i:3}. [{short_id}...] {entity_type_str.upper():<8} Score: {format_score(float(match['match_score']))}")
        print(f"     Incoming:  \"{match['incoming_name']}\"")
        
        if match.get("candidate_entity_name"):
            print(f"     Candidate: \"{match['candidate_entity_name']}\" (ID: {str(match['candidate_entity_id'])[:8]}...)")
        else:
            print(f"     Candidate: None (new entity)")
            
        print(f"     Source: {match['source']} | Status: {format_status(match['status'])}")
        
        # Show signal breakdown if available
        if match.get("signals_json"):
            try:
                signals = json.loads(match["signals_json"])
                if signals:
                    signal_strs = []
                    for sig in signals:
                        status_icon = "✓" if sig.get("matched") else "✗"
                        signal_strs.append(f"{status_icon}{sig['name']}:{sig['raw_score']:.2f}")
                    print(f"     Signals: {' | '.join(signal_strs)}")
            except (json.JSONDecodeError, KeyError, TypeError):
                pass
        
        print()


def approve_match(
    repo: RacingRepository,
    match_id: str,
    resolved_by: str = "cli",
    create_alias: bool = True,
) -> bool:
    """Approve a pending match and optionally create an alias.
    
    Args:
        repo: The repository instance
        match_id: UUID string of the match to approve
        resolved_by: Who is approving (for audit)
        create_alias: Whether to auto-create alias from the match
        
    Returns:
        True if successful
    """
    try:
        uuid_id = UUID(match_id)
    except ValueError:
        print(f"Error: Invalid UUID: {match_id}")
        return False
    
    match = repo.get_pending_match_by_id(uuid_id)
    if not match:
        print(f"Error: Match not found: {match_id}")
        return False
    
    if match["status"] != "pending":
        print(f"Error: Match is not pending (status: {match['status']})")
        return False
    
    if not match.get("candidate_entity_id"):
        print("Error: No candidate entity to approve. Use --reject to create new entity.")
        return False
    
    # Map entity type integers to strings
    entity_type_map = {
        0: "driver",
        1: "team",
        2: "circuit",
        3: "round",
    }
    entity_type_val = match.get("entity_type")
    if isinstance(entity_type_val, int):
        entity_type = entity_type_map.get(entity_type_val, str(entity_type_val))
    else:
        entity_type = str(entity_type_val)
    
    # Create alias if requested
    if create_alias:
        incoming_name = match["incoming_name"]
        incoming_slug = slugify(incoming_name)
        candidate_id = UUID(str(match["candidate_entity_id"]))
        
        if entity_type == "driver":
            alias = DriverAlias(
                driver_id=candidate_id,
                alias_name=incoming_name,
                alias_slug=incoming_slug,
                source=f"review_queue:{match['source']}",
            )
            try:
                repo.upsert_driver_alias(alias)
                print(f"Created driver alias: \"{incoming_name}\" -> {match['candidate_entity_name']}")
            except Exception as e:
                logger.warning("Failed to create driver alias", error=str(e))
                
        elif entity_type == "team":
            alias = TeamAlias(
                team_id=candidate_id,
                alias_name=incoming_name,
                alias_slug=incoming_slug,
                source=f"review_queue:{match['source']}",
            )
            try:
                repo.upsert_team_alias(alias)
                print(f"Created team alias: \"{incoming_name}\" -> {match['candidate_entity_name']}")
            except Exception as e:
                logger.warning("Failed to create team alias", error=str(e))
                
        elif entity_type == "circuit":
            alias = CircuitAlias(
                circuit_id=candidate_id,
                alias_name=incoming_name,
                alias_slug=incoming_slug,
                source=f"review_queue:{match['source']}",
            )
            try:
                repo.upsert_circuit_alias(alias)
                print(f"Created circuit alias: \"{incoming_name}\" -> {match['candidate_entity_name']}")
            except Exception as e:
                logger.warning("Failed to create circuit alias", error=str(e))
    
    # Update the match status
    success = repo.update_pending_match_status(
        match_id=uuid_id,
        status="approved",
        resolution="match_existing",
        resolved_by=resolved_by,
    )
    
    if success:
        print(f"✓ Approved match: \"{match['incoming_name']}\" -> \"{match['candidate_entity_name']}\"")
    else:
        print(f"Error: Failed to update match status")
    
    return success


def reject_match(
    repo: RacingRepository,
    match_id: str,
    resolved_by: str = "cli",
    notes: str | None = None,
) -> bool:
    """Reject a pending match (entity will be created as new).
    
    Args:
        repo: The repository instance
        match_id: UUID string of the match to reject
        resolved_by: Who is rejecting (for audit)
        notes: Optional notes about the rejection
        
    Returns:
        True if successful
    """
    try:
        uuid_id = UUID(match_id)
    except ValueError:
        print(f"Error: Invalid UUID: {match_id}")
        return False
    
    match = repo.get_pending_match_by_id(uuid_id)
    if not match:
        print(f"Error: Match not found: {match_id}")
        return False
    
    if match["status"] != "pending":
        print(f"Error: Match is not pending (status: {match['status']})")
        return False
    
    success = repo.update_pending_match_status(
        match_id=uuid_id,
        status="rejected",
        resolution="create_new",
        resolved_by=resolved_by,
        resolution_notes=notes,
    )
    
    if success:
        print(f"✓ Rejected match: \"{match['incoming_name']}\" - will create new entity")
    else:
        print(f"Error: Failed to update match status")
    
    return success


def skip_match(
    repo: RacingRepository,
    match_id: str,
    resolved_by: str = "cli",
    notes: str | None = None,
) -> bool:
    """Skip a pending match (do nothing with it).
    
    Args:
        repo: The repository instance
        match_id: UUID string of the match to skip
        resolved_by: Who is skipping (for audit)
        notes: Optional notes about skipping
        
    Returns:
        True if successful
    """
    try:
        uuid_id = UUID(match_id)
    except ValueError:
        print(f"Error: Invalid UUID: {match_id}")
        return False
    
    match = repo.get_pending_match_by_id(uuid_id)
    if not match:
        print(f"Error: Match not found: {match_id}")
        return False
    
    success = repo.update_pending_match_status(
        match_id=uuid_id,
        status="rejected",
        resolution="skip",
        resolved_by=resolved_by,
        resolution_notes=notes or "Skipped via CLI",
    )
    
    if success:
        print(f"✓ Skipped match: \"{match['incoming_name']}\"")
    else:
        print(f"Error: Failed to update match status")
    
    return success


def bulk_approve(
    repo: RacingRepository,
    min_score: float,
    entity_type: str | None = None,
    resolved_by: str = "bulk_approve",
    create_aliases: bool = True,
) -> int:
    """Bulk approve all pending matches above a score threshold.
    
    Args:
        repo: The repository instance
        min_score: Minimum score to approve
        entity_type: Optionally filter by entity type
        resolved_by: Who is approving
        create_aliases: Whether to create aliases for approved matches
        
    Returns:
        Number of matches approved
    """
    # First get all matches that will be approved (to create aliases)
    if create_aliases:
        matches = repo.get_pending_matches(
            entity_type=entity_type,
            status="pending",
            min_score=min_score,
            limit=1000,
        )
        
        # Map entity type integers to strings
        entity_type_map = {
            0: "driver",
            1: "team",
            2: "circuit",
            3: "round",
        }
        
        # Create aliases for matches with candidates
        for match in matches:
            if not match.get("candidate_entity_id"):
                continue
                
            entity_type_val = match.get("entity_type")
            if isinstance(entity_type_val, int):
                match_entity_type = entity_type_map.get(entity_type_val, str(entity_type_val))
            else:
                match_entity_type = str(entity_type_val)
            
            incoming_name = match["incoming_name"]
            incoming_slug = slugify(incoming_name)
            candidate_id = UUID(str(match["candidate_entity_id"]))
            
            try:
                if match_entity_type == "driver":
                    alias = DriverAlias(
                        driver_id=candidate_id,
                        alias_name=incoming_name,
                        alias_slug=incoming_slug,
                        source=f"bulk_approve:{match['source']}",
                    )
                    repo.upsert_driver_alias(alias)
                elif match_entity_type == "team":
                    alias = TeamAlias(
                        team_id=candidate_id,
                        alias_name=incoming_name,
                        alias_slug=incoming_slug,
                        source=f"bulk_approve:{match['source']}",
                    )
                    repo.upsert_team_alias(alias)
                elif match_entity_type == "circuit":
                    alias = CircuitAlias(
                        circuit_id=candidate_id,
                        alias_name=incoming_name,
                        alias_slug=incoming_slug,
                        source=f"bulk_approve:{match['source']}",
                    )
                    repo.upsert_circuit_alias(alias)
            except Exception as e:
                logger.warning(
                    "Failed to create alias during bulk approve",
                    entity_type=match_entity_type,
                    incoming_name=incoming_name,
                    error=str(e),
                )
    
    # Now bulk update the status
    count = repo.bulk_approve_pending_matches(
        min_score=min_score,
        entity_type=entity_type,
        resolved_by=resolved_by,
    )
    
    print(f"✓ Bulk approved {count} matches with score >= {min_score}")
    return count


def export_pending_matches(
    repo: RacingRepository,
    entity_type: str | None = None,
    status: str = "pending",
    output_file: str | None = None,
) -> None:
    """Export pending matches to JSON.
    
    Args:
        repo: The repository instance
        entity_type: Optionally filter by entity type
        status: Filter by status
        output_file: Output file path (default: stdout)
    """
    matches = repo.get_pending_matches(
        entity_type=entity_type,
        status=status,
        limit=10000,
    )
    
    # Convert to serializable format
    export_data = []
    for match in matches:
        entry = {}
        for key, value in match.items():
            if hasattr(value, "isoformat"):  # datetime
                entry[key] = value.isoformat()
            elif hasattr(value, "hex"):  # UUID
                entry[key] = str(value)
            else:
                entry[key] = value
        export_data.append(entry)
    
    output = json.dumps(export_data, indent=2)
    
    if output_file:
        with open(output_file, "w") as f:
            f.write(output)
        print(f"Exported {len(export_data)} matches to {output_file}")
    else:
        print(output)


def show_match_detail(repo: RacingRepository, match_id: str) -> None:
    """Show detailed information about a pending match.
    
    Args:
        repo: The repository instance
        match_id: UUID string of the match to show
    """
    try:
        uuid_id = UUID(match_id)
    except ValueError:
        print(f"Error: Invalid UUID: {match_id}")
        return
    
    match = repo.get_pending_match_by_id(uuid_id)
    if not match:
        print(f"Error: Match not found: {match_id}")
        return
    
    print(f"\n{'='*60}")
    print(f"Pending Match Detail")
    print(f"{'='*60}\n")
    
    # Map entity type integers to strings
    entity_type_map = {
        0: "driver",
        1: "team",
        2: "circuit",
        3: "round",
    }
    entity_type_val = match.get("entity_type")
    if isinstance(entity_type_val, int):
        entity_type = entity_type_map.get(entity_type_val, str(entity_type_val))
    else:
        entity_type = str(entity_type_val)
    
    print(f"ID:           {match['id']}")
    print(f"Entity Type:  {entity_type}")
    print(f"Incoming:     \"{match['incoming_name']}\"")
    print(f"Match Score:  {format_score(float(match['match_score']))}")
    print(f"Status:       {format_status(match['status'])}")
    print(f"Source:       {match['source']}")
    print(f"Created:      {match['created_at']}")
    
    if match.get("candidate_entity_name"):
        print(f"\nCandidate Entity:")
        print(f"  Name: \"{match['candidate_entity_name']}\"")
        print(f"  ID:   {match['candidate_entity_id']}")
    else:
        print(f"\nCandidate Entity: None (would create new)")
    
    if match.get("resolved_at"):
        print(f"\nResolution:")
        print(f"  Resolved At: {match['resolved_at']}")
        print(f"  Resolved By: {match['resolved_by']}")
        print(f"  Resolution:  {match['resolution']}")
        if match.get("resolution_notes"):
            print(f"  Notes:       {match['resolution_notes']}")
    
    # Parse and display signals
    if match.get("signals_json"):
        try:
            signals = json.loads(match["signals_json"])
            if signals:
                print(f"\nSignal Breakdown:")
                for sig in sorted(signals, key=lambda s: -s.get("raw_score", 0)):
                    status = "✓" if sig.get("matched") else "✗"
                    print(f"  {status} {sig['name']:<20} {sig['score']:.2f} × {sig['weight']:.2f} = {sig['raw_score']:.3f}")
                    if sig.get("details"):
                        print(f"      {sig['details']}")
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"\nSignals: (parse error: {e})")
    
    # Parse and display incoming data
    if match.get("incoming_data_json"):
        try:
            data = json.loads(match["incoming_data_json"])
            print(f"\nIncoming Data:")
            for key, value in data.items():
                print(f"  {key}: {value}")
        except (json.JSONDecodeError, TypeError):
            pass
    
    print()


def main() -> int:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="Review and resolve pending entity matches",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List all pending matches
  python -m ingestion.review_matches --list
  
  # List pending driver matches
  python -m ingestion.review_matches --list --entity-type driver
  
  # Show detail for a specific match
  python -m ingestion.review_matches --show <uuid>
  
  # Approve a match (creates alias automatically)
  python -m ingestion.review_matches --approve <uuid>
  
  # Reject a match (will create new entity)
  python -m ingestion.review_matches --reject <uuid>
  
  # Bulk approve high-confidence matches
  python -m ingestion.review_matches --bulk-approve-above 0.85
  
  # Export pending matches to JSON
  python -m ingestion.review_matches --export > pending_matches.json
        """,
    )
    
    # Action arguments
    parser.add_argument("--list", "-l", action="store_true", help="List pending matches")
    parser.add_argument("--show", "-s", metavar="ID", help="Show detail for a specific match")
    parser.add_argument("--approve", "-a", metavar="ID", help="Approve a match")
    parser.add_argument("--reject", "-r", metavar="ID", help="Reject a match (create new entity)")
    parser.add_argument("--skip", metavar="ID", help="Skip a match (do nothing)")
    parser.add_argument("--bulk-approve-above", type=float, metavar="SCORE",
                       help="Approve all matches with score >= SCORE")
    parser.add_argument("--export", "-e", action="store_true", help="Export pending matches to JSON")
    
    # Filter arguments
    parser.add_argument("--entity-type", "-t", choices=["driver", "team", "circuit", "round"],
                       help="Filter by entity type")
    parser.add_argument("--status", default="pending",
                       choices=["pending", "approved", "rejected", "merged"],
                       help="Filter by status (default: pending)")
    parser.add_argument("--min-score", type=float, help="Minimum match score")
    parser.add_argument("--max-score", type=float, help="Maximum match score")
    parser.add_argument("--source", help="Filter by data source")
    parser.add_argument("--limit", type=int, default=50, help="Maximum results (default: 50)")
    
    # Other options
    parser.add_argument("--output", "-o", metavar="FILE", help="Output file for export")
    parser.add_argument("--no-alias", action="store_true",
                       help="Don't create alias when approving")
    parser.add_argument("--notes", "-n", metavar="TEXT", help="Notes for rejection/skip")
    parser.add_argument("--user", "-u", default="cli", help="User identifier for audit")
    
    args = parser.parse_args()
    
    # Determine action
    has_action = any([
        args.list,
        args.show,
        args.approve,
        args.reject,
        args.skip,
        args.bulk_approve_above is not None,
        args.export,
    ])
    
    if not has_action:
        parser.print_help()
        return 1
    
    # Connect to database
    try:
        with RacingRepository() as repo:
            if args.list:
                list_pending_matches(
                    repo,
                    entity_type=args.entity_type,
                    status=args.status,
                    min_score=args.min_score,
                    max_score=args.max_score,
                    source=args.source,
                    limit=args.limit,
                )
            
            elif args.show:
                show_match_detail(repo, args.show)
            
            elif args.approve:
                success = approve_match(
                    repo,
                    args.approve,
                    resolved_by=args.user,
                    create_alias=not args.no_alias,
                )
                return 0 if success else 1
            
            elif args.reject:
                success = reject_match(
                    repo,
                    args.reject,
                    resolved_by=args.user,
                    notes=args.notes,
                )
                return 0 if success else 1
            
            elif args.skip:
                success = skip_match(
                    repo,
                    args.skip,
                    resolved_by=args.user,
                    notes=args.notes,
                )
                return 0 if success else 1
            
            elif args.bulk_approve_above is not None:
                count = bulk_approve(
                    repo,
                    args.bulk_approve_above,
                    entity_type=args.entity_type,
                    resolved_by=args.user,
                    create_aliases=not args.no_alias,
                )
                print(f"\nApproved {count} matches")
            
            elif args.export:
                export_pending_matches(
                    repo,
                    entity_type=args.entity_type,
                    status=args.status,
                    output_file=args.output,
                )
        
        return 0
        
    except Exception as e:
        logger.exception("Error in review_matches", error=str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
