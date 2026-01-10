using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Review CRUD and interaction endpoints.
/// Reviews are attached to Logs (diary entries).
/// </summary>
[Route("api/v1/[controller]")]
public sealed class ReviewsController : BaseApiController
{
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(ParcFermeDbContext db, ILogger<ReviewsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // =========================
    // Review CRUD
    // =========================

    /// <summary>
    /// Add a review to an existing log.
    /// </summary>
    [HttpPost("log/{logId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReview(Guid logId, [FromBody] CreateReviewRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var errors = request.Validate().ToList();
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed", errors });
        }

        var log = await _db.Logs
            .Include(l => l.Session)
            .Include(l => l.Review)
            .FirstOrDefaultAsync(l => l.Id == logId, ct);

        if (log is null)
        {
            return NotFoundResult("Log", logId);
        }

        if (!IsOwner(log.UserId))
        {
            return ForbiddenResult("You can only add reviews to your own logs.");
        }

        if (log.Review is not null)
        {
            return Conflict(new { message = "This log already has a review. Use PUT to update it." });
        }

        // Auto-check spoilers for recent races (< 7 days old)
        var containsSpoilers = request.ContainsSpoilers;
        if (log.Session.StartTimeUtc > DateTime.UtcNow.AddDays(-7))
        {
            containsSpoilers = true;
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            LogId = logId,
            Body = request.Body,
            ContainsSpoilers = containsSpoilers,
            Language = request.Language,
            CreatedAt = DateTime.UtcNow
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} created review {ReviewId} for log {LogId}", userId, review.Id, logId);

        var dto = new ReviewDto(
            review.Id,
            review.LogId,
            review.Body,
            review.ContainsSpoilers,
            review.Language,
            review.CreatedAt,
            review.UpdatedAt,
            0,
            0,
            false
        );

        return CreatedAtAction(nameof(GetReview), new { id = review.Id }, dto);
    }

    /// <summary>
    /// Get a review by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReview(Guid id, CancellationToken ct)
    {
        var review = await _db.Reviews
            .Include(r => r.Likes)
            .Include(r => r.Comments)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (review is null)
        {
            return NotFoundResult("Review", id);
        }

        var isLikedByCurrentUser = CurrentUserId.HasValue 
            && review.Likes.Any(l => l.UserId == CurrentUserId.Value);

        var dto = new ReviewDto(
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

        return Ok(dto);
    }

    /// <summary>
    /// Update an existing review.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] UpdateReviewRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var errors = request.Validate().ToList();
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed", errors });
        }

        var review = await _db.Reviews
            .Include(r => r.Log)
            .Include(r => r.Likes)
            .Include(r => r.Comments)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (review is null)
        {
            return NotFoundResult("Review", id);
        }

        if (!IsOwner(review.Log.UserId))
        {
            return ForbiddenResult("You can only update your own reviews.");
        }

        if (request.Body != null)
            review.Body = request.Body;
        if (request.ContainsSpoilers.HasValue)
            review.ContainsSpoilers = request.ContainsSpoilers.Value;
        if (request.Language != null)
            review.Language = request.Language;

        review.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} updated review {ReviewId}", userId, id);

        var isLikedByCurrentUser = review.Likes.Any(l => l.UserId == userId);

        var dto = new ReviewDto(
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

        return Ok(dto);
    }

    /// <summary>
    /// Delete a review.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteReview(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var review = await _db.Reviews
            .Include(r => r.Log)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (review is null)
        {
            return NotFoundResult("Review", id);
        }

