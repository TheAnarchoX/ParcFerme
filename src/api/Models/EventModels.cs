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
    
    /// <summary>
    /// Brand colors as hex codes (e.g., ["#E10600", "#FFFFFF"]).
    /// First color is primary (used for text), additional colors for gradients/accents.
    /// </summary>
    public List<string> BrandColors { get; set; } = [];
    
    /// <summary>
    /// Governing body of the series (e.g., "FIA", "NASCAR", "AMA").
    /// From The Third Turn Series Index page.
    /// </summary>
    public string? GoverningBody { get; set; }
    
    /// <summary>
    /// Display order for UI dropdowns and lists.
    /// Lower values appear first. Null values sort last.
    /// </summary>
    public int? UIOrder { get; set; }
    
    public ICollection<Season> Seasons { get; set; } = [];
    public ICollection<SeriesAlias> Aliases { get; set; } = [];
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
    
    /// <summary>
    /// Ergast raceId for correlation during historical import.
    /// </summary>
    public int? ErgastRaceId { get; set; }
    
    /// <summary>
    /// Wikipedia URL for external reference.
    /// </summary>
    public string? WikipediaUrl { get; set; }
    
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
    
    /// <summary>
    /// Altitude in meters above sea level (from Ergast).
    /// </summary>
    public int? Altitude { get; set; }
    
    /// <summary>
    /// Wikipedia URL for external reference.
    /// </summary>
    public string? WikipediaUrl { get; set; }
    
    /// <summary>
    /// Type of track layout (e.g., "Road Course", "Oval", "Street Circuit").
    /// From The Third Turn circuit pages.
    /// </summary>
    public string? TrackType { get; set; }
    
    /// <summary>
    /// Current operational status of the track.
    /// Human-readable values: "Still In Operation", "Closed", "Demolished".
    /// From The Third Turn circuit pages.
    /// </summary>
    public string? TrackStatus { get; set; }
    
    /// <summary>
    /// Year the track first opened.
    /// From The Third Turn circuit pages.
    /// </summary>
    public int? OpenedYear { get; set; }
    
    public ICollection<Round> Rounds { get; set; } = [];
    public ICollection<Grandstand> Grandstands { get; set; } = [];
    public ICollection<CircuitAlias> Aliases { get; set; } = [];
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
    /// Note: This may be null for historical drivers or vary by series.
    /// </summary>
    public int? DriverNumber { get; set; }
    
    /// <summary>
    /// OpenF1 driver_number - serves as stable external identifier for F1.
    /// This is the racing number from OpenF1 which is consistent per driver.
    /// </summary>
    public int? OpenF1DriverNumber { get; set; }
    
    /// <summary>
    /// Driver's date of birth (from Ergast).
    /// </summary>
    public DateOnly? DateOfBirth { get; set; }
    
    /// <summary>
    /// Wikipedia URL for external reference.
    /// </summary>
    public string? WikipediaUrl { get; set; }
    
    /// <summary>
    /// Driver's nickname (e.g., "Teflonso", "The Iceman").
    /// From The Third Turn driver pages.
    /// </summary>
    public string? Nickname { get; set; }
    
    /// <summary>
    /// Driver's place of birth (e.g., "Oviedo, Spain").
    /// From The Third Turn driver pages.
    /// </summary>
    public string? PlaceOfBirth { get; set; }
    
    public ICollection<Entrant> Entrants { get; set; } = [];
    public ICollection<DriverAlias> Aliases { get; set; } = [];
}

/// <summary>
/// Historical alias for a driver (name variations, previous names).
/// Enables tracking driver identity across name changes and spelling variations.
/// </summary>
public sealed class DriverAlias
{
    public Guid Id { get; set; }
    public Guid DriverId { get; set; }
    
    /// <summary>
    /// The alias name (e.g., "Andrea Kimi Antonelli", "Kimi Antonelli").
    /// </summary>
    public required string AliasName { get; set; }
    
