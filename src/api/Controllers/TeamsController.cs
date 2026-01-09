using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Team discovery endpoints - browse and view team profiles.
/// All data is spoiler-safe (no result information exposed).
/// </summary>
[Route("api/v1/[controller]")]
public sealed class TeamsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<TeamsController> _logger;

    public TeamsController(
        ParcFermeDbContext db,
        ILogger<TeamsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all teams with optional filtering and search.
    /// Returns paginated list with driver count.
    /// </summary>
    /// <param name="series">Optional series slug to filter by (e.g., "formula-1").</param>
    /// <param name="search">Optional search query (searches name, short name, nationality).</param>
    /// <param name="nationality">Optional nationality filter (exact match, case-insensitive).</param>
    /// <param name="status">Optional status filter: "active" (competed 2024+), "historical" (pre-2024 only).</param>
    /// <param name="sortBy">Sort field: "name" (default), "seasons", "recent".</param>
    /// <param name="sortOrder">Sort direction: "asc" (default) or "desc".</param>
    /// <param name="page">Page number (1-indexed).</param>
    /// <param name="pageSize">Number of items per page (default 50, max 100).</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet]
    [CacheResponse(DurationSeconds = 300, VaryByQueryParams = ["series", "search", "nationality", "status", "sortBy", "sortOrder", "page", "pageSize"])]
    [ProducesResponseType(typeof(TeamListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeams(
        [FromQuery] string? series,
        [FromQuery] string? search,
        [FromQuery] string? nationality,
        [FromQuery] string? status,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortOrder,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        // Validate pagination
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var skip = (page - 1) * pageSize;

        // Build base query
        var baseQuery = _db.Teams.AsQueryable();

        // Apply search filter if provided
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            baseQuery = baseQuery.Where(t =>
                t.Name.ToLower().Contains(searchLower) ||
                (t.ShortName != null && t.ShortName.ToLower().Contains(searchLower)) ||
                (t.Nationality != null && t.Nationality.ToLower().Contains(searchLower)));
        }
        
        // Apply nationality filter if provided
        if (!string.IsNullOrWhiteSpace(nationality))
        {
            baseQuery = baseQuery.Where(t => 
                t.Nationality != null && t.Nationality.ToLower() == nationality.ToLowerInvariant());
        }
        
        // Apply status filter (active = competed 2024+, historical = pre-2024 only)
        if (!string.IsNullOrWhiteSpace(status))
        {
            var activeYear = 2024;
            var activeTeamIds = await _db.Entrants
                .Where(e => e.Round.Season.Year >= activeYear)
                .Select(e => e.TeamId)
                .Distinct()
                .ToListAsync(ct);
                
            if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                baseQuery = baseQuery.Where(t => activeTeamIds.Contains(t.Id));
            }
            else if (status.Equals("historical", StringComparison.OrdinalIgnoreCase))
            {
                baseQuery = baseQuery.Where(t => !activeTeamIds.Contains(t.Id));
            }
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
            
            // Get team IDs that have entrants in this series
            var roundIds = await _db.Rounds
                .Where(r => r.Season.SeriesId == seriesId)
                .Select(r => r.Id)
                .ToListAsync(ct);
            
            var teamIds = await _db.Entrants
                .Where(e => roundIds.Contains(e.RoundId))
                .Select(e => e.TeamId)
                .Distinct()
                .ToListAsync(ct);
            
            baseQuery = baseQuery.Where(t => teamIds.Contains(t.Id));
        }

        // Get total count
        var totalCount = await baseQuery.CountAsync(ct);

        // For sort options that need entrant data (seasons, recent), we need to compute those first
        var sortByLower = (sortBy ?? "name").ToLowerInvariant();
        var isDescending = (sortOrder ?? "asc").Equals("desc", StringComparison.OrdinalIgnoreCase);
        
        List<Models.Team> teams;
        
        if (sortByLower == "seasons" || sortByLower == "recent")
        {
            // Need to compute season stats for sorting
            var teamIdsForStats = await baseQuery.Select(t => t.Id).ToListAsync(ct);
            
            // Get season data for all filtered teams
            var teamSeasonStats = await _db.Entrants
                .Where(e => teamIdsForStats.Contains(e.TeamId))
                .GroupBy(e => e.TeamId)
                .Select(g => new 
                {
                    TeamId = g.Key,
                    SeasonCount = g.Select(e => e.Round.SeasonId).Distinct().Count(),
                    LatestYear = g.Max(e => e.Round.Season.Year)
                })
                .ToListAsync(ct);
            
            var statsDict = teamSeasonStats.ToDictionary(s => s.TeamId);
            
            // Get all teams first (we need to sort in memory for these fields)
            var allTeams = await baseQuery.ToListAsync(ct);
            
            IEnumerable<Models.Team> sortedTeams = sortByLower == "seasons"
                ? (isDescending
                    ? allTeams.OrderByDescending(t => statsDict.GetValueOrDefault(t.Id)?.SeasonCount ?? 0)
                              .ThenBy(t => t.Name)
                    : allTeams.OrderBy(t => statsDict.GetValueOrDefault(t.Id)?.SeasonCount ?? 0)
                              .ThenBy(t => t.Name))
                : (isDescending
                    ? allTeams.OrderByDescending(t => statsDict.GetValueOrDefault(t.Id)?.LatestYear ?? 0)
                              .ThenBy(t => t.Name)
                    : allTeams.OrderBy(t => statsDict.GetValueOrDefault(t.Id)?.LatestYear ?? 0)
                              .ThenBy(t => t.Name));
            
            teams = sortedTeams.Skip(skip).Take(pageSize).ToList();
        }
        else
        {
            // Name sorting can be done in SQL
            IOrderedQueryable<Models.Team> orderedQuery = isDescending
                ? baseQuery.OrderByDescending(t => t.Name)
                : baseQuery.OrderBy(t => t.Name);
            
            teams = await orderedQuery
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync(ct);
        }

        // Get entrant data for these teams to determine stats
        var teamIdList = teams.Select(t => t.Id).ToList();
        
        var entrants = await _db.Entrants
            .Where(e => teamIdList.Contains(e.TeamId))
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
            .ToListAsync(ct);

        // Build response items
        var items = new List<TeamListItemDto>();
        foreach (var team in teams)
        {
            var teamEntrants = entrants.Where(e => e.TeamId == team.Id).ToList();
            
            items.Add(new TeamListItemDto(
                Id: team.Id,
                Name: team.Name,
                Slug: team.Slug,
                ShortName: team.ShortName,
                LogoUrl: team.LogoUrl,
                PrimaryColor: team.PrimaryColor,
                Nationality: team.Nationality,
                SeasonsCount: teamEntrants
                    .Select(e => e.Round.SeasonId)
                    .Distinct()
                    .Count(),
                DriversCount: teamEntrants
                    .Select(e => e.DriverId)
                    .Distinct()
                    .Count()
            ));
        }

        return Ok(new TeamListResponse(
            Items: items,
            TotalCount: totalCount,
            Page: page,
            PageSize: pageSize,
            HasMore: skip + pageSize < totalCount
        ));
    }

    /// <summary>
    /// Get a specific team by slug with full profile details.
    /// </summary>
    /// <param name="slug">The URL slug for the team (e.g., "red-bull-racing").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Returns the team profile.</response>
    /// <response code="404">Team not found.</response>
    [HttpGet("{slug}")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(TeamDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTeamBySlug(string slug, CancellationToken ct)
    {
        var team = await _db.Teams
            .FirstOrDefaultAsync(t => t.Slug == slug.ToLowerInvariant(), ct);

        if (team is null)
        {
            // Try to find by alias
            var alias = await _db.TeamAliases
                .Include(a => a.Team)
                .FirstOrDefaultAsync(a => a.AliasSlug == slug.ToLowerInvariant(), ct);
            
            if (alias is not null)
            {
                team = alias.Team;
            }
            else
            {
                return NotFoundResult("Team", slug);
            }
        }

        // Get roster data
        var entrants = await _db.Entrants
            .Where(e => e.TeamId == team.Id)
            .Include(e => e.Driver)
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .OrderByDescending(e => e.Round.Season.Year)
            .ThenByDescending(e => e.Round.RoundNumber)
            .ToListAsync(ct);

        // Get current drivers (most recent season)
        var latestSeasonId = entrants.FirstOrDefault()?.Round.SeasonId;
        var currentDrivers = latestSeasonId is not null
            ? entrants
                .Where(e => e.Round.SeasonId == latestSeasonId)
                .Select(e => e.Driver)
                .DistinctBy(d => d.Id)
                .Select(d => new DriverSummaryDto(
                    Id: d.Id,
                    FirstName: d.FirstName,
                    LastName: d.LastName,
                    Slug: d.Slug,
                    Abbreviation: d.Abbreviation,
                    Nationality: d.Nationality,
                    HeadshotUrl: d.HeadshotUrl,
                    DriverNumber: d.DriverNumber,
                    DateOfBirth: d.DateOfBirth,
                    WikipediaUrl: d.WikipediaUrl
                ))
                .ToList()
            : new List<DriverSummaryDto>();

        // Group by year + series for season history
        var seasonHistory = entrants
            .GroupBy(e => new { Year = e.Round.Season.Year, SeriesSlug = e.Round.Season.Series.Slug })
            .Select(g =>
            {
                var first = g.First();
                var drivers = g
                    .Select(e => e.Driver)
                    .DistinctBy(d => d.Id)
                    .Select(d => new DriverSummaryDto(
                        Id: d.Id,
                        FirstName: d.FirstName,
                        LastName: d.LastName,
                        Slug: d.Slug,
                        Abbreviation: d.Abbreviation,
                        Nationality: d.Nationality,
                        HeadshotUrl: d.HeadshotUrl,
                        DriverNumber: d.DriverNumber,
                        DateOfBirth: d.DateOfBirth,
                        WikipediaUrl: d.WikipediaUrl
                    ))
                    .ToList();
                
                return new TeamSeasonRosterDto(
                    Year: g.Key.Year,
                    SeriesName: first.Round.Season.Series.Name,
                    SeriesSlug: first.Round.Season.Series.Slug,
                    SeriesLogoUrl: first.Round.Season.Series.LogoUrl,
                    Drivers: drivers,
                    RoundsParticipated: g.Select(e => e.RoundId).Distinct().Count()
                );
            })
            .OrderByDescending(s => s.Year)
            .ThenBy(s => s.SeriesName)
            .ToList();

        // Calculate stats
        var seasons = entrants.Select(e => e.Round.SeasonId).Distinct().ToList();
        var rounds = entrants.Select(e => e.RoundId).Distinct().ToList();
        var drivers = entrants.Select(e => e.DriverId).Distinct().ToList();
        var series = entrants.Select(e => e.Round.Season.SeriesId).Distinct().ToList();
        var years = entrants.Select(e => e.Round.Season.Year).Distinct().OrderBy(y => y).ToList();

        var stats = new TeamStatsDto(
            TotalSeasons: seasons.Count,
            TotalRounds: rounds.Count,
            TotalDrivers: drivers.Count,
            TotalSeries: series.Count,
            FirstSeasonYear: years.FirstOrDefault(),
            LastSeasonYear: years.LastOrDefault()
        );

        var result = new TeamDetailDto(
            Id: team.Id,
            Name: team.Name,
            Slug: team.Slug,
            ShortName: team.ShortName,
            LogoUrl: team.LogoUrl,
            PrimaryColor: team.PrimaryColor,
            Nationality: team.Nationality,
            WikipediaUrl: team.WikipediaUrl,
            CurrentDrivers: currentDrivers,
            SeasonHistory: seasonHistory,
            Stats: stats
        );

        return Ok(result);
    }

    /// <summary>
    /// Get seasons a team has participated in.
    /// </summary>
    /// <param name="slug">The URL slug for the team.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet("{slug}/seasons")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamSeasonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTeamSeasons(string slug, CancellationToken ct)
    {
        var team = await _db.Teams
            .FirstOrDefaultAsync(t => t.Slug == slug.ToLowerInvariant(), ct);

        if (team is null)
        {
            return NotFoundResult("Team", slug);
        }

        var entrants = await _db.Entrants
            .Where(e => e.TeamId == team.Id)
            .Include(e => e.Driver)
            .Include(e => e.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .ToListAsync(ct);

        // Group by season
        var seasons = entrants
            .GroupBy(e => e.Round.SeasonId)
            .Select(g =>
            {
                var first = g.First();
                var drivers = g
                    .Select(e => e.Driver)
                    .DistinctBy(d => d.Id)
                    .Select(d => new DriverSummaryDto(
                        Id: d.Id,
                        FirstName: d.FirstName,
                        LastName: d.LastName,
                        Slug: d.Slug,
                        Abbreviation: d.Abbreviation,
                        Nationality: d.Nationality,
                        HeadshotUrl: d.HeadshotUrl,
                        DriverNumber: d.DriverNumber,
                        DateOfBirth: d.DateOfBirth,
                        WikipediaUrl: d.WikipediaUrl
                    ))
                    .ToList();
                
                return new TeamSeasonDto(
                    SeasonId: first.Round.SeasonId,
                    Year: first.Round.Season.Year,
                    SeriesName: first.Round.Season.Series.Name,
                    SeriesSlug: first.Round.Season.Series.Slug,
                    SeriesLogoUrl: first.Round.Season.Series.LogoUrl,
                    Drivers: drivers,
                    RoundsParticipated: g.Select(e => e.RoundId).Distinct().Count()
                );
            })
            .OrderByDescending(s => s.Year)
            .ThenBy(s => s.SeriesName)
            .ToList();

        return Ok(seasons);
    }
}