        if (!IsOwner(review.Log.UserId))
        {
            return ForbiddenResult("You can only delete your own reviews.");
        }

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} deleted review {ReviewId}", userId, id);

        return NoContent();
    }

    // =========================
    // Review Interactions
    // =========================

    /// <summary>
    /// Like a review.
    /// </summary>
    [HttpPost("{id:guid}/like")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> LikeReview(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var review = await _db.Reviews
            .Include(r => r.Likes)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (review is null)
        {
            return NotFoundResult("Review", id);
        }

        var existingLike = review.Likes.FirstOrDefault(l => l.UserId == userId);
        if (existingLike is not null)
        {
            return Conflict(new { message = "You have already liked this review." });
        }

        var like = new ReviewLike
        {
            Id = Guid.NewGuid(),
            ReviewId = id,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.ReviewLikes.Add(like);
        await _db.SaveChangesAsync(ct);

        return Ok(new { likeCount = review.Likes.Count + 1 });
    }

    /// <summary>
    /// Unlike a review.
    /// </summary>
    [HttpDelete("{id:guid}/like")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnlikeReview(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId!.Value;

        var review = await _db.Reviews
            .Include(r => r.Likes)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (review is null)
        {
            return NotFoundResult("Review", id);
        }

        var existingLike = review.Likes.FirstOrDefault(l => l.UserId == userId);
        if (existingLike is null)
        {
            return Ok(new { likeCount = review.Likes.Count });
        }

        _db.ReviewLikes.Remove(existingLike);
        await _db.SaveChangesAsync(ct);

        return Ok(new { likeCount = review.Likes.Count - 1 });
    }

    // =========================
    // Session Reviews (Discovery)
    // =========================

    /// <summary>
    /// Get all public reviews for a session.
    /// Respects spoiler settings - reviews marked as containing spoilers
    /// will be hidden from users who haven't logged the session.
    /// </summary>
    [HttpGet("session/{sessionId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<ReviewWithLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSessionReviews(
        Guid sessionId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool includeSpoilers = false,
        CancellationToken ct = default)
    {
        var sessionExists = await _db.Sessions.AnyAsync(s => s.Id == sessionId, ct);
        if (!sessionExists)
        {
            return NotFoundResult("Session", sessionId);
        }

        // Check if current user has logged this session (allows seeing spoilers)
        var userHasLogged = CurrentUserId.HasValue && await _db.Logs
            .AnyAsync(l => l.UserId == CurrentUserId.Value && l.SessionId == sessionId, ct);

        var query = _db.Reviews
            .Include(r => r.Log)
                .ThenInclude(l => l.User)
            .Include(r => r.Likes)
            .Include(r => r.Comments)
            .Where(r => r.Log.SessionId == sessionId);

        // Filter out spoilers unless user has logged or explicitly requested them
        if (!includeSpoilers && !userHasLogged)
        {
            query = query.Where(r => !r.ContainsSpoilers);
        }

        var totalCount = await query.CountAsync(ct);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var reviewDtos = reviews.Select(r =>
        {
            var isLikedByCurrentUser = CurrentUserId.HasValue 
                && r.Likes.Any(l => l.UserId == CurrentUserId.Value);

            return new ReviewWithLogDto(
                r.Id,
                r.LogId,
                r.Body,
                r.ContainsSpoilers,
                r.Language,
                r.CreatedAt,
                r.UpdatedAt,
                r.Likes.Count,
                r.Comments.Count,
                isLikedByCurrentUser,
                r.Log.UserId,
                r.Log.User.DisplayName ?? r.Log.User.UserName ?? "Unknown",
                r.Log.User.AvatarUrl,
                r.Log.StarRating,
                r.Log.ExcitementRating,
                r.Log.Liked,
                r.Log.IsAttended
            );
        }).ToList();

        return Ok(new
        {
            reviews = reviewDtos,
            totalCount,
            page,
            pageSize,
            hasMore = page * pageSize < totalCount
        });
    }
}

/// <summary>
/// Review with associated log data for session review lists.
/// </summary>
public sealed record ReviewWithLogDto(
    Guid Id,
    Guid LogId,
    string Body,
    bool ContainsSpoilers,
    string? Language,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int LikeCount,
    int CommentCount,
    bool IsLikedByCurrentUser,
    // Log/User data
    Guid UserId,
    string UserDisplayName,
    string? UserAvatarUrl,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked,
    bool IsAttended
);
