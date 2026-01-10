using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Logging endpoints for the Core Logging Flow.
/// Handles creating, reading, updating, and deleting race logs.
/// </summary>
[Route("api/v1/[controller]")]
public sealed class LogsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<LogsController> _logger;

    public LogsController(ParcFermeDbContext db, ILogger<LogsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // =========================
    // Log CRUD Operations
    // =========================

    /// <summary>
    /// Create a new log entry for a session.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(LogDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateLog([FromBody] CreateLogRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        // Validate request
        var errors = request.Validate().ToList();
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed", errors });
        }

        // Validate review if provided
        if (request.Review != null)
        {
            var reviewErrors = request.Review.Validate().ToList();
            if (reviewErrors.Count > 0)
            {
                return BadRequest(new { message = "Review validation failed", errors = reviewErrors });
            }
        }

        // Validate experience if provided
        if (request.Experience != null)
        {
            var experienceErrors = request.Experience.Validate().ToList();
            if (experienceErrors.Count > 0)
            {
                return BadRequest(new { message = "Experience validation failed", errors = experienceErrors });
            }
        }

        // Check if session exists
        var session = await _db.Sessions
            .Include(s => s.Round)
                .ThenInclude(r => r.Season)
                    .ThenInclude(s => s.Series)
            .Include(s => s.Round.Circuit)
            .FirstOrDefaultAsync(s => s.Id == request.SessionId, ct);

        if (session is null)
        {
            return NotFoundResult("Session", request.SessionId);
        }

        // Check if user already logged this session
        var existingLog = await _db.Logs
            .FirstOrDefaultAsync(l => l.UserId == userId && l.SessionId == request.SessionId, ct);

        if (existingLog is not null)
        {
            return Conflict(new { message = "You have already logged this session. Use PUT to update your log." });
        }

        // Create the log
        var log = new Log
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionId = request.SessionId,
            IsAttended = request.IsAttended,
            StarRating = request.StarRating,
            ExcitementRating = request.ExcitementRating,
            Liked = request.Liked,
            LoggedAt = DateTime.UtcNow,
            DateWatched = request.DateWatched ?? DateOnly.FromDateTime(DateTime.UtcNow)
        };

        _db.Logs.Add(log);

        // Create review if provided
        Review? review = null;
        if (request.Review != null)
        {
            // Auto-check spoilers for recent races (< 7 days old)
            var containsSpoilers = request.Review.ContainsSpoilers;
            if (session.StartTimeUtc > DateTime.UtcNow.AddDays(-7))
            {
                containsSpoilers = true;
            }

            review = new Review
            {
                Id = Guid.NewGuid(),
                LogId = log.Id,
                Body = request.Review.Body,
                ContainsSpoilers = containsSpoilers,
                Language = request.Review.Language,
                CreatedAt = DateTime.UtcNow
            };
            _db.Reviews.Add(review);
        }

        // Create experience if provided and is attended
        Experience? experience = null;
        if (request.IsAttended && request.Experience != null)
        {
            // Validate grandstand if provided
            if (request.Experience.GrandstandId.HasValue)
            {
                var grandstandExists = await _db.Grandstands
                    .AnyAsync(g => g.Id == request.Experience.GrandstandId.Value && g.CircuitId == session.Round.CircuitId, ct);
                
                if (!grandstandExists)
                {
                    return BadRequest(new { message = "Grandstand not found for this circuit" });
                }
            }

            experience = new Experience
            {
                Id = Guid.NewGuid(),
                LogId = log.Id,
                GrandstandId = request.Experience.GrandstandId,
                SeatDescription = request.Experience.SeatDescription,
                VenueRating = request.Experience.VenueRating,
                ViewRating = request.Experience.ViewRating,
                AccessRating = request.Experience.AccessRating,
                FacilitiesRating = request.Experience.FacilitiesRating,
                AtmosphereRating = request.Experience.AtmosphereRating,
                ViewPhotoUrl = request.Experience.ViewPhotoUrl
            };
            _db.Experiences.Add(experience);
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} logged session {SessionId} (attended: {IsAttended})", 
            userId, request.SessionId, request.IsAttended);

        // Load user for response
        var user = await _db.Users.FindAsync([userId], ct);

        var dto = MapToLogDetailDto(log, session, user!, review, experience);
        return CreatedAtAction(nameof(GetLog), new { id = log.Id }, dto);
    }

    /// <summary>
    /// Get a log by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LogDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLog(Guid id, CancellationToken ct)
    {
        var log = await _db.Logs
            .Include(l => l.User)
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
                    .ThenInclude(r => r.Season)
                        .ThenInclude(s => s.Series)
            .Include(l => l.Session.Round.Circuit)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Likes)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Comments)
            .Include(l => l.Experience)
                .ThenInclude(e => e!.Grandstand)
            .FirstOrDefaultAsync(l => l.Id == id, ct);

        if (log is null)
        {
            return NotFoundResult("Log", id);
        }

        var dto = MapToLogDetailDto(log, log.Session, log.User, log.Review, log.Experience);
        return Ok(dto);
    }

    /// <summary>
    /// Get current user's log for a specific session.
    /// </summary>
    [HttpGet("session/{sessionId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(LogDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLogBySession(Guid sessionId, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var log = await _db.Logs
            .Include(l => l.User)
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
                    .ThenInclude(r => r.Season)
                        .ThenInclude(s => s.Series)
            .Include(l => l.Session.Round.Circuit)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Likes)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Comments)
            .Include(l => l.Experience)
                .ThenInclude(e => e!.Grandstand)
            .FirstOrDefaultAsync(l => l.UserId == userId && l.SessionId == sessionId, ct);

        if (log is null)
        {
            return NotFoundResult("Log");
        }

        var dto = MapToLogDetailDto(log, log.Session, log.User, log.Review, log.Experience);
        return Ok(dto);
    }

    /// <summary>
    /// Update an existing log.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(LogDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLog(Guid id, [FromBody] UpdateLogRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var errors = request.Validate().ToList();
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed", errors });
        }

        var log = await _db.Logs
            .Include(l => l.User)
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
                    .ThenInclude(r => r.Season)
                        .ThenInclude(s => s.Series)
            .Include(l => l.Session.Round.Circuit)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Likes)
            .Include(l => l.Review)
                .ThenInclude(r => r!.Comments)
            .Include(l => l.Experience)
                .ThenInclude(e => e!.Grandstand)
            .FirstOrDefaultAsync(l => l.Id == id, ct);

        if (log is null)
        {
            return NotFoundResult("Log", id);
        }

        if (!IsOwner(log.UserId))
        {
            return ForbiddenResult("You can only update your own logs.");
        }

        // Apply updates
        if (request.IsAttended.HasValue)
            log.IsAttended = request.IsAttended.Value;
        if (request.StarRating.HasValue)
            log.StarRating = request.StarRating.Value;
        if (request.ExcitementRating.HasValue)
            log.ExcitementRating = request.ExcitementRating.Value;
        if (request.Liked.HasValue)
            log.Liked = request.Liked.Value;
        if (request.DateWatched.HasValue)
            log.DateWatched = request.DateWatched.Value;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} updated log {LogId}", userId, id);

        var dto = MapToLogDetailDto(log, log.Session, log.User, log.Review, log.Experience);
        return Ok(dto);
    }

    /// <summary>
    /// Delete a log and associated review/experience.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLog(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var log = await _db.Logs
            .Include(l => l.Review)
            .Include(l => l.Experience)
            .FirstOrDefaultAsync(l => l.Id == id, ct);

        if (log is null)
        {
            return NotFoundResult("Log", id);
        }

        if (!IsOwner(log.UserId))
        {
            return ForbiddenResult("You can only delete your own logs.");
        }

        // EF Core will cascade delete Review and Experience
        _db.Logs.Remove(log);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} deleted log {LogId}", userId, id);

        return NoContent();
    }

    // =========================
    // User Logs Listing
    // =========================

    /// <summary>
    /// Get current user's logs with pagination.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserLogsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sessionType = null,
        [FromQuery] bool? isAttended = null,
        CancellationToken ct = default)
    {
        var userId = CurrentUserId!.Value;
        return await GetUserLogsInternal(userId, page, pageSize, sessionType, isAttended, ct);
    }

    /// <summary>
    /// Get a user's public logs with pagination.
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    [ProducesResponseType(typeof(UserLogsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserLogs(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sessionType = null,
        [FromQuery] bool? isAttended = null,
        CancellationToken ct = default)
    {
        // Check if user exists
        var userExists = await _db.Users.AnyAsync(u => u.Id == userId, ct);
        if (!userExists)
        {
            return NotFoundResult("User", userId);
        }

        return await GetUserLogsInternal(userId, page, pageSize, sessionType, isAttended, ct);
    }

    /// <summary>
    /// Get user's log statistics.
    /// </summary>
    [HttpGet("me/stats")]
    [Authorize]
    [ProducesResponseType(typeof(UserLogStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyLogStats(CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;
        return await GetUserLogStatsInternal(userId, ct);
    }

    /// <summary>
    /// Get a user's public log statistics.
    /// </summary>
    [HttpGet("user/{userId:guid}/stats")]
    [ProducesResponseType(typeof(UserLogStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserLogStats(Guid userId, CancellationToken ct)
    {
        var userExists = await _db.Users.AnyAsync(u => u.Id == userId, ct);
        if (!userExists)
        {
            return NotFoundResult("User", userId);
        }

        return await GetUserLogStatsInternal(userId, ct);
    }

    // =========================
    // Weekend Logging
    // =========================

    /// <summary>
    /// Log multiple sessions at once (Weekend Wrapper).
    /// Creates logs for all selected sessions in a round.
    /// </summary>
    [HttpPost("weekend")]
    [Authorize]
    [ProducesResponseType(typeof(LogWeekendResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> LogWeekend([FromBody] LogWeekendRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        // Validate request
        var errors = request.Validate().ToList();
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed", errors });
        }

        // Verify round exists
        var round = await _db.Rounds
            .Include(r => r.Sessions)
            .Include(r => r.Season)
                .ThenInclude(s => s.Series)
            .Include(r => r.Circuit)
            .FirstOrDefaultAsync(r => r.Id == request.RoundId, ct);

        if (round is null)
        {
            return NotFoundResult("Round", request.RoundId);
        }

        // Verify all session IDs belong to this round
        var sessionIds = request.Sessions.Select(s => s.SessionId).ToHashSet();
        var roundSessionIds = round.Sessions.Select(s => s.Id).ToHashSet();
        
        var invalidSessionIds = sessionIds.Except(roundSessionIds).ToList();
        if (invalidSessionIds.Count > 0)
        {
            return BadRequest(new { message = $"Sessions not found in this round: {string.Join(", ", invalidSessionIds)}" });
        }

        // Check for existing logs
        var existingLogs = await _db.Logs
            .Where(l => l.UserId == userId && sessionIds.Contains(l.SessionId))
            .Select(l => l.SessionId)
            .ToListAsync(ct);

        if (existingLogs.Count > 0)
        {
            return Conflict(new { 
                message = "You have already logged some of these sessions.", 
                existingSessionIds = existingLogs 
            });
        }

        // Create logs for all sessions
        var logs = new List<Log>();
        var user = await _db.Users.FindAsync([userId], ct);

        foreach (var sessionEntry in request.Sessions)
        {
            var session = round.Sessions.First(s => s.Id == sessionEntry.SessionId);
            
            var log = new Log
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SessionId = sessionEntry.SessionId,
                IsAttended = request.IsAttended,
                StarRating = sessionEntry.StarRating,
                ExcitementRating = sessionEntry.ExcitementRating,
                Liked = sessionEntry.Liked,
                LoggedAt = DateTime.UtcNow,
                DateWatched = request.DateWatched ?? DateOnly.FromDateTime(DateTime.UtcNow)
            };

            logs.Add(log);
            _db.Logs.Add(log);
        }

        // Create experience if provided and is attended (shared across all sessions)
        if (request.IsAttended && request.Experience != null)
        {
            // For weekend logging, we create one experience entry per log
            // All share the same venue data
            foreach (var log in logs)
            {
                var experience = new Experience
                {
                    Id = Guid.NewGuid(),
                    LogId = log.Id,
                    GrandstandId = request.Experience.GrandstandId,
                    SeatDescription = request.Experience.SeatDescription,
                    VenueRating = request.Experience.VenueRating,
                    ViewRating = request.Experience.ViewRating,
                    AccessRating = request.Experience.AccessRating,
                    FacilitiesRating = request.Experience.FacilitiesRating,
                    AtmosphereRating = request.Experience.AtmosphereRating,
                    ViewPhotoUrl = request.Experience.ViewPhotoUrl
                };
                _db.Experiences.Add(experience);
            }
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} logged weekend {RoundId} ({Count} sessions, attended: {IsAttended})", 
            userId, request.RoundId, logs.Count, request.IsAttended);

        // Build response
        var logDtos = logs.Select(l => MapToLogSummaryDto(
            l, 
            round.Sessions.First(s => s.Id == l.SessionId), 
            user!, 
            round
        )).ToList();

        var averageRating = logs.Any(l => l.StarRating.HasValue) 
            ? logs.Where(l => l.StarRating.HasValue).Average(l => l.StarRating!.Value) 
            : (decimal?)null;

        return CreatedAtAction(
            nameof(GetMyLogs),
            new LogWeekendResponse(logDtos, logs.Count, averageRating)
        );
    }

    // =========================
    // Session Logs (Public)
    // =========================

    /// <summary>
    /// Get all public logs for a session with pagination.
    /// </summary>
    [HttpGet("session/{sessionId:guid}/all")]
    [ProducesResponseType(typeof(UserLogsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionLogs(
        Guid sessionId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var sessionExists = await _db.Sessions.AnyAsync(s => s.Id == sessionId, ct);
        if (!sessionExists)
        {
            return NotFoundResult("Session", sessionId);
        }

        var query = _db.Logs
            .Include(l => l.User)
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
                    .ThenInclude(r => r.Season)
                        .ThenInclude(s => s.Series)
            .Include(l => l.Session.Round.Circuit)
            .Include(l => l.Review)
            .Where(l => l.SessionId == sessionId)
            .OrderByDescending(l => l.LoggedAt);

        var totalCount = await query.CountAsync(ct);
        
        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var logDtos = logs.Select(l => MapToLogSummaryDto(l, l.Session, l.User, l.Session.Round)).ToList();

        return Ok(new UserLogsResponse(logDtos, totalCount, page, pageSize, page * pageSize < totalCount));
    }

    // =========================
    // Helper Methods
    // =========================

    private async Task<IActionResult> GetUserLogsInternal(
        Guid userId,
        int page,
        int pageSize,
        string? sessionType,
        bool? isAttended,
        CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Logs
            .Include(l => l.User)
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
                    .ThenInclude(r => r.Season)
                        .ThenInclude(s => s.Series)
            .Include(l => l.Session.Round.Circuit)
            .Include(l => l.Review)
            .Where(l => l.UserId == userId);

        if (!string.IsNullOrEmpty(sessionType) && Enum.TryParse<SessionType>(sessionType, true, out var type))
        {
            query = query.Where(l => l.Session.Type == type);
        }

        if (isAttended.HasValue)
        {
            query = query.Where(l => l.IsAttended == isAttended.Value);
        }

        query = query.OrderByDescending(l => l.LoggedAt);

        var totalCount = await query.CountAsync(ct);
        
        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var logDtos = logs.Select(l => MapToLogSummaryDto(l, l.Session, l.User, l.Session.Round)).ToList();

        return Ok(new UserLogsResponse(logDtos, totalCount, page, pageSize, page * pageSize < totalCount));
    }

    private async Task<IActionResult> GetUserLogStatsInternal(Guid userId, CancellationToken ct)
    {
        var logs = await _db.Logs
            .Include(l => l.Session)
                .ThenInclude(s => s.Round)
            .Include(l => l.Review)
            .Where(l => l.UserId == userId)
            .ToListAsync(ct);

        var totalLogs = logs.Count;
        var totalReviews = logs.Count(l => l.Review != null);
        var totalAttended = logs.Count(l => l.IsAttended);
        var totalWatched = logs.Count(l => !l.IsAttended);
        var uniqueCircuits = logs.Select(l => l.Session.Round.CircuitId).Distinct().Count();
        var averageRating = logs.Any(l => l.StarRating.HasValue) 
            ? (decimal?)logs.Where(l => l.StarRating.HasValue).Average(l => l.StarRating!.Value) 
            : null;

        // TODO: Calculate total hours watched based on session durations
        int? totalHoursWatched = null;

        return Ok(new UserLogStatsDto(
            totalLogs,
            totalReviews,
            totalAttended,
            totalWatched,
            uniqueCircuits,
            0, // TODO: Implement driver following
            averageRating,
            totalHoursWatched
        ));
    }

    private static LogSummaryDto MapToLogSummaryDto(Log log, Session session, ApplicationUser user, Round round)
    {
        return new LogSummaryDto(
            log.Id,
            log.UserId,
            user.DisplayName ?? user.UserName ?? "Unknown",
            user.AvatarUrl,
            log.SessionId,
            $"{round.Name} - {session.Type}",
            session.Type.ToString(),
            new RoundSummaryDto(
                round.Id,
                round.Name,
                round.Slug,
                round.RoundNumber,
                round.DateStart,
                round.DateEnd,
                new CircuitSummaryDto(
                    round.Circuit.Id,
                    round.Circuit.Name,
                    round.Circuit.Slug,
                    round.Circuit.Country,
                    round.Circuit.CountryCode
                ),
                round.Season.Year,
                round.Season.Series.Name
            ),
            log.IsAttended,
            log.StarRating,
            log.ExcitementRating,
            log.Liked,
            log.LoggedAt,
            log.DateWatched,
            log.Review != null
        );
    }

    private LogDetailDto MapToLogDetailDto(Log log, Session session, ApplicationUser user, Review? review, Experience? experience)
    {
        ReviewDto? reviewDto = null;
        if (review != null)
        {
            var isLikedByCurrentUser = CurrentUserId.HasValue 
                && review.Likes.Any(l => l.UserId == CurrentUserId.Value);

            reviewDto = new ReviewDto(
                review.Id,
                review.LogId,
                review.Body,
                review.ContainsSpoilers,
                review.Language,
                review.CreatedAt,
                review.UpdatedAt,
                review.Likes.Count,
                review.Comments.Count,
                isLikedByCurrentUser
            );
        }

        ExperienceDto? experienceDto = null;
        if (experience != null)
        {
            experienceDto = new ExperienceDto(
                experience.Id,
                experience.LogId,
                experience.GrandstandId,
                experience.Grandstand?.Name,
                experience.SeatDescription,
                experience.VenueRating,
                experience.ViewRating,
                experience.AccessRating,
                experience.FacilitiesRating,
                experience.AtmosphereRating,
                experience.ViewPhotoUrl
            );
        }

        var round = session.Round;

        return new LogDetailDto(
            log.Id,
            log.UserId,
            user.DisplayName ?? user.UserName ?? "Unknown",
            user.AvatarUrl,
            log.SessionId,
            $"{round.Name} - {session.Type}",
            session.Type.ToString(),
            new LogRoundDto(
                round.Id,
                round.Name,
                round.Slug,
                round.RoundNumber,
                round.DateStart,
                round.DateEnd,
                new CircuitDetailDto(
                    round.Circuit.Id,
                    round.Circuit.Name,
                    round.Circuit.Slug,
                    round.Circuit.Location,
                    round.Circuit.Country,
                    round.Circuit.CountryCode,
                    round.Circuit.LayoutMapUrl,
                    round.Circuit.Latitude,
                    round.Circuit.Longitude,
                    round.Circuit.LengthMeters,
                    round.Circuit.Altitude,
                    round.Circuit.WikipediaUrl
                ),
                round.Season.Year,
                round.Season.Series.Name,
                round.Season.Series.Slug,
                round.Season.Series.BrandColors
            ),
            log.IsAttended,
            log.StarRating,
            log.ExcitementRating,
            log.Liked,
            log.LoggedAt,
            log.DateWatched,
            reviewDto,
            experienceDto
        );
    }
}
