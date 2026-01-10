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
    int? CurrentSeasonRoundCount,
    IReadOnlyList<string> BrandColors
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
    // The Third Turn field (historical data)
    string? GoverningBody,
    IReadOnlyList<string> BrandColors,
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
/// Session participation info for a driver/team filter.
/// Includes team info when driver drove for multiple teams.
/// </summary>
public sealed record SessionParticipationDto(
    string SessionType,
    string? TeamName = null,
    string? TeamSlug = null
);

/// <summary>
/// Round summary shown in season context.
/// When a driver/team filter is applied, FeaturingSessions shows which sessions they participated in.
/// For drivers with multiple teams in a season, FeaturingSessionsWithTeam provides team context.
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
    bool IsUpcoming,
    IReadOnlyList<string>? FeaturingSessions = null,
    IReadOnlyList<SessionParticipationDto>? FeaturingSessionsWithTeam = null
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
