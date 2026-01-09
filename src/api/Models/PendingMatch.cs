namespace ParcFerme.Api.Models;

/// <summary>
/// Entity types that can have pending matches.
/// </summary>
public enum PendingMatchEntityType
{
    Driver,
    Team,
    Circuit,
    Round
}

/// <summary>
/// Resolution status for pending matches.
/// </summary>
public enum PendingMatchStatus
{
    Pending,
    Approved,
    Rejected,
    Merged
}

/// <summary>
/// Resolution action taken for a pending match.
/// </summary>
public enum PendingMatchResolution
{
    MatchExisting,
    CreateNew,
    Skip
}

/// <summary>
/// A pending entity match that needs human review.
/// Used when the matching engine has medium-low confidence (0.5-0.7)
/// about whether incoming data matches an existing entity.
/// </summary>
public sealed class PendingMatch
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Type of entity being matched (driver, team, circuit, round).
    /// </summary>
    public required PendingMatchEntityType EntityType { get; set; }
    
    /// <summary>
    /// The name from the incoming data source.
    /// </summary>
    public required string IncomingName { get; set; }
    
    /// <summary>
    /// Full incoming entity data serialized as JSON.
    /// Allows recreation of the entity if approved.
    /// </summary>
    public string? IncomingDataJson { get; set; }
    
    /// <summary>
    /// Best guess candidate entity ID (if any).
    /// </summary>
    public Guid? CandidateEntityId { get; set; }
    
    /// <summary>
    /// Name of the candidate entity for display.
    /// </summary>
    public string? CandidateEntityName { get; set; }
    
    /// <summary>
    /// Match confidence score (0.0-1.0).
    /// </summary>
    public decimal MatchScore { get; set; }
    
    /// <summary>
    /// Serialized MatchSignal[] from the matching engine.
    /// Contains individual signal scores and explanations.
    /// </summary>
    public string? SignalsJson { get; set; }
    
    /// <summary>
    /// Data source identifier (openf1, ergast, community, etc.).
    /// </summary>
    public required string Source { get; set; }
    
    /// <summary>
    /// Current status of the pending match.
    /// </summary>
    public PendingMatchStatus Status { get; set; } = PendingMatchStatus.Pending;
    
    /// <summary>
    /// When the match was resolved (approved/rejected/merged).
    /// </summary>
    public DateTime? ResolvedAt { get; set; }
    
    /// <summary>
    /// Username or identifier of who resolved the match.
    /// </summary>
    public string? ResolvedBy { get; set; }
    
    /// <summary>
    /// Resolution action taken (match_existing, create_new, skip).
    /// </summary>
    public PendingMatchResolution? Resolution { get; set; }
    
    /// <summary>
    /// Notes about the resolution (e.g., why it was rejected).
    /// </summary>
    public string? ResolutionNotes { get; set; }
    
    /// <summary>
    /// When the pending match was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