    /// <summary>
    /// Slug form of the alias for matching.
    /// </summary>
    public required string AliasSlug { get; set; }
    
    /// <summary>
    /// Optional series context - alias may only apply to specific series.
    /// Null means it applies universally.
    /// </summary>
    public Guid? SeriesId { get; set; }
    
    /// <summary>
    /// Optional driver number if this alias had a different racing number.
    /// Used for tracking number changes or series-specific numbers.
    /// </summary>
    public int? DriverNumber { get; set; }
    
    /// <summary>
    /// When this alias started being used (optional).
    /// </summary>
    public DateOnly? ValidFrom { get; set; }
    
    /// <summary>
    /// When this alias stopped being used (optional).
    /// </summary>
    public DateOnly? ValidUntil { get; set; }
    
    /// <summary>
    /// Source of this alias (e.g., "OpenF1", "Manual", "Historical").
    /// </summary>
    public string? Source { get; set; }
    
    public Driver Driver { get; set; } = null!;
    public Series? Series { get; set; }
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
    
    /// <summary>
    /// Team/constructor nationality (from Ergast).
    /// </summary>
    public string? Nationality { get; set; }
    
    /// <summary>
    /// Wikipedia URL for external reference.
    /// </summary>
    public string? WikipediaUrl { get; set; }
    
    public ICollection<Entrant> Entrants { get; set; } = [];
    public ICollection<TeamAlias> Aliases { get; set; } = [];
}

/// <summary>
/// Historical alias for a team (name variations, previous names).
/// Enables tracking team identity across rebrands and sponsorship changes.
/// </summary>
public sealed class TeamAlias
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    
    /// <summary>
    /// The alias name (e.g., "Red Bull RBPT", "Scuderia AlphaTauri").
    /// </summary>
    public required string AliasName { get; set; }
    
    /// <summary>
    /// Slug form of the alias for matching.
    /// </summary>
    public required string AliasSlug { get; set; }
    
    /// <summary>
    /// Optional series context - alias may only apply to specific series.
    /// Null means it applies universally.
    /// </summary>
    public Guid? SeriesId { get; set; }
    
    /// <summary>
    /// When this alias started being used (optional).
    /// </summary>
    public DateOnly? ValidFrom { get; set; }
    
    /// <summary>
    /// When this alias stopped being used (optional).
    /// </summary>
    public DateOnly? ValidUntil { get; set; }
    
    /// <summary>
    /// Source of this alias (e.g., "OpenF1", "Manual", "Historical").
    /// </summary>
    public string? Source { get; set; }
    
    public Team Team { get; set; } = null!;
    public Series? Series { get; set; }
}

/// <summary>
/// Historical alias for a series (name variations, rebrands).
/// Enables tracking series identity across name changes and sponsorship changes.
/// </summary>
public sealed class SeriesAlias
{
    public Guid Id { get; set; }
    public Guid SeriesId { get; set; }
    
    /// <summary>
    /// The alias name (e.g., "FIA Formula One World Championship").
    /// </summary>
    public required string AliasName { get; set; }
    
    /// <summary>
    /// Slug form of the alias for matching.
    /// </summary>
    public required string AliasSlug { get; set; }
    
    /// <summary>
    /// Logo URL if different from canonical.
    /// </summary>
    public string? LogoUrl { get; set; }
    
    /// <summary>
    /// When this alias started being used (optional).
    /// </summary>
    public DateOnly? ValidFrom { get; set; }
    
    /// <summary>
    /// When this alias stopped being used (optional).
    /// </summary>
    public DateOnly? ValidUntil { get; set; }
    
    /// <summary>
    /// Source of this alias (e.g., "OpenF1", "Manual", "Historical").
    /// </summary>
    public string? Source { get; set; }
    
    public Series Series { get; set; } = null!;
}

