namespace ParcFerme.Api.Dtos;

// =========================
// Session DTOs (Spoiler-Aware)
// =========================

/// <summary>
/// Session summary for lists (minimal spoiler risk).
/// </summary>
public sealed record SessionSummaryDto(
    Guid Id,
    string Name,
    string Type,
    DateTime StartTimeUtc,
    string Status,
    RoundSummaryDto Round,
    bool IsLogged
);

/// <summary>
/// Full session details with spoiler-protected results.
/// </summary>
public sealed record SessionDetailDto(
    Guid Id,
    string Name,
    string Type,
    DateTime StartTimeUtc,
    string Status,
    int? OpenF1SessionKey,
    RoundDetailDto Round,
    bool IsLogged,
    bool SpoilersRevealed,
    SessionResultsDto? Results,
    SessionStatsDto Stats
);

/// <summary>
/// Results data - only populated when spoilers are revealed.
/// </summary>
public sealed record SessionResultsDto(
    IReadOnlyList<ResultDto> Classification,
    ResultDto? Winner,
    ResultDto? FastestLap
);

/// <summary>
/// Individual result entry.
/// </summary>
public sealed record ResultDto(
    int Position,
    int? GridPosition,
    string Status,
    double? Points,
    string? Time,
    int? Laps,
    bool FastestLap,
    DriverSummaryDto Driver,
    TeamSummaryDto Team
);

/// <summary>
/// Spoiler-safe session statistics.
/// Aggregate data that doesn't reveal specific results.
/// </summary>
public sealed record SessionStatsDto(
    int TotalEntrants,
    int FinishedCount,
    int DnfCount,
    double? AverageExcitement,
    int TotalLogs,
    int TotalReviews
);

// =========================
// Masked Result (for hidden spoilers)
// =========================

/// <summary>
/// Masked result shown when spoilers are hidden.
/// Contains position but no driver/team info.
/// </summary>
public sealed record MaskedResultDto(
    int Position,
    string Status
);

// =========================
// Round DTOs
// =========================

public sealed record RoundSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart,
    DateOnly DateEnd,
    CircuitSummaryDto Circuit,
    int Year,
    string SeriesName
);

public sealed record RoundDetailDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart,
    DateOnly DateEnd,
    CircuitDetailDto Circuit,
    int Year,
    string SeriesSlug,
    string SeriesName,
    IReadOnlyList<SessionSummaryDto> Sessions
);

// =========================
// Circuit DTOs
// =========================

public sealed record CircuitSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    string Country,
    string? CountryCode
);

public sealed record CircuitDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string Location,
    string Country,
    string? CountryCode,
    string? LayoutMapUrl,
    double? Latitude,
    double? Longitude,
    int? LengthMeters
);

// =========================
// Driver/Team DTOs
// =========================

public sealed record DriverSummaryDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Slug,
    string? Abbreviation,
    string? Nationality,
    string? HeadshotUrl
);

public sealed record TeamSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    string? ShortName,
    string? LogoUrl,
    string? PrimaryColor
);

// =========================
// Entrant DTOs (Driver + Team combo)
// =========================

public sealed record EntrantDto(
    Guid Id,
    DriverSummaryDto Driver,
    TeamSummaryDto Team
);

// =========================
// User Log DTOs
// =========================

public sealed record LogSummaryDto(
    Guid Id,
    Guid SessionId,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked,
    bool IsAttended,
    DateTime LoggedAt,
    DateOnly? DateWatched
);

public sealed record CreateLogRequest(
    Guid SessionId,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked,
    bool IsAttended,
    DateOnly? DateWatched
);

// =========================
// Spoiler Reveal DTOs
// =========================

/// <summary>
/// Request to reveal spoilers for a session.
/// Requires explicit confirmation to prevent accidental reveals.
/// </summary>
public sealed record RevealSpoilersRequest(
    Guid SessionId,
    bool Confirmed
);

/// <summary>
/// Response after revealing spoilers.
/// </summary>
public sealed record RevealSpoilersResponse(
    bool Success,
    string? Message,
    SessionResultsDto? Results
);
