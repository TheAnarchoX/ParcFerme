using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Services;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Session endpoints with Spoiler Shield protection.
/// All result data is protected by default.
/// </summary>
[Route("api/v1/[controller]")]
public sealed class SessionsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ISpoilerShieldService _spoilerShield;
    private readonly ILogger<SessionsController> _logger;

    public SessionsController(
        ParcFermeDbContext db, 
        ISpoilerShieldService spoilerShield,
        ILogger<SessionsController> logger)
    {
        _db = db;
        _spoilerShield = spoilerShield;
        _logger = logger;
    }

    /// <summary>
    /// Get a session by ID with spoiler-protected results.
    /// Results are hidden unless user has logged the session or has SpoilerMode.None.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SessionDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSession(Guid id, CancellationToken ct)
    {
        var session = await _spoilerShield.GetSessionWithSpoilerShieldAsync(id, CurrentUserId, ct);

        if (session is null)
        {
            return NotFoundResult("Session", id);
        }

        return Ok(session);
    }

    /// <summary>
    /// Get sessions for a round (race weekend).
    /// </summary>
    [HttpGet("by-round/{roundId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<SessionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionsByRound(Guid roundId, CancellationToken ct)
    {
        var sessionIds = await _db.Sessions
            .Where(s => s.RoundId == roundId)
            .OrderBy(s => s.StartTimeUtc)
            .Select(s => s.Id)
            .ToListAsync(ct);

        var sessions = await _spoilerShield.GetSessionsWithSpoilerShieldAsync(sessionIds, CurrentUserId, ct);

        return Ok(sessions);
    }

    /// <summary>
    /// Get sessions for a season (optionally filtered by type).
    /// </summary>
    [HttpGet("by-season/{seasonId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<SessionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionsBySeason(
        Guid seasonId, 
        [FromQuery] string? type,
        CancellationToken ct)
    {
        var query = _db.Sessions
            .Where(s => s.Round.SeasonId == seasonId);

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<Models.SessionType>(type, true, out var sessionType))
        {
            query = query.Where(s => s.Type == sessionType);
        }

        var sessionIds = await query
            .OrderBy(s => s.StartTimeUtc)
            .Select(s => s.Id)
            .ToListAsync(ct);

        var sessions = await _spoilerShield.GetSessionsWithSpoilerShieldAsync(sessionIds, CurrentUserId, ct);

        return Ok(sessions);
    }

    /// <summary>
    /// Get recent sessions (last N days).
    /// Useful for "What to watch" discovery.
    /// </summary>
    [HttpGet("recent")]
    [ProducesResponseType(typeof(IReadOnlyList<SessionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecentSessions(
        [FromQuery] int days = 7,
        [FromQuery] string? type = null,
        CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-Math.Abs(days));

        var query = _db.Sessions
            .Where(s => s.StartTimeUtc >= cutoff)
            .Where(s => s.Status == Models.SessionStatus.Completed);

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<Models.SessionType>(type, true, out var sessionType))
        {
            query = query.Where(s => s.Type == sessionType);
        }

        var sessionIds = await query
            .OrderByDescending(s => s.StartTimeUtc)
            .Select(s => s.Id)
            .ToListAsync(ct);

        var sessions = await _spoilerShield.GetSessionsWithSpoilerShieldAsync(sessionIds, CurrentUserId, ct);

        return Ok(sessions);
    }

    /// <summary>
    /// Reveal spoilers for a session.
    /// Creates a minimal log entry to mark the session as "viewed".
    /// Requires authentication.
    /// </summary>
    [HttpPost("{id:guid}/reveal")]
    [Authorize]
    [ProducesResponseType(typeof(RevealSpoilersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevealSpoilers(Guid id, [FromBody] RevealSpoilersRequest request, CancellationToken ct)
    {
        if (!request.Confirmed)
        {
            return BadRequest(new { message = "Spoiler reveal must be explicitly confirmed." });
        }

        if (request.SessionId != id)
        {
            return BadRequest(new { message = "Session ID in body must match URL." });
        }

        var userId = CurrentUserId!.Value;
        var response = await _spoilerShield.RevealSpoilersAsync(userId, id, ct);

        if (!response.Success)
        {
            return NotFoundResult("Session", id);
        }

        return Ok(response);
    }

    /// <summary>
    /// Check spoiler status for multiple sessions.
    /// Returns which sessions the user has logged (can see spoilers for).
    /// </summary>
    [HttpPost("spoiler-status")]
    [ProducesResponseType(typeof(SpoilerStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSpoilerStatus([FromBody] SpoilerStatusRequest request, CancellationToken ct)
    {
        if (CurrentUserId is null)
        {
            // Anonymous users - all sessions are hidden
            return Ok(new SpoilerStatusResponse(
                SpoilerMode: "Strict",
                LoggedSessionIds: [],
                RevealedCount: 0
            ));
        }

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId, ct);

        if (user is null)
        {
            return Ok(new SpoilerStatusResponse(
                SpoilerMode: "Strict",
                LoggedSessionIds: [],
                RevealedCount: 0
            ));
        }

        var loggedIds = await _db.Logs
            .Where(l => l.UserId == CurrentUserId && request.SessionIds.Contains(l.SessionId))
            .Select(l => l.SessionId)
            .ToListAsync(ct);

        return Ok(new SpoilerStatusResponse(
            SpoilerMode: user.SpoilerMode.ToString(),
            LoggedSessionIds: loggedIds,
            RevealedCount: loggedIds.Count
        ));
    }
}

// =========================
// Request/Response Records
// =========================

public sealed record SpoilerStatusRequest(IReadOnlyList<Guid> SessionIds);

public sealed record SpoilerStatusResponse(
    string SpoilerMode,
    IReadOnlyList<Guid> LoggedSessionIds,
    int RevealedCount
);