/// <summary>
/// Historical alias for a circuit (name variations, title sponsor changes).
/// Enables tracking circuit identity across name changes.
/// </summary>
public sealed class CircuitAlias
{
    public Guid Id { get; set; }
    public Guid CircuitId { get; set; }
    
    /// <summary>
    /// The alias name (e.g., "Heineken Dutch Grand Prix Circuit").
    /// </summary>
    public required string AliasName { get; set; }
    
    /// <summary>
    /// Slug form of the alias for matching.
    /// </summary>
    public required string AliasSlug { get; set; }
    
    /// <summary>
    /// When this alias started being used (optional).
    /// </summary>
    public DateOnly? ValidFrom { get; set; }
    
    /// <summary>
    /// When this alias stopped being used (optional).
    /// </summary>
    public DateOnly? ValidUntil { get; set; }
    
    /// <summary>
    /// Source of this alias (e.g., "OpenF1", "Manual", "Historical").
    /// </summary>
    public string? Source { get; set; }
    
    public Circuit Circuit { get; set; } = null!;
}

/// <summary>
/// Role of a driver within a team for a specific round.
/// Used to distinguish regular lineup from reserves and test drivers.
/// </summary>
public enum DriverRole
{
    /// <summary>Regular race driver - part of the official lineup.</summary>
    Regular = 0,
    
    /// <summary>Reserve/test driver filling in for an injured or unavailable driver.</summary>
    Reserve = 1,
    
    /// <summary>FP1-only driver - typically a rookie getting mandatory practice time.</summary>
    Fp1Only = 2,
    
    /// <summary>Test driver participating in a test session.</summary>
    Test = 3
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
    
    /// <summary>
    /// Role of the driver for this round (regular, reserve, FP1-only).
    /// Defaults to Regular for backwards compatibility.
    /// </summary>
    public DriverRole Role { get; set; } = DriverRole.Regular;
    
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
    
    // Ergast-specific timing fields
    
    /// <summary>
    /// Precise time in milliseconds (from Ergast).
    /// </summary>
    public int? TimeMilliseconds { get; set; }
    
    /// <summary>
    /// Which lap was the fastest lap (from Ergast).
    /// </summary>
    public int? FastestLapNumber { get; set; }
    
    /// <summary>
    /// Rank among all fastest laps in the session (from Ergast).
    /// </summary>
    public int? FastestLapRank { get; set; }
    
    /// <summary>
    /// Fastest lap time as string, e.g., "1:27.452" (from Ergast).
    /// </summary>
    public string? FastestLapTime { get; set; }
    
    /// <summary>
    /// Fastest lap speed, e.g., "218.300" km/h (from Ergast).
    /// </summary>
    public string? FastestLapSpeed { get; set; }
    
    /// <summary>
    /// Detailed status text, e.g., "Engine", "Collision" (from Ergast).
    /// Provides more detail than the ResultStatus enum.
    /// </summary>
    public string? StatusDetail { get; set; }
    
    // Qualifying-specific fields
    
    /// <summary>
    /// Q1 session time, e.g., "1:28.123" (from Ergast, 1994+).
    /// </summary>
    public string? Q1Time { get; set; }
    
    /// <summary>
    /// Q2 session time, e.g., "1:27.456" (from Ergast, 2006+).
    /// </summary>
    public string? Q2Time { get; set; }
    
    /// <summary>
    /// Q3 session time, e.g., "1:26.789" (from Ergast, 2006+).
    /// </summary>
    public string? Q3Time { get; set; }
    
    /// <summary>
    /// Number of laps led during the session.
    /// From The Third Turn (common in NASCAR/IndyCar).
    /// </summary>
    public int? LapsLed { get; set; }
    
    /// <summary>
    /// Car number as displayed during the session.
    /// String to support alphanumeric numbers (e.g., "34", "T11", "12B").
    /// From both Ergast and The Third Turn.
    /// </summary>
    public string? CarNumber { get; set; }
    
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
