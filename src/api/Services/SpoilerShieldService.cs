using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Services;

/// <summary>
/// Service for managing spoiler visibility based on user preferences and logs.
/// This is the core of the Spoiler Shield feature.
/// </summary>
public interface ISpoilerShieldService
{
    /// <summary>
    /// Determines if spoilers should be revealed for a session.
    /// </summary>
    Task<bool> ShouldRevealSpoilersAsync(Guid? userId, Guid sessionId, CancellationToken ct = default);
    
    /// <summary>
    /// Determines if spoilers should be revealed based on user's mode alone (no session context).
    /// </summary>
    SpoilerVisibility GetVisibilityMode(SpoilerMode mode);
    
    /// <summary>
    /// Gets session detail with appropriate spoiler masking.
    /// </summary>
    /// <param name="sessionId">The session ID.</param>
    /// <param name="userId">The current user's ID (null if anonymous).</param>
    /// <param name="forceReveal">If true, forces results to be revealed regardless of user state.</param>
    /// <param name="ct">Cancellation token.</param>
    Task<SessionDetailDto?> GetSessionWithSpoilerShieldAsync(Guid sessionId, Guid? userId, bool forceReveal = false, CancellationToken ct = default);
    
    /// <summary>
    /// Gets multiple sessions with appropriate spoiler masking.
    /// </summary>
    Task<IReadOnlyList<SessionSummaryDto>> GetSessionsWithSpoilerShieldAsync(
        IEnumerable<Guid> sessionIds, 
        Guid? userId, 
        CancellationToken ct = default);
    
    /// <summary>
    /// Reveals spoilers for a session (logs as viewed).
    /// </summary>
    Task<RevealSpoilersResponse> RevealSpoilersAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
}

/// <summary>
/// Visibility levels for spoiler content.
/// </summary>
public enum SpoilerVisibility
{
    /// <summary>All spoiler content hidden.</summary>
    Hidden,
    /// <summary>Partial content visible (excitement ratings, thumbnails).</summary>
    Partial,
    /// <summary>All content visible.</summary>
    Full
}

