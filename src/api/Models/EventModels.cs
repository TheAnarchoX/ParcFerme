namespace ParcFerme.Api.Models;

// =========================
// Event Cluster (Objective Racing Data)
// =========================

/// <summary>
/// Racing series (F1, MotoGP, IndyCar, WEC).
/// </summary>
public sealed class Series
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? LogoUrl { get; set; }
    
    public ICollection<Season> Seasons { get; set; } = [];
}

/// <summary>
/// A season within a series (e.g., "F1 2024").
/// </summary>
public sealed class Season
{
    public Guid Id { get; set; }
    public Guid SeriesId { get; set; }
    public int Year { get; set; }
    
    public Series Series { get; set; } = null!;
    public ICollection<Round> Rounds { get; set; } = [];
}

/// <summary>
/// A race weekend (e.g., "2024 British Grand Prix").
/// Contains multiple sessions (FP1, Quali, Race, etc.)
/// </summary>
public sealed class Round
{
    public Guid Id { get; set; }
    public Guid SeasonId { get; set; }
    public Guid CircuitId { get; set; }
    
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public int RoundNumber { get; set; }
    
    public DateOnly DateStart { get; set; }
    public DateOnly DateEnd { get; set; }
    
    /// <summary>
    /// OpenF1 meeting_key for correlation.
    /// </summary>
    public int? OpenF1MeetingKey { get; set; }
    
    public Season Season { get; set; } = null!;
    public Circuit Circuit { get; set; } = null!;
    public ICollection<Session> Sessions { get; set; } = [];
    public ICollection<Entrant> Entrants { get; set; } = [];
}

/// <summary>
/// A single session within a round (FP1, Qualifying, Race, etc.)
/// This is the primary "rateable" unit.
/// </summary>
public sealed class Session
{
    public Guid Id { get; set; }
    public Guid RoundId { get; set; }
    
    public SessionType Type { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Scheduled;
    
    /// <summary>
    /// OpenF1 session_key for correlation.
    /// </summary>
    public int? OpenF1SessionKey { get; set; }
    
    public Round Round { get; set; } = null!;
    public ICollection<Result> Results { get; set; } = [];
    public ICollection<Log> Logs { get; set; } = [];
}

public enum SessionType
{
    FP1, FP2, FP3,
    Qualifying,
    SprintQualifying, Sprint,
    Race,
    // WEC-specific
    Warmup,
    // MotoGP-specific  
    Moto3Race, Moto2Race, MotoGPRace
}

public enum SessionStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    Delayed
}

/// <summary>
/// A racing circuit/track.
/// </summary>
public sealed class Circuit
{
    public Guid Id { get; set; }
    
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string Location { get; set; }
    public required string Country { get; set; }
    public string? CountryCode { get; set; }
    
    /// <summary>
    /// Generic circuit layout image (spoiler-safe).
    /// </summary>
    public string? LayoutMapUrl { get; set; }
    
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? LengthMeters { get; set; }
    
    public ICollection<Round> Rounds { get; set; } = [];
    public ICollection<Grandstand> Grandstands { get; set; } = [];
}

/// <summary>
/// Grandstand/seating area at a circuit (for venue ratings).
/// </summary>
public sealed class Grandstand
{
    public Guid Id { get; set; }
    public Guid CircuitId { get; set; }
    
    public required string Name { get; set; }
    public string? Description { get; set; }
    
    public Circuit Circuit { get; set; } = null!;
}

/// <summary>
/// A driver in the database.
/// </summary>
public sealed class Driver
{
    public Guid Id { get; set; }
    
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Slug { get; set; }
    public string? Abbreviation { get; set; }
    public string? Nationality { get; set; }
    public string? HeadshotUrl { get; set; }
    
    /// <summary>
    /// Permanent racing number (e.g., 44 for Hamilton). Used as stable identifier.
    /// </summary>
    public int? DriverNumber { get; set; }
    
    public ICollection<Entrant> Entrants { get; set; } = [];
}

/// <summary>
/// A team/constructor in the database.
/// </summary>
public sealed class Team
{
    public Guid Id { get; set; }
    
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? ShortName { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    
    public ICollection<Entrant> Entrants { get; set; } = [];
}

/// <summary>
/// Links a driver to a team for a specific round.
/// Handles driver changes mid-season and WEC multi-driver cars.
/// </summary>
public sealed class Entrant
{
    public Guid Id { get; set; }
    public Guid RoundId { get; set; }
    public Guid DriverId { get; set; }
    public Guid TeamId { get; set; }
    
    public int? CarNumber { get; set; }
    
    public Round Round { get; set; } = null!;
    public Driver Driver { get; set; } = null!;
    public Team Team { get; set; } = null!;
    public ICollection<Result> Results { get; set; } = [];
}

/// <summary>
/// Session result for an entrant.
/// ⚠️ SPOILER DATA - Must be protected by Spoiler Shield.
/// </summary>
public sealed class Result
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid EntrantId { get; set; }
    
    public int? Position { get; set; }
    public int? GridPosition { get; set; }
    public ResultStatus Status { get; set; }
    public double? Points { get; set; }
    public TimeSpan? Time { get; set; }
    public int? Laps { get; set; }
    public bool FastestLap { get; set; }
    
    public Session Session { get; set; } = null!;
    public Entrant Entrant { get; set; } = null!;
}

public enum ResultStatus
{
    Finished,
    DNF,
    DNS,
    DSQ,
    NC // Not Classified
}
