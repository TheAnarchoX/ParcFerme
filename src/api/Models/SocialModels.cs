namespace ParcFerme.Api.Models;

// =========================
// Social Cluster (User-Generated Content)
// =========================

/// <summary>
/// A user's log entry for a session (the "diary" entry).
/// Core unit of user interaction with the platform.
/// </summary>
public sealed class Log
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid SessionId { get; set; }
    
    /// <summary>
    /// Star rating (0.5 to 5.0 in 0.5 increments).
    /// </summary>
    public decimal? StarRating { get; set; }
    
    /// <summary>
    /// Excitement rating (0-10). Spoiler-safe aggregate metric.
    /// </summary>
    public int? ExcitementRating { get; set; }
    
    /// <summary>
    /// Binary "liked" indicator (heart).
    /// </summary>
    public bool Liked { get; set; }
    
    /// <summary>
    /// When the user logged this (may differ from watch date).
    /// </summary>
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When the user actually watched/attended.
    /// </summary>
    public DateOnly? DateWatched { get; set; }
    
    /// <summary>
    /// Whether this was an in-person attendance vs broadcast viewing.
    /// </summary>
    public bool IsAttended { get; set; }
    
    public ApplicationUser User { get; set; } = null!;
    public Session Session { get; set; } = null!;
    public Review? Review { get; set; }
    public Experience? Experience { get; set; }
}

/// <summary>
/// Text review attached to a log entry.
/// </summary>
public sealed class Review
{
    public Guid Id { get; set; }
    public Guid LogId { get; set; }
    
    public required string Body { get; set; }
    
    /// <summary>
    /// Whether this review contains spoilers.
    /// Auto-checked for races less than 7 days old.
    /// </summary>
    public bool ContainsSpoilers { get; set; }
    
    /// <summary>
    /// ISO 639-1 language code (e.g., "en", "de").
    /// </summary>
    public string? Language { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public Log Log { get; set; } = null!;
    public ICollection<ReviewLike> Likes { get; set; } = [];
    public ICollection<ReviewComment> Comments { get; set; } = [];
}

/// <summary>
/// Like on a review.
/// </summary>
public sealed class ReviewLike
{
    public Guid Id { get; set; }
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Review Review { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}

/// <summary>
/// Comment on a review.
/// </summary>
public sealed class ReviewComment
{
    public Guid Id { get; set; }
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    
    public required string Body { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Review Review { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}

/// <summary>
/// Venue experience data for attended races.
/// Only populated when Log.IsAttended = true.
/// </summary>
public sealed class Experience
{
    public Guid Id { get; set; }
    public Guid LogId { get; set; }
    
    /// <summary>
    /// Reference to grandstand, or null for General Admission.
    /// </summary>
    public Guid? GrandstandId { get; set; }
    
    /// <summary>
    /// Free-text seat location description.
    /// </summary>
    public string? SeatDescription { get; set; }
    
    /// <summary>
    /// Overall venue rating (1-5).
    /// </summary>
    public int? VenueRating { get; set; }
    
    /// <summary>
    /// Sightlines and track visibility (1-5).
    /// </summary>
    public int? ViewRating { get; set; }
    
    /// <summary>
    /// Parking, transport, walking distance (1-5).
    /// </summary>
    public int? AccessRating { get; set; }
    
    /// <summary>
    /// Toilets, food, water (1-5).
    /// </summary>
    public int? FacilitiesRating { get; set; }
    
    /// <summary>
    /// Crowd energy, atmosphere (1-5).
    /// </summary>
    public int? AtmosphereRating { get; set; }
    
    /// <summary>
    /// User-uploaded "view from seat" photo.
    /// </summary>
    public string? ViewPhotoUrl { get; set; }
    
    public Log Log { get; set; } = null!;
    public Grandstand? Grandstand { get; set; }
}

/// <summary>
/// User-created list of sessions/rounds.
/// </summary>
public sealed class UserList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    
    public required string Title { get; set; }
    public string? Description { get; set; }
    public bool IsPublic { get; set; } = true;
    public bool IsRanked { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public ApplicationUser User { get; set; } = null!;
    public ICollection<ListItem> Items { get; set; } = [];
}

/// <summary>
/// Item in a user list.
/// </summary>
public sealed class ListItem
{
    public Guid Id { get; set; }
    public Guid ListId { get; set; }
    public Guid SessionId { get; set; }
    
    public int OrderIndex { get; set; }
    public string? Comment { get; set; }
    
    public UserList List { get; set; } = null!;
    public Session Session { get; set; } = null!;
}

/// <summary>
/// User follow relationship.
/// </summary>
public sealed class UserFollow
{
    public Guid Id { get; set; }
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser Follower { get; set; } = null!;
    public ApplicationUser Following { get; set; } = null!;
}
