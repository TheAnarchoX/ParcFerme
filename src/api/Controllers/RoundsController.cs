using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Round (race weekend) endpoints.
/// Primary "choose what to log" screen for users.
/// </summary>
[Route("api/v1/[controller]")]
public sealed class RoundsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<RoundsController> _logger;

    public RoundsController(
        ParcFermeDbContext db,
        ILogger<RoundsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get a round by series slug, year, and round slug.
    /// Returns sessions timeline, circuit context, and spoiler-safe metadata.
    /// </summary>
    /// <param name="seriesSlug">The series slug (e.g., "f1").</param>
    /// <param name="year">The season year.</param>
    /// <param name="roundSlug">The round slug (e.g., "bahrain").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Round details with sessions and navigation.</returns>
    /// <response code="200">Returns the round detail.</response>
    /// <response code="404">Round not found.</response>
    [HttpGet("{seriesSlug}/{year:int}/{roundSlug}")]
    [CacheResponse(DurationSeconds = 60)] // Short cache - sessions may update
    [ProducesResponseType(typeof(RoundPageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRoundBySlug(
        string seriesSlug, 
        int year, 
        string roundSlug, 
        CancellationToken ct)
    {
        // Find series
        var series = await _db.Series
            .FirstOrDefaultAsync(s => s.Slug == seriesSlug.ToLowerInvariant(), ct);

        if (series is null)
        {
            return NotFoundResult("Series", seriesSlug);
        }

        // Find season
        var season = await _db.Seasons
            .FirstOrDefaultAsync(s => s.SeriesId == series.Id && s.Year == year, ct);

        if (season is null)
        {
            return NotFoundResult("Season", $"{seriesSlug}/{year}");
        }

        // Find round with all needed data (including aliases for context-aware display)
        var round = await _db.Rounds
            .Include(r => r.Circuit)
            .Include(r => r.Sessions)
            .Include(r => r.Entrants)
                .ThenInclude(e => e.Driver)
                    .ThenInclude(d => d.Aliases)
            .Include(r => r.Entrants)
                .ThenInclude(e => e.Team)
                    .ThenInclude(t => t.Aliases)
            .FirstOrDefaultAsync(r => r.SeasonId == season.Id && r.Slug == roundSlug.ToLowerInvariant(), ct);

        if (round is null)
        {
            return NotFoundResult("Round", $"{seriesSlug}/{year}/{roundSlug}");
        }

        // Get user's logged sessions for this round
        var userId = CurrentUserId;
        var loggedSessionIds = new HashSet<Guid>();
        if (userId.HasValue)
        {
            loggedSessionIds = (await _db.Logs
                .Where(l => l.UserId == userId.Value)
                .Where(l => round.Sessions.Select(s => s.Id).Contains(l.SessionId))
                .Select(l => l.SessionId)
                .ToListAsync(ct))
                .ToHashSet();
        }

        // Get adjacent rounds for navigation
        var allRoundsInSeason = await _db.Rounds
            .Where(r => r.SeasonId == season.Id)
            .OrderBy(r => r.RoundNumber)
            .Select(r => new { r.Id, r.Name, r.Slug, r.RoundNumber, r.DateStart })
            .ToListAsync(ct);

        var currentIndex = allRoundsInSeason.FindIndex(r => r.Id == round.Id);
        
        AdjacentRoundDto? previousRound = currentIndex > 0
            ? new AdjacentRoundDto(
                allRoundsInSeason[currentIndex - 1].Id,
                allRoundsInSeason[currentIndex - 1].Name,
                allRoundsInSeason[currentIndex - 1].Slug,
                allRoundsInSeason[currentIndex - 1].RoundNumber,
                allRoundsInSeason[currentIndex - 1].DateStart)
            : null;

        AdjacentRoundDto? nextRound = currentIndex < allRoundsInSeason.Count - 1
            ? new AdjacentRoundDto(
                allRoundsInSeason[currentIndex + 1].Id,
                allRoundsInSeason[currentIndex + 1].Name,
                allRoundsInSeason[currentIndex + 1].Slug,
                allRoundsInSeason[currentIndex + 1].RoundNumber,
                allRoundsInSeason[currentIndex + 1].DateStart)
            : null;

        // Build response
        var now = DateTime.UtcNow;
        var nowDate = DateOnly.FromDateTime(now);

        var isTestingRound = IsTestingRound(round.Name);
        var sessionsTimeline = round.Sessions
            .OrderBy(s => s.StartTimeUtc)
            .Select((s, index) => new SessionTimelineDto(
                Id: s.Id,
                Type: s.Type.ToString(),
                DisplayName: GetSessionDisplayName(s.Type, isTestingRound, s.StartTimeUtc, round.DateStart, index),
                StartTimeUtc: s.StartTimeUtc,
                Status: s.Status.ToString(),
                IsLogged: loggedSessionIds.Contains(s.Id),
                HasResults: s.Status == SessionStatus.Completed
            ))
            .ToList();

        // Get round stats
        var totalLogs = await _db.Logs
            .CountAsync(l => round.Sessions.Select(s => s.Id).Contains(l.SessionId), ct);

        var avgExcitement = await _db.Logs
            .Where(l => round.Sessions.Select(s => s.Id).Contains(l.SessionId))
            .Where(l => l.ExcitementRating.HasValue)
            .AverageAsync(l => (double?)l.ExcitementRating, ct);

        var stats = new RoundStatsDto(
            TotalSessions: round.Sessions.Count,
            CompletedSessions: round.Sessions.Count(s => s.Status == SessionStatus.Completed),
            UpcomingSessions: round.Sessions.Count(s => s.Status == SessionStatus.Scheduled && s.StartTimeUtc > now),
            TotalEntrants: round.Entrants.Count,
            TotalLogs: totalLogs,
            AverageExcitement: avgExcitement.HasValue ? Math.Round(avgExcitement.Value, 1) : null
        );

        var brandColors = series.BrandColors.Count > 0 
            ? series.BrandColors 
            : GetDefaultBrandColors(series.Slug);

        // Build entrants list with context-aware aliases
        var entrants = round.Entrants
            .OrderBy(e => e.Driver.LastName)
            .ThenBy(e => e.Driver.FirstName)
            .Select(e =>
            {
                // Find applicable driver alias for this event
                var driverAlias = GetApplicableAlias(
                    e.Driver.Aliases,
                    round.DateStart,
                    series.Id);

                // Find applicable team alias for this event
                var teamAlias = GetApplicableAlias(
                    e.Team.Aliases,
                    round.DateStart,
                    series.Id);

                // Parse driver name from alias if applicable
                string driverFirstName = e.Driver.FirstName;
                string driverLastName = e.Driver.LastName;
                int? driverNumber = e.Driver.DriverNumber;
                if (driverAlias != null)
                {
                    var nameParts = driverAlias.AliasName.Split(' ', 2);
                    if (nameParts.Length == 2)
                    {
                        driverFirstName = nameParts[0];
                        driverLastName = nameParts[1];
                    }
                    else
                    {
                        driverLastName = driverAlias.AliasName;
                    }
                    
                    // Use alias-specific driver number if available
                    if (driverAlias.DriverNumber.HasValue)
                    {
                        driverNumber = driverAlias.DriverNumber.Value;
                    }
                }

                return new EntrantDto(
                    Id: e.Id,
                    Driver: new DriverSummaryDto(
                        Id: e.Driver.Id,
                        FirstName: driverFirstName,
                        LastName: driverLastName,
                        Slug: e.Driver.Slug,
                        Abbreviation: e.Driver.Abbreviation,
                        Nationality: e.Driver.Nationality,
                        HeadshotUrl: e.Driver.HeadshotUrl,
                        DriverNumber: driverNumber,
                        DateOfBirth: e.Driver.DateOfBirth,
                        WikipediaUrl: e.Driver.WikipediaUrl
                    ),
                    Team: new TeamSummaryDto(
                        Id: e.Team.Id,
                        Name: teamAlias?.AliasName ?? e.Team.Name,
                        Slug: e.Team.Slug,
                        ShortName: e.Team.ShortName,
                        LogoUrl: e.Team.LogoUrl,
                        PrimaryColor: e.Team.PrimaryColor,
                        Nationality: e.Team.Nationality,
                        WikipediaUrl: e.Team.WikipediaUrl
                    ),
                    Role: e.Role != DriverRole.Regular ? e.Role.ToString().ToLowerInvariant() : null
                );
            })
            .ToList();

        var roundDetail = new RoundPageDetailDto(
            Id: round.Id,
            Name: round.Name,
            Slug: round.Slug,
            RoundNumber: round.RoundNumber,
            DateStart: round.DateStart,
            DateEnd: round.DateEnd,
            OpenF1MeetingKey: round.OpenF1MeetingKey,
            Series: new SeriesBrandDto(
                Id: series.Id,
                Name: series.Name,
                Slug: series.Slug,
                LogoUrl: series.LogoUrl,
                BrandColors: brandColors
            ),
            Year: year,
            Circuit: new CircuitDetailDto(
                Id: round.Circuit.Id,
                Name: round.Circuit.Name,
                Slug: round.Circuit.Slug,
                Location: round.Circuit.Location,
                Country: round.Circuit.Country,
                CountryCode: round.Circuit.CountryCode,
                LayoutMapUrl: round.Circuit.LayoutMapUrl,
                Latitude: round.Circuit.Latitude,
                Longitude: round.Circuit.Longitude,
                LengthMeters: round.Circuit.LengthMeters,
                Altitude: round.Circuit.Altitude,
                WikipediaUrl: round.Circuit.WikipediaUrl
            ),
            Sessions: sessionsTimeline,
            Entrants: entrants,
            Stats: stats,
            IsCompleted: round.DateEnd < nowDate,
            IsCurrent: round.DateStart <= nowDate && round.DateEnd >= nowDate,
            IsUpcoming: round.DateStart > nowDate
        );

        return Ok(new RoundPageResponse(roundDetail, previousRound, nextRound));
    }

    /// <summary>
    /// Get rounds for a season.
    /// </summary>
    [HttpGet("{seriesSlug}/{year:int}")]
    [CacheResponse(DurationSeconds = 300)]
    [ProducesResponseType(typeof(IReadOnlyList<RoundSummaryForSeasonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRoundsBySeason(
        string seriesSlug,
        int year,
        CancellationToken ct)
    {
        var series = await _db.Series
            .FirstOrDefaultAsync(s => s.Slug == seriesSlug.ToLowerInvariant(), ct);

        if (series is null)
        {
            return NotFoundResult("Series", seriesSlug);
        }

        var season = await _db.Seasons
            .Include(s => s.Rounds)
                .ThenInclude(r => r.Circuit)
            .Include(s => s.Rounds)
                .ThenInclude(r => r.Sessions)
            .FirstOrDefaultAsync(s => s.SeriesId == series.Id && s.Year == year, ct);

        if (season is null)
        {
            return NotFoundResult("Season", $"{seriesSlug}/{year}");
        }

        var now = DateOnly.FromDateTime(DateTime.UtcNow);

        var rounds = season.Rounds
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
                IsUpcoming: r.DateStart > now
            ))
            .ToList();

        return Ok(rounds);
    }

    // =========================
    // Private Helpers
    // =========================

    /// <summary>
    /// Determine if a round is a testing event.
    /// </summary>
    private static bool IsTestingRound(string roundName)
    {
        var lowerName = roundName.ToLowerInvariant();
        return lowerName.Contains("pre-season") || lowerName.Contains("testing") || lowerName.Contains("test");
    }

    /// <summary>
    /// Find the most applicable alias for an entity based on the event date and series.
    /// Prefers series-specific aliases over universal ones.
    /// </summary>
    private static T? GetApplicableAlias<T>(
        ICollection<T> aliases,
        DateOnly eventDate,
        Guid seriesId) where T : class
    {
        if (aliases == null || !aliases.Any())
            return null;

        // Try to find a series-specific alias that's valid for this date
        foreach (var alias in aliases)
        {
            var aliasSeriesId = alias.GetType().GetProperty("SeriesId")?.GetValue(alias) as Guid?;
            var validFrom = alias.GetType().GetProperty("ValidFrom")?.GetValue(alias) as DateOnly?;
            var validUntil = alias.GetType().GetProperty("ValidUntil")?.GetValue(alias) as DateOnly?;

            // Check if this is a series-specific alias for our series
            if (aliasSeriesId.HasValue && aliasSeriesId.Value == seriesId)
            {
                // Check date validity
                bool isValidFrom = !validFrom.HasValue || eventDate >= validFrom.Value;
                bool isValidUntil = !validUntil.HasValue || eventDate <= validUntil.Value;

                if (isValidFrom && isValidUntil)
                    return alias;
            }
        }

        // Fall back to universal aliases (SeriesId is null)
        foreach (var alias in aliases)
        {
            var aliasSeriesId = alias.GetType().GetProperty("SeriesId")?.GetValue(alias) as Guid?;
            var validFrom = alias.GetType().GetProperty("ValidFrom")?.GetValue(alias) as DateOnly?;
            var validUntil = alias.GetType().GetProperty("ValidUntil")?.GetValue(alias) as DateOnly?;

            if (!aliasSeriesId.HasValue)
            {
                // Check date validity
                bool isValidFrom = !validFrom.HasValue || eventDate >= validFrom.Value;
                bool isValidUntil = !validUntil.HasValue || eventDate <= validUntil.Value;

                if (isValidFrom && isValidUntil)
                    return alias;
            }
        }

        return null;
    }

    /// <summary>
    /// Get human-friendly display name for session type.
    /// For testing sessions, returns "Day 1", "Day 2", etc.
    /// </summary>
    private static string GetSessionDisplayName(
        SessionType type, 
        bool isTestingRound = false, 
        DateTime? sessionStart = null, 
        DateOnly? roundStart = null,
        int sessionIndex = 0)
    {
        // Handle testing sessions
        if (isTestingRound && sessionStart.HasValue && roundStart.HasValue)
        {
            var sessionDate = DateOnly.FromDateTime(sessionStart.Value);
            var dayNumber = sessionDate.DayNumber - roundStart.Value.DayNumber + 1;
            return $"Day {dayNumber}";
        }

        // Regular session types
        return type switch
    {
            SessionType.FP1 => "Free Practice 1",
            SessionType.FP2 => "Free Practice 2",
            SessionType.FP3 => "Free Practice 3",
            SessionType.Qualifying => "Qualifying",
            SessionType.SprintQualifying => "Sprint Qualifying",
            SessionType.Sprint => "Sprint Race",
            SessionType.Race => "Race",
            SessionType.Warmup => "Warm Up",
            SessionType.Moto3Race => "Moto3 Race",
            SessionType.Moto2Race => "Moto2 Race",
            SessionType.MotoGPRace => "MotoGP Race",
            _ => AddSpacesToPascalCase(type.ToString())
        };
    }

    /// <summary>
    /// Add spaces to PascalCase strings for better readability.
    /// </summary>
    private static string AddSpacesToPascalCase(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return text;
        
        var result = new System.Text.StringBuilder(text.Length * 2);
        result.Append(text[0]);
        
        for (int i = 1; i < text.Length; i++)
        {
            if (char.IsUpper(text[i]) && !char.IsUpper(text[i - 1]))
                result.Append(' ');
            result.Append(text[i]);
        }
        
        return result.ToString();
    }

    /// <summary>
    /// Get default brand colors for a series when not stored in database.
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
}
