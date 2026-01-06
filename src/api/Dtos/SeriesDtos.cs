namespace ParcFerme.Api.Dtos;

// =========================
// Series DTOs
// =========================

/// <summary>
/// Series summary for lists.
/// </summary>
public sealed record SeriesSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Description,
    int SeasonCount,
    int? LatestSeasonYear,
    int? CurrentSeasonRoundCount
);

/// <summary>
/// Full series details with seasons list.
/// </summary>
public sealed record SeriesDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Description,
    IReadOnlyList<SeasonSummaryDto> Seasons,
    SeriesStatsDto Stats
);

/// <summary>
/// Series statistics.
/// </summary>
public sealed record SeriesStatsDto(
    int TotalSeasons,
    int TotalRounds,
    int TotalSessions,
    int TotalDrivers,
    int TotalTeams,
    int TotalCircuits
);

// =========================
// Season DTOs
// =========================

/// <summary>
/// Season summary for lists.
/// </summary>
public sealed record SeasonSummaryDto(
    Guid Id,
    int Year,
    string SeriesName,
    string SeriesSlug,
    int RoundCount,
    bool IsCurrent,
    bool IsCompleted
);

/// <summary>
/// Full season details with rounds list.
/// </summary>
public sealed record SeasonDetailDto(
    Guid Id,
    int Year,
    SeriesSummaryDto Series,
    IReadOnlyList<RoundSummaryForSeasonDto> Rounds,
    SeasonStatsDto Stats
);

/// <summary>
/// Season statistics.
/// </summary>
public sealed record SeasonStatsDto(
    int TotalRounds,
    int CompletedRounds,
    int UpcomingRounds,
    int TotalSessions,
    int TotalEntrants,
    DateOnly? SeasonStart,
    DateOnly? SeasonEnd
);

// =========================
// Round DTOs (for Season context)
// =========================

/// <summary>
/// Round summary shown in season context.
/// </summary>
public sealed record RoundSummaryForSeasonDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart,
    DateOnly DateEnd,
    CircuitSummaryForRoundDto Circuit,
    int SessionCount,
    bool IsCompleted,
    bool IsCurrent,
    bool IsUpcoming
);

/// <summary>
/// Minimal circuit info for round display.
/// </summary>
public sealed record CircuitSummaryForRoundDto(
    Guid Id,
    string Name,
    string Slug,
    string Country,
    string? CountryCode
);
