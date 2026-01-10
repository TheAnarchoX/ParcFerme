namespace ParcFerme.Api.Dtos;

// =========================
// Driver DTOs (Discovery Pages)
// =========================

/// <summary>
/// Driver list item for browse/discovery pages.
/// Includes basic info and current team context.
/// </summary>
public sealed record DriverListItemDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Slug,
    string? Abbreviation,
    string? Nationality,
    string? HeadshotUrl,
    int? DriverNumber,
    
    // Current team context (most recent entrant)
    TeamSummaryDto? CurrentTeam,
    
    // Stats
    int SeasonsCount,
    int TeamsCount
);

/// <summary>
/// Full driver profile for the driver detail page.
/// Includes career history and participation summary.
/// </summary>
public sealed record DriverDetailDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Slug,
    string? Abbreviation,
    string? Nationality,
    string? HeadshotUrl,
    int? DriverNumber,
    DateOnly? DateOfBirth,
    string? WikipediaUrl,
    // The Third Turn fields (historical data)
    string? Nickname,
    string? PlaceOfBirth,
    
    // Career summary
    IReadOnlyList<DriverCareerEntryDto> Career,
    
    // Stats
    DriverStatsDto Stats
);

/// <summary>
/// Career entry showing a driver's team for a specific season/series.
/// Role indicates if this was a regular, reserve, FP1-only, or test position.
/// </summary>
public sealed record DriverCareerEntryDto(
    int Year,
    string SeriesName,
    string SeriesSlug,
    TeamSummaryDto Team,
    int RoundsParticipated,
    string Role
);

/// <summary>
/// Driver statistics across all series.
/// Spoiler-safe - counts only, no result data.
/// </summary>
public sealed record DriverStatsDto(
    int TotalSeasons,
    int TotalRounds,
    int TotalTeams,
    int TotalSeries,
    int? FirstSeasonYear,
    int? LastSeasonYear
);

/// <summary>
/// Season summary for a driver's participation.
/// </summary>
public sealed record DriverSeasonDto(
    Guid SeasonId,
    int Year,
    string SeriesName,
    string SeriesSlug,
    string? SeriesLogoUrl,
    TeamSummaryDto Team,
    int RoundsParticipated
);

// =========================
// List Response with Pagination
// =========================

/// <summary>
/// Paginated response for driver list.
/// </summary>
public sealed record DriverListResponse(
    IReadOnlyList<DriverListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);
