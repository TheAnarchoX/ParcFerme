namespace ParcFerme.Api.Dtos;

// =========================
// Team DTOs (Discovery Pages)
// =========================

/// <summary>
/// Team list item for browse/discovery pages.
/// Includes basic info and current driver roster.
/// </summary>
public sealed record TeamListItemDto(
    Guid Id,
    string Name,
    string Slug,
    string? ShortName,
    string? LogoUrl,
    string? PrimaryColor,
    string? Nationality,
    
    // Stats
    int SeasonsCount,
    int DriversCount
);

/// <summary>
/// Full team profile for the team detail page.
/// Includes driver roster and participation summary.
/// </summary>
public sealed record TeamDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string? ShortName,
    string? LogoUrl,
    string? PrimaryColor,
    string? Nationality,
    string? WikipediaUrl,
    
    // Current roster (most recent season)
    IReadOnlyList<DriverSummaryDto> CurrentDrivers,
    
    // Historical roster by season
    IReadOnlyList<TeamSeasonRosterDto> SeasonHistory,
    
    // Stats
    TeamStatsDto Stats
);

/// <summary>
/// Team's driver roster for a specific season.
/// </summary>
public sealed record TeamSeasonRosterDto(
    int Year,
    string SeriesName,
    string SeriesSlug,
    string? SeriesLogoUrl,
    IReadOnlyList<DriverSummaryDto> Drivers,
    int RoundsParticipated
);

/// <summary>
/// Team statistics across all series.
/// Spoiler-safe - counts only, no result data.
/// </summary>
public sealed record TeamStatsDto(
    int TotalSeasons,
    int TotalRounds,
    int TotalDrivers,
    int TotalSeries,
    int? FirstSeasonYear,
    int? LastSeasonYear
);

/// <summary>
/// Season summary for a team's participation.
/// </summary>
public sealed record TeamSeasonDto(
    Guid SeasonId,
    int Year,
    string SeriesName,
    string SeriesSlug,
    string? SeriesLogoUrl,
    IReadOnlyList<DriverSummaryDto> Drivers,
    int RoundsParticipated
);

// =========================
// List Response with Pagination
// =========================

/// <summary>
/// Paginated response for team list.
/// </summary>
public sealed record TeamListResponse(
    IReadOnlyList<TeamListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);
