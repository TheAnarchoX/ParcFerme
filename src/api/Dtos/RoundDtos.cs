namespace ParcFerme.Api.Dtos;

// =========================
// Round DTOs (Standalone)
// =========================

/// <summary>
/// Full round detail for the round (weekend) detail page.
/// Includes circuit context, sessions timeline, and spoiler-safe metadata.
/// </summary>
public sealed record RoundPageDetailDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart,
    DateOnly DateEnd,
    int? OpenF1MeetingKey,
    
    // Series context
    SeriesBrandDto Series,
    int Year,
    
    // Circuit context
    CircuitDetailDto Circuit,
    
    // Sessions timeline (ordered by start time)
    IReadOnlyList<SessionTimelineDto> Sessions,
    
    // Stats
    RoundStatsDto Stats,
    
    // Status
    bool IsCompleted,
    bool IsCurrent,
    bool IsUpcoming
);

/// <summary>
/// Minimal series info with brand colors for round context.
/// </summary>
public sealed record SeriesBrandDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    IReadOnlyList<string> BrandColors
);

/// <summary>
/// Session in timeline view for round detail page.
/// Minimal spoiler exposure - status and whether user has logged.
/// </summary>
public sealed record SessionTimelineDto(
    Guid Id,
    string Type,
    string DisplayName,
    DateTime StartTimeUtc,
    string Status,
    bool IsLogged,
    bool HasResults
);

/// <summary>
/// Round statistics.
/// Spoiler-safe aggregates only.
/// </summary>
public sealed record RoundStatsDto(
    int TotalSessions,
    int CompletedSessions,
    int UpcomingSessions,
    int TotalEntrants,
    int TotalLogs,
    double? AverageExcitement
);

/// <summary>
/// Adjacent round for navigation (prev/next).
/// </summary>
public sealed record AdjacentRoundDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart
);

/// <summary>
/// Response with round detail and navigation context.
/// </summary>
public sealed record RoundPageResponse(
    RoundPageDetailDto Round,
    AdjacentRoundDto? PreviousRound,
    AdjacentRoundDto? NextRound
);
