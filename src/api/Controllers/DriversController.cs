using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Driver discovery endpoints - browse and view driver profiles.
/// All data is spoiler-safe (no result information exposed).
/// </summary>
[Route("api/v1/[controller]")]
public sealed class DriversController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<DriversController> _logger;

    public DriversController(
        ParcFermeDbContext db,
        ILogger<DriversController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all drivers with optional filtering and search.
    /// Returns paginated list with current team context.
    /// </summary>
    /// <param name="series">Optional series slug to filter by (e.g., "formula-1").</param>
    /// <param name="search">Optional search query (searches name, nationality, abbreviation).</param>
    /// <param name="page">Page number (1-indexed).</param>
    /// <param name="pageSize">Number of items per page (default 50, max 100).</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet]
    [CacheResponse(DurationSeconds = 300, VaryByQueryParams = ["series", "search", "page", "pageSize"])]
    [ProducesResponseType(typeof(DriverListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDrivers(
        [FromQuery] string? series,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        // Validate pagination
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var skip = (page - 1) * pageSize;

        // Build base query
        var baseQuery = _db.Drivers.AsQueryable();

        // Apply search filter if provided
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            baseQuery = baseQuery.Where(d =>
                d.FirstName.ToLower().Contains(searchLower) ||
                d.LastName.ToLower().Contains(searchLower) ||
                (d.FirstName + " " + d.LastName).ToLower().Contains(searchLower) ||
                (d.Nationality != null && d.Nationality.ToLower().Contains(searchLower)) ||
                (d.Abbreviation != null && d.Abbreviation.ToLower().Contains(searchLower)));
        }

        // Filter by series if specified
        Guid? seriesId = null;
        if (!string.IsNullOrEmpty(series))
        {
            var seriesEntity = await _db.Series
                .FirstOrDefaultAsync(s => s.Slug == series.ToLowerInvariant(), ct);
            
            if (seriesEntity is null)
            {
                return NotFoundResult("Series", series);
            }
            
            seriesId = seriesEntity.Id;
            
            // Get driver IDs that have entrants in this series
            var roundIds = await _db.Rounds
                .Where(r => r.Season.SeriesId == seriesId)
                .Select(r => r.Id)
                .ToListAsync(ct);
            
            var driverIds = await _db.Entrants
                .Where(e => roundIds.Contains(e.RoundId))
                .Select(e => e.DriverId)
                .Distinct()
                .ToListAsync(ct);
            
            baseQuery = baseQuery.Where(d => driverIds.Contains(d.Id));
        }

        // Get total count
        var totalCount = await baseQuery.CountAsync(ct);

        // Get drivers with pagination
        var drivers = await baseQuery
            .OrderBy(d => d.LastName)
            .ThenBy(d => d.FirstName)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync(ct);

        // Get entrant data for these drivers to determine current team and stats
        var driverIdList = drivers.Select(d => d.Id).ToList();
        
        var entrants = await _db.Entrants
            .Where(e => driverIdList.Contains(e.DriverId))
            .Include(e => e.Team)
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
            .ToListAsync(ct);

        // Build response items
        var items = new List<DriverListItemDto>();
        foreach (var driver in drivers)
        {
            var driverEntrants = entrants.Where(e => e.DriverId == driver.Id).ToList();
            
            // Get current/most recent team
            var latestEntrant = driverEntrants
                .OrderByDescending(e => e.Round.Season.Year)
                .ThenByDescending(e => e.Round.RoundNumber)
                .FirstOrDefault();
            
            TeamSummaryDto? currentTeam = null;
            if (latestEntrant is not null)
            {
                currentTeam = new TeamSummaryDto(
                    Id: latestEntrant.Team.Id,
                    Name: latestEntrant.Team.Name,
                    Slug: latestEntrant.Team.Slug,
                    ShortName: latestEntrant.Team.ShortName,
                    LogoUrl: latestEntrant.Team.LogoUrl,
                    PrimaryColor: latestEntrant.Team.PrimaryColor,
                    Nationality: latestEntrant.Team.Nationality,
                    WikipediaUrl: latestEntrant.Team.WikipediaUrl
                );
            }
            
            items.Add(new DriverListItemDto(
                Id: driver.Id,
                FirstName: driver.FirstName,
                LastName: driver.LastName,
                Slug: driver.Slug,
                Abbreviation: driver.Abbreviation,
                Nationality: driver.Nationality,
                HeadshotUrl: driver.HeadshotUrl,
                DriverNumber: driver.DriverNumber,
                CurrentTeam: currentTeam,
                SeasonsCount: driverEntrants
                    .Select(e => e.Round.SeasonId)
                    .Distinct()
                    .Count(),
                TeamsCount: driverEntrants
                    .Select(e => e.TeamId)
                    .Distinct()
                    .Count()
            ));
        }

        return Ok(new DriverListResponse(
            Items: items,
            TotalCount: totalCount,
            Page: page,
            PageSize: pageSize,
            HasMore: skip + pageSize < totalCount
        ));
    }

    /// <summary>
    /// Get a specific driver by slug with full profile details.
    /// </summary>
    /// <param name="slug">The URL slug for the driver (e.g., "max-verstappen").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Returns the driver profile.</response>
    /// <response code="404">Driver not found.</response>
    [HttpGet("{slug}")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(DriverDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDriverBySlug(string slug, CancellationToken ct)
    {
        var driver = await _db.Drivers
            .FirstOrDefaultAsync(d => d.Slug == slug.ToLowerInvariant(), ct);

        if (driver is null)
        {
            // Try to find by alias
            var alias = await _db.DriverAliases
                .Include(a => a.Driver)
                .FirstOrDefaultAsync(a => a.AliasSlug == slug.ToLowerInvariant(), ct);
            
            if (alias is not null)
            {
                driver = alias.Driver;
            }
            else
            {
                return NotFoundResult("Driver", slug);
            }
        }

        // Get career data
        var entrants = await _db.Entrants
            .Where(e => e.DriverId == driver.Id)
            .Include(e => e.Team)
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .OrderByDescending(e => e.Round.Season.Year)
            .ThenByDescending(e => e.Round.RoundNumber)
            .ToListAsync(ct);

        // Group by year + series + team
        var careerEntries = entrants
            .GroupBy(e => new { Year = e.Round.Season.Year, SeriesSlug = e.Round.Season.Series.Slug, TeamId = e.TeamId })
            .Select(g =>
            {
                var first = g.First();
                return new DriverCareerEntryDto(
                    Year: g.Key.Year,
                    SeriesName: first.Round.Season.Series.Name,
                    SeriesSlug: first.Round.Season.Series.Slug,
                    Team: new TeamSummaryDto(
                        Id: first.Team.Id,
                        Name: first.Team.Name,
                        Slug: first.Team.Slug,
                        ShortName: first.Team.ShortName,
                        LogoUrl: first.Team.LogoUrl,
                        PrimaryColor: first.Team.PrimaryColor,
                        Nationality: first.Team.Nationality,
                        WikipediaUrl: first.Team.WikipediaUrl
                    ),
                    RoundsParticipated: g.Select(e => e.RoundId).Distinct().Count()
                );
            })
            .OrderByDescending(c => c.Year)
            .ThenBy(c => c.SeriesName)
            .ToList();

        // Calculate stats
        var seasons = entrants.Select(e => e.Round.SeasonId).Distinct().ToList();
        var rounds = entrants.Select(e => e.RoundId).Distinct().ToList();
        var teams = entrants.Select(e => e.TeamId).Distinct().ToList();
        var series = entrants.Select(e => e.Round.Season.SeriesId).Distinct().ToList();
        var years = entrants.Select(e => e.Round.Season.Year).Distinct().OrderBy(y => y).ToList();

        var stats = new DriverStatsDto(
            TotalSeasons: seasons.Count,
            TotalRounds: rounds.Count,
            TotalTeams: teams.Count,
            TotalSeries: series.Count,
            FirstSeasonYear: years.FirstOrDefault(),
            LastSeasonYear: years.LastOrDefault()
        );

        var result = new DriverDetailDto(
            Id: driver.Id,
            FirstName: driver.FirstName,
            LastName: driver.LastName,
            Slug: driver.Slug,
            Abbreviation: driver.Abbreviation,
            Nationality: driver.Nationality,
            HeadshotUrl: driver.HeadshotUrl,
            DriverNumber: driver.DriverNumber,
            DateOfBirth: driver.DateOfBirth,
            WikipediaUrl: driver.WikipediaUrl,
            Career: careerEntries,
            Stats: stats
        );

        return Ok(result);
    }

    /// <summary>
    /// Get seasons a driver has participated in.
    /// </summary>
    /// <param name="slug">The URL slug for the driver.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet("{slug}/seasons")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(IReadOnlyList<DriverSeasonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDriverSeasons(string slug, CancellationToken ct)
    {
        var driver = await _db.Drivers
            .FirstOrDefaultAsync(d => d.Slug == slug.ToLowerInvariant(), ct);

        if (driver is null)
        {
            return NotFoundResult("Driver", slug);
        }

        var entrants = await _db.Entrants
            .Where(e => e.DriverId == driver.Id)
            .Include(e => e.Team)
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .ToListAsync(ct);

        // Group by season and get primary team
        var seasons = entrants
            .GroupBy(e => e.Round.SeasonId)
            .Select(g =>
            {
                var first = g.First();
                // Get the team they drove for most rounds
                var primaryTeam = g
                    .GroupBy(e => e.TeamId)
                    .OrderByDescending(tg => tg.Count())
                    .First()
                    .First()
                    .Team;
                
                return new DriverSeasonDto(
                    SeasonId: first.Round.SeasonId,
                    Year: first.Round.Season.Year,
                    SeriesName: first.Round.Season.Series.Name,
                    SeriesSlug: first.Round.Season.Series.Slug,
                    SeriesLogoUrl: first.Round.Season.Series.LogoUrl,
                    Team: new TeamSummaryDto(
                        Id: primaryTeam.Id,
                        Name: primaryTeam.Name,
                        Slug: primaryTeam.Slug,
                        ShortName: primaryTeam.ShortName,
                        LogoUrl: primaryTeam.LogoUrl,
                        PrimaryColor: primaryTeam.PrimaryColor,
                        Nationality: primaryTeam.Nationality,
                        WikipediaUrl: primaryTeam.WikipediaUrl
                    ),
                    RoundsParticipated: g.Select(e => e.RoundId).Distinct().Count()
                );
            })
            .OrderByDescending(s => s.Year)
            .ThenBy(s => s.SeriesName)
            .ToList();

        return Ok(seasons);
    }
}
