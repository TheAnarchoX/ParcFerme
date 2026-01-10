using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Series endpoints - top-level entry point for browsing racing data.
/// </summary>
[Route("api/v1/[controller]")]
public sealed class SeriesController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<SeriesController> _logger;

    public SeriesController(
        ParcFermeDbContext db,
        ILogger<SeriesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all available racing series.
    /// Returns series summaries with season counts and latest season info.
    /// </summary>
    [HttpGet]
    [CacheResponse(DurationSeconds = 300)] // Cache for 5 minutes
    [ProducesResponseType(typeof(IReadOnlyList<SeriesSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllSeries(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var currentYear = now.Year;

        var series = await _db.Series
            .Include(s => s.Seasons)
                .ThenInclude(season => season.Rounds)
            .OrderBy(s => s.UIOrder ?? int.MaxValue)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        var result = series.Select(s =>
        {
            var latestSeason = s.Seasons.MaxBy(season => season.Year);
            var currentSeason = s.Seasons.FirstOrDefault(season => season.Year == currentYear);

            return new SeriesSummaryDto(
                Id: s.Id,
                Name: s.Name,
                Slug: s.Slug,
                LogoUrl: s.LogoUrl,
                Description: GetSeriesDescription(s.Slug),
                SeasonCount: s.Seasons.Count,
                LatestSeasonYear: latestSeason?.Year,
                CurrentSeasonRoundCount: currentSeason?.Rounds.Count,
                BrandColors: s.BrandColors.Count > 0 ? s.BrandColors : GetDefaultBrandColors(s.Slug),
                UIOrder: s.UIOrder
            );
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Get a specific series by slug with full details.
    /// </summary>
    /// <param name="slug">The URL slug for the series (e.g., "f1", "wec", "motogp").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Full series details including seasons, stats, and drivers/teams.</returns>
    /// <response code="200">Returns the series detail.</response>
    /// <response code="404">Series not found.</response>
    [HttpGet("{slug}")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(SeriesDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSeriesBySlug(string slug, CancellationToken ct)
    {
        var series = await _db.Series
            .Include(s => s.Seasons)
                .ThenInclude(season => season.Rounds)
            .FirstOrDefaultAsync(s => s.Slug == slug.ToLowerInvariant(), ct);

        if (series is null)
        {
            return NotFoundResult("Series", slug);
        }

        var currentYear = DateTime.UtcNow.Year;
        var seasons = series.Seasons
            .OrderByDescending(s => s.Year)
            .Select(s => new SeasonSummaryDto(
                Id: s.Id,
                Year: s.Year,
                SeriesName: series.Name,
                SeriesSlug: series.Slug,
                RoundCount: s.Rounds.Count,
                IsCurrent: s.Year == currentYear,
                IsCompleted: IsSeasonCompleted(s)
            ))
            .ToList();

        // Compute stats
        var stats = await GetSeriesStatsAsync(series.Id, ct);

        var result = new SeriesDetailDto(
            Id: series.Id,
            Name: series.Name,
            Slug: series.Slug,
            LogoUrl: series.LogoUrl,
            Description: GetSeriesDescription(series.Slug),
            GoverningBody: series.GoverningBody,
            BrandColors: series.BrandColors.Count > 0 ? series.BrandColors : GetDefaultBrandColors(series.Slug),
            UIOrder: series.UIOrder,
            Seasons: seasons,
            Stats: stats
        );

        return Ok(result);
    }

    /// <summary>
    /// Get seasons for a specific series.
    /// </summary>
    [HttpGet("{slug}/seasons")]
    [CacheResponse(DurationSeconds = 300, VaryByQueryParams = ["fromYear", "toYear"])]
    [ProducesResponseType(typeof(IReadOnlyList<SeasonSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSeasonsBySeriesSlug(
        string slug,
        [FromQuery] int? fromYear,
        [FromQuery] int? toYear,
        CancellationToken ct)
    {
        var series = await _db.Series
            .Include(s => s.Seasons)
                .ThenInclude(season => season.Rounds)
            .FirstOrDefaultAsync(s => s.Slug == slug.ToLowerInvariant(), ct);

        if (series is null)
        {
            return NotFoundResult("Series", slug);
        }

        var currentYear = DateTime.UtcNow.Year;
        var seasonsQuery = series.Seasons.AsEnumerable();

        if (fromYear.HasValue)
        {
            seasonsQuery = seasonsQuery.Where(s => s.Year >= fromYear.Value);
        }

        if (toYear.HasValue)
        {
            seasonsQuery = seasonsQuery.Where(s => s.Year <= toYear.Value);
        }

        var seasons = seasonsQuery
            .OrderByDescending(s => s.Year)
            .Select(s => new SeasonSummaryDto(
                Id: s.Id,
                Year: s.Year,
                SeriesName: series.Name,
                SeriesSlug: series.Slug,
                RoundCount: s.Rounds.Count,
                IsCurrent: s.Year == currentYear,
                IsCompleted: IsSeasonCompleted(s)
            ))
            .ToList();

        return Ok(seasons);
    }

    /// <summary>
    /// Get a specific season by series slug and year.
    /// </summary>
    /// <param name="slug">The URL slug for the series.</param>
    /// <param name="year">The season year.</param>
    /// <param name="driverSlug">Optional driver slug to filter rounds by participation.</param>
    /// <param name="teamSlug">Optional team slug to filter rounds by participation.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet("{slug}/seasons/{year:int}")]
    [CacheResponse(DurationSeconds = 300, VaryByQueryParams = ["driverSlug", "teamSlug"])]
    [ProducesResponseType(typeof(SeasonDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSeasonByYear(
        string slug, 
        int year, 
        [FromQuery] string? driverSlug,
        [FromQuery] string? teamSlug,
        CancellationToken ct)
    {
        var series = await _db.Series
            .FirstOrDefaultAsync(s => s.Slug == slug.ToLowerInvariant(), ct);

        if (series is null)
        {
            return NotFoundResult("Series", slug);
        }

        var season = await _db.Seasons
            .Include(s => s.Rounds)
                .ThenInclude(r => r.Circuit)
            .Include(s => s.Rounds)
                .ThenInclude(r => r.Sessions)
            .FirstOrDefaultAsync(s => s.SeriesId == series.Id && s.Year == year, ct);

        if (season is null)
        {
            return NotFoundResult("Season", $"{slug}/{year}");
        }

        // Get round IDs where the driver/team participated (if filter is provided)
        // Also track which sessions they participated in per round (for badges like "FP1 only")
        HashSet<Guid>? filteredRoundIds = null;
        Dictionary<Guid, List<SessionType>>? sessionsByRound = null;
        Dictionary<Guid, List<SessionParticipationDto>>? sessionsWithTeamByRound = null;
        bool driverHadMultipleTeams = false;
        var seasonRoundIds = season.Rounds.Select(r => r.Id).ToList();
        
        if (!string.IsNullOrEmpty(driverSlug))
        {
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Slug == driverSlug.ToLowerInvariant(), ct);
            if (driver != null)
            {
                // Get entrants for this driver in this season (includes team info)
                var driverEntrants = await _db.Entrants
                    .Where(e => e.DriverId == driver.Id && seasonRoundIds.Contains(e.RoundId))
                    .Include(e => e.Team)
                    .Select(e => new { e.Id, e.RoundId, e.TeamId, TeamName = e.Team.Name, TeamSlug = e.Team.Slug })
                    .ToListAsync(ct);
                
                filteredRoundIds = driverEntrants.Select(e => e.RoundId).Distinct().ToHashSet();
                
                // Check if driver drove for multiple teams this season
                var distinctTeams = driverEntrants.Select(e => e.TeamId).Distinct().ToList();
                driverHadMultipleTeams = distinctTeams.Count > 1;
                
                // Get session types per round from Results, including team info
                var entrantIds = driverEntrants.Select(e => e.Id).ToList();
                var driverSessionResults = await (
                    from res in _db.Results
                    join sess in _db.Set<Session>() on res.SessionId equals sess.Id
                    join ent in _db.Entrants on res.EntrantId equals ent.Id
                    join team in _db.Teams on ent.TeamId equals team.Id
                    where entrantIds.Contains(res.EntrantId)
                    select new { sess.RoundId, sess.Type, TeamName = team.Name, TeamSlug = team.Slug }
                ).Distinct().ToListAsync(ct);
                
                sessionsByRound = driverSessionResults
                    .GroupBy(r => r.RoundId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(x => x.Type).Distinct().OrderBy(t => t).ToList()
                    );
                
                // If driver had multiple teams, also build the detailed team info
                if (driverHadMultipleTeams)
                {
                    sessionsWithTeamByRound = driverSessionResults
                        .GroupBy(r => r.RoundId)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(x => new SessionParticipationDto(
                                x.Type.ToString(),
                                x.TeamName,
                                x.TeamSlug
                            )).OrderBy(s => s.SessionType).ToList()
                        );
                }
            }
            else
            {
                // Driver not found - return empty result
                filteredRoundIds = new HashSet<Guid>();
            }
        }
        else if (!string.IsNullOrEmpty(teamSlug))
        {
            var team = await _db.Teams.FirstOrDefaultAsync(t => t.Slug == teamSlug.ToLowerInvariant(), ct);
            if (team != null)
            {
                // Get entrant IDs for this team in this season
                var teamEntrants = await _db.Entrants
                    .Where(e => e.TeamId == team.Id && seasonRoundIds.Contains(e.RoundId))
                    .Select(e => new { e.Id, e.RoundId })
                    .ToListAsync(ct);
                
                filteredRoundIds = teamEntrants.Select(e => e.RoundId).Distinct().ToHashSet();
                
                // Get session types per round from Results
                // Query directly by joining Results → Sessions to get RoundId and Type
                var entrantIds = teamEntrants.Select(e => e.Id).ToList();
                var teamSessionResults = await (
                    from res in _db.Results
                    join sess in _db.Set<Session>() on res.SessionId equals sess.Id
                    where entrantIds.Contains(res.EntrantId)
                    select new { sess.RoundId, sess.Type }
                ).Distinct().ToListAsync(ct);
                
                sessionsByRound = teamSessionResults
                    .GroupBy(r => r.RoundId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(x => x.Type).Distinct().OrderBy(t => t).ToList()
                    );
            }
            else
            {
                // Team not found - return empty result
                filteredRoundIds = new HashSet<Guid>();
            }
        }

        var now = DateOnly.FromDateTime(DateTime.UtcNow);

        var roundsQuery = season.Rounds.AsEnumerable();
        
        // Apply entity filter if specified
        if (filteredRoundIds != null)
        {
            roundsQuery = roundsQuery.Where(r => filteredRoundIds.Contains(r.Id));
        }

        var rounds = roundsQuery
            .OrderBy(r => r.RoundNumber)
            .Select(r => new RoundSummaryForSeasonDto(
                Id: r.Id,
                Name: r.Name,
                Slug: r.Slug,
                RoundNumber: r.RoundNumber,
                DateStart: r.DateStart,
                DateEnd: r.DateEnd,
                Circuit: new CircuitSummaryForRoundDto(
                    Id: r.Circuit.Id,
                    Name: r.Circuit.Name,
                    Slug: r.Circuit.Slug,
                    Country: r.Circuit.Country,
                    CountryCode: r.Circuit.CountryCode
                ),
                SessionCount: r.Sessions.Count,
                IsCompleted: r.DateEnd < now,
                IsCurrent: r.DateStart <= now && r.DateEnd >= now,
                IsUpcoming: r.DateStart > now,
                FeaturingSessions: sessionsByRound != null && sessionsByRound.TryGetValue(r.Id, out var sessions)
                    ? sessions.Select(s => s.ToString()).ToList()
                    : null,
                FeaturingSessionsWithTeam: sessionsWithTeamByRound != null && sessionsWithTeamByRound.TryGetValue(r.Id, out var sessionsWithTeam)
                    ? sessionsWithTeam
                    : null
            ))
            .ToList();

        var stats = new SeasonStatsDto(
            TotalRounds: season.Rounds.Count,
            CompletedRounds: rounds.Count(r => r.IsCompleted),
            UpcomingRounds: rounds.Count(r => r.IsUpcoming),
            TotalSessions: season.Rounds.SelectMany(r => r.Sessions).Count(),
            TotalEntrants: await _db.Entrants.CountAsync(e => season.Rounds.Select(r => r.Id).Contains(e.RoundId), ct),
            SeasonStart: season.Rounds.MinBy(r => r.DateStart)?.DateStart,
            SeasonEnd: season.Rounds.MaxBy(r => r.DateEnd)?.DateEnd
        );

        var seriesSummary = new SeriesSummaryDto(
            Id: series.Id,
            Name: series.Name,
            Slug: series.Slug,
            LogoUrl: series.LogoUrl,
            Description: GetSeriesDescription(series.Slug),
            SeasonCount: await _db.Seasons.CountAsync(s => s.SeriesId == series.Id, ct),
            LatestSeasonYear: year,
            CurrentSeasonRoundCount: year == DateTime.UtcNow.Year ? season.Rounds.Count : null,
            BrandColors: series.BrandColors.Count > 0 ? series.BrandColors : GetDefaultBrandColors(series.Slug),
            UIOrder: series.UIOrder
        );

        var result = new SeasonDetailDto(
            Id: season.Id,
            Year: season.Year,
            Series: seriesSummary,
            Rounds: rounds,
            Stats: stats
        );

        return Ok(result);
    }

    // =========================
    // Private Helpers
    // =========================

    /// <summary>
    /// Get series description based on slug.
    /// Eventually this could be stored in the database.
    /// </summary>
    private static string? GetSeriesDescription(string slug) => slug.ToLowerInvariant() switch
    {
        "f1" or "formula-1" => "The pinnacle of motorsport. Open-wheel racing at its finest since 1950.",
        "motogp" => "Premier class of motorcycle road racing since 1949.",
        "wec" => "Multi-class endurance racing including the legendary 24 Hours of Le Mans.",
        "indycar" => "American open-wheel racing including the iconic Indianapolis 500.",
        "formula-e" or "fe" => "All-electric street racing championship.",
        "nascar" => "Stock car racing at its best.",
        _ => null
    };

    /// <summary>
    /// Get default brand colors for a series when not stored in database.
    /// First color is primary (used for text), additional colors for gradients/accents.
    /// </summary>
    private static List<string> GetDefaultBrandColors(string slug) => slug.ToLowerInvariant() switch
    {
        "f1" or "formula-1" => ["#E10600", "#FFFFFF", "#000000"],
        "motogp" => ["#FF6B00", "#000000"],
        "wec" => ["#00B9FF",  "#FFFFFF"],
        "indycar" => ["#e51937", "#000000"],
        "formula-e" or "fe" => ["#00BCD4"],
        "nascar" => ["#FFD659", "#E4002B", "#007AC2", "#000000"],
        _ => ["#666666"]
    };

    /// <summary>
    /// Check if a season is completed based on its rounds.
    /// </summary>
    private static bool IsSeasonCompleted(Season season)
    {
        if (season.Rounds.Count == 0) return false;
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        return season.Rounds.All(r => r.DateEnd < now);
    }

    /// <summary>
    /// Get aggregate statistics for a series.
    /// </summary>
    private async Task<SeriesStatsDto> GetSeriesStatsAsync(Guid seriesId, CancellationToken ct)
    {
        var seasonIds = await _db.Seasons
            .Where(s => s.SeriesId == seriesId)
            .Select(s => s.Id)
            .ToListAsync(ct);

        var roundIds = await _db.Rounds
            .Where(r => seasonIds.Contains(r.SeasonId))
            .Select(r => r.Id)
            .ToListAsync(ct);

        var totalSessions = await _db.Sessions
            .CountAsync(s => roundIds.Contains(s.RoundId), ct);

        var totalDrivers = await _db.Entrants
            .Where(e => roundIds.Contains(e.RoundId))
            .Select(e => e.DriverId)
            .Distinct()
            .CountAsync(ct);

        var totalTeams = await _db.Entrants
            .Where(e => roundIds.Contains(e.RoundId))
            .Select(e => e.TeamId)
            .Distinct()
            .CountAsync(ct);

        var totalCircuits = await _db.Rounds
            .Where(r => seasonIds.Contains(r.SeasonId))
            .Select(r => r.CircuitId)
            .Distinct()
            .CountAsync(ct);

        return new SeriesStatsDto(
            TotalSeasons: seasonIds.Count,
            TotalRounds: roundIds.Count,
            TotalSessions: totalSessions,
            TotalDrivers: totalDrivers,
            TotalTeams: totalTeams,
            TotalCircuits: totalCircuits
        );
    }
}
