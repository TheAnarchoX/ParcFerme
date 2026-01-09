using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Circuits discovery endpoints.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public class CircuitsController : ControllerBase
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<CircuitsController> _logger;

    public CircuitsController(ParcFermeDbContext db, ILogger<CircuitsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated list of circuits.
    /// </summary>
    /// <param name="page">Page number (1-indexed)</param>
    /// <param name="pageSize">Items per page (max 100)</param>
    /// <param name="series">Optional series slug filter</param>
    /// <param name="country">Optional country filter</param>
    [HttpGet]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType<CircuitListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CircuitListResponse>> GetCircuits(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] string? series = null,
        [FromQuery] string? country = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Circuits
            .Include(c => c.Rounds)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .AsNoTracking();

        // Filter by series if provided
        if (!string.IsNullOrEmpty(series))
        {
            query = query.Where(c => c.Rounds.Any(r => 
                r.Season.Series.Slug == series || 
                r.Season.Series.Slug == series.Replace("-", "")));
        }

        // Filter by country if provided
        if (!string.IsNullOrEmpty(country))
        {
            query = query.Where(c => 
                c.Country.ToLower() == country.ToLower() ||
                c.CountryCode == country.ToUpper());
        }

        var totalCount = await query.CountAsync();

        var circuits = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CircuitListItemDto(
                c.Id.ToString(),
                c.Name,
                c.Slug,
                c.Location,
                c.Country,
                c.CountryCode,
                c.LayoutMapUrl,
                c.Rounds.Count,
                c.LengthMeters
            ))
            .ToListAsync();

        return Ok(new CircuitListResponse(
            circuits,
            totalCount,
            page,
            pageSize,
            HasMore: page * pageSize < totalCount
        ));
    }

    /// <summary>
    /// Get circuit detail by slug.
    /// Also supports lookup by alias name.
    /// </summary>
    [HttpGet("{slug}")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType<CircuitDiscoveryDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CircuitDiscoveryDetailDto>> GetCircuitBySlug(string slug)
    {
        var circuit = await _db.Circuits
            .Include(c => c.Rounds)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .Include(c => c.Grandstands)
            .Include(c => c.Aliases)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug);

        // Try to find by alias if not found by slug
        if (circuit == null)
        {
            var alias = await _db.CircuitAliases
                .Include(a => a.Circuit)
                    .ThenInclude(c => c.Rounds)
                        .ThenInclude(r => r.Season)
                            .ThenInclude(s => s.Series)
                .Include(a => a.Circuit.Grandstands)
                .Include(a => a.Circuit.Aliases)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => 
                    a.AliasName.ToLower().Replace(" ", "-") == slug.ToLower() ||
                    a.AliasSlug == slug);

            circuit = alias?.Circuit;
        }

        if (circuit == null)
        {
            _logger.LogWarning("Circuit not found: {Slug}", slug);
            return NotFound(new { message = "Circuit not found" });
        }

        // Build season history
        var seasonHistory = circuit.Rounds
            .OrderByDescending(r => r.Season.Year)
            .ThenBy(r => r.RoundNumber)
            .Select(r => new CircuitSeasonSummaryDto(
                r.Season.Year,
                r.Season.Series.Name,
                r.Season.Series.Slug,
                r.Season.Series.LogoUrl,
                r.Name,
                r.Slug,
                r.RoundNumber
            ))
            .ToList();

        // Calculate stats
        var uniqueSeasons = circuit.Rounds
            .Select(r => r.Season)
            .DistinctBy(s => s.Id)
            .ToList();

        var uniqueSeries = circuit.Rounds
            .Select(r => r.Season.Series)
            .DistinctBy(s => s.Id)
            .ToList();

        var years = uniqueSeasons.Select(s => s.Year).ToList();

        var stats = new CircuitStatsDto(
            TotalRounds: circuit.Rounds.Count,
            TotalSeries: uniqueSeries.Count,
            TotalSeasons: uniqueSeasons.Count,
            FirstSeasonYear: years.Count != 0 ? years.Min() : null,
            LastSeasonYear: years.Count != 0 ? years.Max() : null
        );

        // Build grandstands list
        var grandstands = circuit.Grandstands
            .OrderBy(g => g.Name)
            .Select(g => new GrandstandDto(
                g.Id.ToString(),
                g.Name,
                g.Description
            ))
            .ToList();

        return Ok(new CircuitDiscoveryDetailDto(
            circuit.Id.ToString(),
            circuit.Name,
            circuit.Slug,
            circuit.Location,
            circuit.Country,
            circuit.CountryCode,
            circuit.LayoutMapUrl,
            circuit.Latitude,
            circuit.Longitude,
            circuit.LengthMeters,
            circuit.Altitude,
            circuit.WikipediaUrl,
            grandstands,
            seasonHistory,
            stats
        ));
    }

    /// <summary>
    /// Get all seasons/rounds hosted at a circuit.
    /// </summary>
    [HttpGet("{slug}/seasons")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType<IReadOnlyList<CircuitSeasonDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CircuitSeasonDto>>> GetCircuitSeasons(string slug)
    {
        var circuit = await _db.Circuits
            .Include(c => c.Rounds)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .Include(c => c.Rounds)
                .ThenInclude(r => r.Sessions)
            .Include(c => c.Aliases)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug);

        // Try alias lookup
        if (circuit == null)
        {
            var alias = await _db.CircuitAliases
                .Include(a => a.Circuit)
                    .ThenInclude(c => c.Rounds)
                        .ThenInclude(r => r.Season)
                            .ThenInclude(s => s.Series)
                .Include(a => a.Circuit.Rounds)
                    .ThenInclude(r => r.Sessions)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => 
                    a.AliasName.ToLower().Replace(" ", "-") == slug.ToLower() ||
                    a.AliasSlug == slug);

            circuit = alias?.Circuit;
        }

        if (circuit == null)
        {
            return NotFound(new { message = "Circuit not found" });
        }

        var seasons = circuit.Rounds
            .OrderByDescending(r => r.Season.Year)
            .ThenBy(r => r.RoundNumber)
            .Select(r => new CircuitSeasonDto(
                r.Season.Id.ToString(),
                r.Season.Year,
                r.Season.Series.Name,
                r.Season.Series.Slug,
                r.Season.Series.LogoUrl,
                r.Name,
                r.Slug,
                r.RoundNumber,
                r.Sessions.Count
            ))
            .ToList();

        return Ok(seasons);
    }
}