public sealed class SpoilerShieldService : ISpoilerShieldService
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<SpoilerShieldService> _logger;

    public SpoilerShieldService(ParcFermeDbContext db, ILogger<SpoilerShieldService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> ShouldRevealSpoilersAsync(Guid? userId, Guid sessionId, CancellationToken ct = default)
    {
        // Anonymous users never see spoilers
        if (userId is null)
        {
            return false;
        }

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null)
        {
            return false;
        }

        // User has spoiler mode set to None - show everything
        if (user.SpoilerMode == SpoilerMode.None)
        {
            return true;
        }

        // Check if user has logged this session
        var hasLogged = await _db.Logs
            .AnyAsync(l => l.UserId == userId && l.SessionId == sessionId, ct);

        return hasLogged;
    }

    public SpoilerVisibility GetVisibilityMode(SpoilerMode mode) => mode switch
    {
        SpoilerMode.None => SpoilerVisibility.Full,
        SpoilerMode.Moderate => SpoilerVisibility.Partial,
        SpoilerMode.Strict => SpoilerVisibility.Hidden,
        _ => SpoilerVisibility.Hidden
    };

    public async Task<SessionDetailDto?> GetSessionWithSpoilerShieldAsync(
        Guid sessionId, 
        Guid? userId, 
        bool forceReveal = false,
        CancellationToken ct = default)
    {
        var session = await _db.Sessions
            .AsNoTracking()
            .Include(s => s.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(se => se.Series)
            .Include(s => s.Round)
                .ThenInclude(r => r.Circuit)
            .Include(s => s.Results)
                .ThenInclude(r => r.Entrant)
                    .ThenInclude(e => e.Driver)
            .Include(s => s.Results)
                .ThenInclude(r => r.Entrant)
                    .ThenInclude(e => e.Team)
            .Include(s => s.Logs)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null)
        {
            return null;
        }

        // Fetch sibling sessions separately to avoid cyclic include
        var siblingSessionIds = await _db.Sessions
            .Where(s => s.RoundId == session.RoundId)
            .OrderBy(s => s.StartTimeUtc)
            .Select(s => s.Id)
            .ToListAsync(ct);

        var shouldReveal = forceReveal || await ShouldRevealSpoilersAsync(userId, sessionId, ct);
        var isLogged = userId.HasValue && session.Logs.Any(l => l.UserId == userId);

        // Get logged sessions for sibling session status
        HashSet<Guid> loggedSessionIds = [];
        if (userId.HasValue)
        {
            loggedSessionIds = (await _db.Logs
                .Where(l => l.UserId == userId && siblingSessionIds.Contains(l.SessionId))
                .Select(l => l.SessionId)
                .ToListAsync(ct))
                .ToHashSet();
        }

        // Fetch sibling sessions for the round detail
        var siblingSessions = await _db.Sessions
            .AsNoTracking()
            .Include(s => s.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(se => se.Series)
            .Include(s => s.Round)
                .ThenInclude(r => r.Circuit)
            .Where(s => siblingSessionIds.Contains(s.Id))
            .OrderBy(s => s.StartTimeUtc)
            .ToListAsync(ct);

        return MapToSessionDetailDto(session, siblingSessions, loggedSessionIds, shouldReveal, isLogged);
    }

    public async Task<IReadOnlyList<SessionSummaryDto>> GetSessionsWithSpoilerShieldAsync(
        IEnumerable<Guid> sessionIds, 
        Guid? userId, 
        CancellationToken ct = default)
    {
        var sessionIdList = sessionIds.ToList();
        
        var sessions = await _db.Sessions
            .AsNoTracking()
            .Include(s => s.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(se => se.Series)
            .Include(s => s.Round)
                .ThenInclude(r => r.Circuit)
            .Where(s => sessionIdList.Contains(s.Id))
            .ToListAsync(ct);

        // Get user's logged session IDs for efficient lookup
        HashSet<Guid> loggedSessionIds = [];
        if (userId.HasValue)
        {
            loggedSessionIds = (await _db.Logs
                .Where(l => l.UserId == userId && sessionIdList.Contains(l.SessionId))
                .Select(l => l.SessionId)
                .ToListAsync(ct))
                .ToHashSet();
        }

        // Create a dictionary for O(1) lookup and preserve original order
        var sessionDict = sessions.ToDictionary(s => s.Id);
        
        return sessionIdList
            .Where(id => sessionDict.ContainsKey(id))
            .Select(id => MapToSessionSummaryDto(sessionDict[id], loggedSessionIds.Contains(id)))
            .ToList();
    }

    public async Task<RevealSpoilersResponse> RevealSpoilersAsync(
        Guid userId, 
        Guid sessionId, 
        CancellationToken ct = default)
    {
        var session = await _db.Sessions
            .AsNoTracking()
            .Include(s => s.Results)
                .ThenInclude(r => r.Entrant)
                    .ThenInclude(e => e.Driver)
            .Include(s => s.Results)
                .ThenInclude(r => r.Entrant)
                    .ThenInclude(e => e.Team)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        if (session is null)
        {
            return new RevealSpoilersResponse(false, "Session not found", null);
        }

        // Check if already logged
        var existingLog = await _db.Logs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.SessionId == sessionId, ct);

        if (existingLog is null)
        {
            // Create a minimal log entry to mark as "spoilers revealed"
            // User can update with ratings later
            var log = new Log
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SessionId = sessionId,
                LoggedAt = DateTime.UtcNow,
                DateWatched = DateOnly.FromDateTime(DateTime.UtcNow)
            };

            _db.Logs.Add(log);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("User {UserId} revealed spoilers for session {SessionId}", userId, sessionId);
        }

        var results = MapToSessionResultsDto(session.Results);
        return new RevealSpoilersResponse(true, null, results);
    }

    // =========================
    // Private Mapping Methods
    // =========================

    private SessionDetailDto MapToSessionDetailDto(
        Session session, 
        IReadOnlyList<Session> siblingSessions, 
        HashSet<Guid> loggedSessionIds,
        bool spoilersRevealed, 
        bool isLogged)
    {
        var round = session.Round;
        var season = round.Season;
        var series = season.Series;
        var circuit = round.Circuit;

        // Calculate stats (spoiler-safe aggregates)
        var stats = new SessionStatsDto(
            TotalEntrants: session.Results.Count,
            FinishedCount: session.Results.Count(r => r.Status == ResultStatus.Finished),
            DnfCount: session.Results.Count(r => r.Status == ResultStatus.DNF),
            AverageExcitement: session.Logs.Where(l => l.ExcitementRating.HasValue)
                                         .Select(l => l.ExcitementRating!.Value)
                                         .DefaultIfEmpty()
                                         .Average(),
            TotalLogs: session.Logs.Count,
            TotalReviews: session.Logs.Count(l => l.Review != null)
        );

        // Map results only if spoilers are revealed
        SessionResultsDto? results = null;
        if (spoilersRevealed && session.Results.Count > 0)
        {
            results = MapToSessionResultsDto(session.Results);
        }

        return new SessionDetailDto(
            Id: session.Id,
            Name: GetSessionName(session.Type, round.Name),
            Type: session.Type.ToString(),
            StartTimeUtc: session.StartTimeUtc,
            Status: session.Status.ToString(),
            OpenF1SessionKey: session.OpenF1SessionKey,
            Round: MapToRoundDetailDto(round, series, siblingSessions, loggedSessionIds),
            IsLogged: isLogged,
            SpoilersRevealed: spoilersRevealed,
            Results: results,
            Stats: stats
        );
    }

    private SessionSummaryDto MapToSessionSummaryDto(Session session, bool isLogged)
    {
        var round = session.Round;
        var series = round.Season.Series;

        return new SessionSummaryDto(
            Id: session.Id,
            Name: GetSessionName(session.Type, round.Name),
            Type: session.Type.ToString(),
            StartTimeUtc: session.StartTimeUtc,
            Status: session.Status.ToString(),
            Round: MapToRoundSummaryDto(round, series),
            IsLogged: isLogged
        );
    }

    private SessionResultsDto MapToSessionResultsDto(ICollection<Result> results)
    {
        var orderedResults = results.OrderBy(r => r.Position ?? int.MaxValue).ToList();
        var classification = orderedResults.Select(MapToResultDto).ToList();
        var winner = classification.FirstOrDefault();
        var fastestLap = classification.FirstOrDefault(r => r.FastestLap);

        return new SessionResultsDto(classification, winner, fastestLap);
    }

    private ResultDto MapToResultDto(Result result)
    {
        var entrant = result.Entrant;
        var driver = entrant.Driver;
        var team = entrant.Team;

        return new ResultDto(
            Position: result.Position ?? 0,
            GridPosition: result.GridPosition,
            Status: result.Status.ToString(),
            Points: result.Points,
            Time: result.Time?.ToString(@"h\:mm\:ss\.fff"),
            Laps: result.Laps,
            FastestLap: result.FastestLap,
            Driver: new DriverSummaryDto(
                driver.Id,
                driver.FirstName,
                driver.LastName,
                driver.Slug,
                driver.Abbreviation,
                driver.Nationality,
                driver.HeadshotUrl,
                driver.DriverNumber,
                driver.DateOfBirth,
                driver.WikipediaUrl
            ),
            Team: new TeamSummaryDto(
                team.Id,
                team.Name,
                team.Slug,
                team.ShortName,
                team.LogoUrl,
                team.PrimaryColor,
                team.Nationality,
                team.WikipediaUrl
            ),
            TimeMilliseconds: result.TimeMilliseconds,
            FastestLapNumber: result.FastestLapNumber,
            FastestLapRank: result.FastestLapRank,
            FastestLapTime: result.FastestLapTime,
            FastestLapSpeed: result.FastestLapSpeed,
            StatusDetail: result.StatusDetail,
            Q1Time: result.Q1Time,
            Q2Time: result.Q2Time,
            Q3Time: result.Q3Time,
            LapsLed: result.LapsLed,
            CarNumber: result.CarNumber
        );
    }

    private RoundDetailDto MapToRoundDetailDto(
        Round round, 
        Series series, 
        IReadOnlyList<Session> siblingSessions,
        HashSet<Guid> loggedSessionIds)
    {
        var circuit = round.Circuit;
        var sessionSummaries = siblingSessions
            .OrderBy(s => s.StartTimeUtc)
            .Select(s => MapToSessionSummaryDto(s, loggedSessionIds.Contains(s.Id)))
            .ToList();

        return new RoundDetailDto(
            Id: round.Id,
            Name: round.Name,
            Slug: round.Slug,
            RoundNumber: round.RoundNumber,
            DateStart: round.DateStart,
            DateEnd: round.DateEnd,
            Circuit: new CircuitDetailDto(
                circuit.Id,
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
                circuit.WikipediaUrl
            ),
            Year: round.Season.Year,
            SeriesSlug: series.Slug,
            SeriesName: series.Name,
            Sessions: sessionSummaries
        );
    }

    private RoundSummaryDto MapToRoundSummaryDto(Round round, Series series)
    {
        var circuit = round.Circuit;

        return new RoundSummaryDto(
            Id: round.Id,
            Name: round.Name,
            Slug: round.Slug,
            RoundNumber: round.RoundNumber,
            DateStart: round.DateStart,
            DateEnd: round.DateEnd,
            Circuit: new CircuitSummaryDto(
                circuit.Id,
                circuit.Name,
                circuit.Slug,
                circuit.Country,
                circuit.CountryCode
            ),
            Year: round.Season.Year,
            SeriesName: series.Name
        );
    }

    private static string GetSessionName(SessionType type, string roundName) => type switch
    {
        SessionType.FP1 => $"{roundName} - Free Practice 1",
        SessionType.FP2 => $"{roundName} - Free Practice 2",
        SessionType.FP3 => $"{roundName} - Free Practice 3",
        SessionType.Qualifying => $"{roundName} - Qualifying",
        SessionType.SprintQualifying => $"{roundName} - Sprint Qualifying",
        SessionType.Sprint => $"{roundName} - Sprint",
        SessionType.Race => $"{roundName} - Race",
        _ => $"{roundName} - {type}"
    };
}
