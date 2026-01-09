namespace ParcFerme.Api.Dtos;

// DTOs for Circuit discovery endpoints.

// =========================
// List DTOs
// =========================

/// <summary>
/// Circuit item for list/browse pages.
/// </summary>
public sealed record CircuitListItemDto(
    string Id,
    string Name,
    string Slug,
    string Location,
    string Country,
    string? CountryCode,
    string? LayoutMapUrl,
    int RoundsHosted,
    int? LengthMeters
);

/// <summary>
/// Paginated response for circuit list.
/// </summary>
public sealed record CircuitListResponse(
    IReadOnlyList<CircuitListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);

// =========================
// Detail DTOs
// =========================

/// <summary>
/// Full circuit profile for the circuit detail page.
/// </summary>
public sealed record CircuitDiscoveryDetailDto(
    string Id,
    string Name,
    string Slug,
    string Location,
    string Country,
    string? CountryCode,
    string? LayoutMapUrl,
    double? Latitude,
    double? Longitude,
    int? LengthMeters,
    int? Altitude,
    string? WikipediaUrl,
    // The Third Turn fields (historical data)
    string? TrackType,
    string? TrackStatus,
    int? OpenedYear,
    IReadOnlyList<GrandstandDto> Grandstands,
    IReadOnlyList<CircuitSeasonSummaryDto> SeasonHistory,
    CircuitStatsDto Stats
);

/// <summary>
/// Grandstand information for venue ratings.
/// </summary>
public sealed record GrandstandDto(
    string Id,
    string Name,
    string? Description
);

/// <summary>
/// Circuit statistics across all series.
/// </summary>
public sealed record CircuitStatsDto(
    int TotalRounds,
    int TotalSeries,
    int TotalSeasons,
    int? FirstSeasonYear,
    int? LastSeasonYear
);

/// <summary>
/// Season summary for circuit hosting history.
/// </summary>
public sealed record CircuitSeasonSummaryDto(
    int Year,
    string SeriesName,
    string SeriesSlug,
    string? SeriesLogoUrl,
    string RoundName,
    string RoundSlug,
    int RoundNumber
);

/// <summary>
/// Season detail for circuit endpoint.
/// </summary>
public sealed record CircuitSeasonDto(
    string SeasonId,
    int Year,
    string SeriesName,
    string SeriesSlug,
    string? SeriesLogoUrl,
    string RoundName,
    string RoundSlug,
    int RoundNumber,
    int SessionsCount
);
