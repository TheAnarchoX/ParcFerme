using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Seasons browsing endpoints - cross-series season discovery with advanced filtering.
/// </summary>
[Route("api/v1/[controller]")]
public sealed class SeasonsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<SeasonsController> _logger;

    public SeasonsController(
        ParcFermeDbContext db,
        ILogger<SeasonsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Browse seasons across all series with advanced filtering.
    /// Supports filtering by driver participation, circuit hosting, and year range.
    /// </summary>
    /// <param name="series">Optional series slug filter.</param>
    /// <param name="driverSlug">Optional filter: only seasons where this driver participated.</param>
    /// <param name="circuitSlug">Optional filter: only seasons with races at this circuit.</param>
    /// <param name="fromYear">Optional minimum year filter.</param>
    /// <param name="toYear">Optional maximum year filter.</param>
    /// <param name="status">Optional status filter: "current", "completed", "upcoming".</param>
    /// <param name="sortBy">Sort field: "year" (default), "rounds", "series".</param>
    /// <param name="sortOrder">Sort direction: "desc" (default) or "asc".</param>
    /// <param name="page">Page number (1-indexed).</param>
    /// <param name="pageSize">Items per page (default 50, max 100).</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet]
    [CacheResponse(DurationSeconds = 300, VaryByQueryParams = ["series", "driverSlug", "circuitSlug", "fromYear", "toYear", "status", "sortBy", "sortOrder", "page", "pageSize"])]
    [ProducesResponseType(typeof(SeasonBrowseResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> BrowseSeasons(
        [FromQuery] string? series,
        [FromQuery] string? driverSlug,
        [FromQuery] string? circuitSlug,
        [FromQuery] int? fromYear,
        [FromQuery] int? toYear,
        [FromQuery] string? status,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var skip = (page - 1) * pageSize;

        var now = DateTime.UtcNow;
        var currentYear = now.Year;
        var todayDate = DateOnly.FromDateTime(now);

        // Build base query
        var query = _db.Seasons
            .Include(s => s.Series)
            .Include(s => s.Rounds)
            .AsQueryable();

        // Apply series filter
        if (!string.IsNullOrEmpty(series))
        {
            query = query.Where(s => s.Series.Slug == series.ToLowerInvariant());
        }

        // Apply year range filters
        if (fromYear.HasValue)
        {
            query = query.Where(s => s.Year >= fromYear.Value);
        }
        if (toYear.HasValue)
        {
            query = query.Where(s => s.Year <= toYear.Value);
        }

        // Apply status filter
        if (!string.IsNullOrEmpty(status))
        {
            switch (status.ToLowerInvariant())
            {
                case "current":
                    query = query.Where(s => s.Year == currentYear);
                    break;
                case "completed":
                    query = query.Where(s => s.Rounds.All(r => r.DateEnd < todayDate));
                    break;
                case "upcoming":
                    query = query.Where(s => s.Rounds.Any(r => r.DateStart > todayDate));
                    break;
            }
        }

        // Apply driver filter - only seasons where driver participated
        if (!string.IsNullOrEmpty(driverSlug))
        {
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Slug == driverSlug.ToLowerInvariant(), ct);
            if (driver != null)
            {
                var driverSeasonIds = await _db.Entrants
                    .Where(e => e.DriverId == driver.Id)
                    .Select(e => e.Round.SeasonId)
                    .Distinct()
                    .ToListAsync(ct);
                
                query = query.Where(s => driverSeasonIds.Contains(s.Id));
            }
            else
            {
                // Driver not found - return empty result
                return Ok(new SeasonBrowseResponse(
                    Items: [],
                    TotalCount: 0,
                    Page: page,
                    PageSize: pageSize,
                    HasMore: false,
                    Filters: new SeasonBrowseFiltersDto(null, driverSlug, null)
                ));
            }
        }

        // Apply circuit filter - only seasons with races at this circuit
        if (!string.IsNullOrEmpty(circuitSlug))
        {
            var circuit = await _db.Circuits.FirstOrDefaultAsync(c => c.Slug == circuitSlug.ToLowerInvariant(), ct);
            if (circuit != null)
            {
                var circuitSeasonIds = await _db.Rounds
                    .Where(r => r.CircuitId == circuit.Id)
                    .Select(r => r.SeasonId)
                    .Distinct()
                    .ToListAsync(ct);
                
                query = query.Where(s => circuitSeasonIds.Contains(s.Id));
            }
            else
            {
                // Circuit not found - return empty result
                return Ok(new SeasonBrowseResponse(
                    Items: [],
                    TotalCount: 0,
                    Page: page,
                    PageSize: pageSize,
                    HasMore: false,
                    Filters: new SeasonBrowseFiltersDto(null, null, circuitSlug)
                ));
            }
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync(ct);

        // Apply sorting
        var sortByLower = (sortBy ?? "year").ToLowerInvariant();
        var isDescending = (sortOrder ?? "desc").Equals("desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<Models.Season> orderedQuery = sortByLower switch
        {
            "rounds" => isDescending
                ? query.OrderByDescending(s => s.Rounds.Count).ThenByDescending(s => s.Year)
                : query.OrderBy(s => s.Rounds.Count).ThenBy(s => s.Year),
            "series" => isDescending
                ? query.OrderByDescending(s => s.Series.Name).ThenByDescending(s => s.Year)
                : query.OrderBy(s => s.Series.Name).ThenBy(s => s.Year),
            _ => isDescending // "year" or default
                ? query.OrderByDescending(s => s.Year).ThenBy(s => s.Series.Name)
                : query.OrderBy(s => s.Year).ThenBy(s => s.Series.Name)
        };

        // Get paginated results
        var seasons = await orderedQuery
            .Skip(skip)
            .Take(pageSize)
            .Select(s => new SeasonBrowseItemDto(
                Id: s.Id,
                Year: s.Year,
                SeriesName: s.Series.Name,
                SeriesSlug: s.Series.Slug,
                SeriesBrandColors: s.Series.BrandColors.Count > 0 ? s.Series.BrandColors : GetDefaultBrandColors(s.Series.Slug),
                RoundCount: s.Rounds.Count,
                IsCurrent: s.Year == currentYear,
                IsCompleted: s.Rounds.All(r => r.DateEnd < todayDate),
                SeasonStart: s.Rounds.Min(r => (DateOnly?)r.DateStart),
                SeasonEnd: s.Rounds.Max(r => (DateOnly?)r.DateEnd)
            ))
            .ToListAsync(ct);

        // Build active filters summary for display
        var activeFilters = new SeasonBrowseFiltersDto(
            SeriesSlug: series,
            DriverSlug: driverSlug,
            CircuitSlug: circuitSlug
        );

        return Ok(new SeasonBrowseResponse(
            Items: seasons,
            TotalCount: totalCount,
            Page: page,
            PageSize: pageSize,
            HasMore: skip + pageSize < totalCount,
            Filters: activeFilters
        ));
    }

    /// <summary>
    /// Get summary stats for season browsing (for filter UI).
    /// </summary>
    [HttpGet("stats")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(SeasonBrowseStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBrowseStats(CancellationToken ct)
    {
        var years = await _db.Seasons
            .Select(s => s.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToListAsync(ct);

        var seriesCounts = await _db.Seasons
            .GroupBy(s => new { s.Series.Slug, s.Series.Name })
            .Select(g => new SeriesSeasonCount(g.Key.Slug, g.Key.Name, g.Count()))
            .ToListAsync(ct);

        var currentYear = DateTime.UtcNow.Year;
        var todayDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalSeasons = await _db.Seasons.CountAsync(ct);
        var currentSeasons = await _db.Seasons.CountAsync(s => s.Year == currentYear, ct);
        var completedSeasons = await _db.Seasons.CountAsync(s => s.Rounds.All(r => r.DateEnd < todayDate), ct);

        return Ok(new SeasonBrowseStatsDto(
            YearRange: years.Count > 0 ? new YearRangeDto(years.Min(), years.Max()) : null,
            AvailableYears: years,
            SeriesCounts: seriesCounts,
            TotalSeasons: totalSeasons,
            CurrentSeasons: currentSeasons,
            CompletedSeasons: completedSeasons
        ));
    }

    /// <summary>
    /// Get default brand colors for a series.
    /// </summary>
    private static List<string> GetDefaultBrandColors(string slug) => slug.ToLowerInvariant() switch
    {
        "f1" or "formula-1" => ["#E10600", "#FFFFFF", "#000000"],
        "motogp" => ["#FF6B00", "#000000"],
        "wec" => ["#00B9FF", "#FFFFFF"],
        "indycar" => ["#e51937", "#000000"],
        "formula-e" or "fe" => ["#00BCD4"],
        "nascar" => ["#FFD659", "#E4002B", "#007AC2", "#000000"],
        _ => ["#666666"]
    };
}

// =========================
// Season Browse DTOs
// =========================

/// <summary>
/// Response for season browsing endpoint.
/// </summary>
public sealed record SeasonBrowseResponse(
    IReadOnlyList<SeasonBrowseItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore,
    SeasonBrowseFiltersDto Filters
);

/// <summary>
/// Season item for browse list.
/// </summary>
public sealed record SeasonBrowseItemDto(
    Guid Id,
    int Year,
    string SeriesName,
    string SeriesSlug,
    IReadOnlyList<string> SeriesBrandColors,
    int RoundCount,
    bool IsCurrent,
    bool IsCompleted,
    DateOnly? SeasonStart,
    DateOnly? SeasonEnd
);

/// <summary>
/// Active filter summary.
/// </summary>
public sealed record SeasonBrowseFiltersDto(
    string? SeriesSlug,
    string? DriverSlug,
    string? CircuitSlug
);

/// <summary>
/// Stats for season browse UI.
/// </summary>
public sealed record SeasonBrowseStatsDto(
    YearRangeDto? YearRange,
    IReadOnlyList<int> AvailableYears,
    IReadOnlyList<SeriesSeasonCount> SeriesCounts,
    int TotalSeasons,
    int CurrentSeasons,
    int CompletedSeasons
);

/// <summary>
/// Year range info.
/// </summary>
public sealed record YearRangeDto(int Min, int Max);

/// <summary>
/// Season count per series.
/// </summary>
public sealed record SeriesSeasonCount(string Slug, string Name, int Count);
