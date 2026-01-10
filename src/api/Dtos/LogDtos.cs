namespace ParcFerme.Api.Dtos;

// =========================
// Log DTOs (Core Logging Flow)
// =========================

/// <summary>
/// Summary of a log entry for lists/feeds.
/// </summary>
public sealed record LogSummaryDto(
    Guid Id,
    Guid UserId,
    string UserDisplayName,
    string? UserAvatarUrl,
    Guid SessionId,
    string SessionName,
    string SessionType,
    RoundSummaryDto Round,
    bool IsAttended,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked,
    DateTime LoggedAt,
    DateOnly? DateWatched,
    bool HasReview
);

/// <summary>
/// Full log details including review and experience.
/// </summary>
public sealed record LogDetailDto(
    Guid Id,
    Guid UserId,
    string UserDisplayName,
    string? UserAvatarUrl,
    Guid SessionId,
    string SessionName,
    string SessionType,
    LogRoundDto Round,
    bool IsAttended,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked,
    DateTime LoggedAt,
    DateOnly? DateWatched,
    ReviewDto? Review,
    ExperienceDto? Experience
);

/// <summary>
/// Round info for log detail (includes full circuit and series data).
/// </summary>
public sealed record LogRoundDto(
    Guid Id,
    string Name,
    string Slug,
    int RoundNumber,
    DateOnly DateStart,
    DateOnly DateEnd,
    CircuitDetailDto Circuit,
    int Year,
    string SeriesName,
    string SeriesSlug,
    IReadOnlyList<string> SeriesBrandColors
);

/// <summary>
/// Request to create a new log.
/// </summary>
public sealed record CreateLogRequest(
    Guid SessionId,
    bool IsAttended,
    decimal? StarRating,
    int? ExcitementRating,
    bool Liked = false,
    DateOnly? DateWatched = null,
    CreateReviewRequest? Review = null,
    CreateExperienceRequest? Experience = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (StarRating.HasValue && (StarRating < 0.5m || StarRating > 5.0m))
            yield return "Star rating must be between 0.5 and 5.0";
        
        if (StarRating.HasValue && StarRating % 0.5m != 0)
            yield return "Star rating must be in 0.5 increments";
        
        if (ExcitementRating.HasValue && (ExcitementRating < 0 || ExcitementRating > 10))
            yield return "Excitement rating must be between 0 and 10";
        
        if (!IsAttended && Experience != null)
            yield return "Experience data can only be provided for attended logs";
    }
}

/// <summary>
/// Request to update an existing log.
/// </summary>
public sealed record UpdateLogRequest(
    bool? IsAttended = null,
    decimal? StarRating = null,
    int? ExcitementRating = null,
    bool? Liked = null,
    DateOnly? DateWatched = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (StarRating.HasValue && (StarRating < 0.5m || StarRating > 5.0m))
            yield return "Star rating must be between 0.5 and 5.0";
        
        if (StarRating.HasValue && StarRating % 0.5m != 0)
            yield return "Star rating must be in 0.5 increments";
        
        if (ExcitementRating.HasValue && (ExcitementRating < 0 || ExcitementRating > 10))
            yield return "Excitement rating must be between 0 and 10";
    }
}

// =========================
// Review DTOs
// =========================

/// <summary>
/// Review details.
/// </summary>
public sealed record ReviewDto(
    Guid Id,
    Guid LogId,
    string Body,
    bool ContainsSpoilers,
    string? Language,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int LikeCount,
    int CommentCount,
    bool IsLikedByCurrentUser
);

/// <summary>
/// Request to create a review.
/// </summary>
public sealed record CreateReviewRequest(
    string Body,
    bool ContainsSpoilers = true,
    string? Language = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (string.IsNullOrWhiteSpace(Body))
            yield return "Review body is required";
        
        if (Body.Length > 10000)
            yield return "Review body must be 10,000 characters or less";
        
        if (Language != null && Language.Length != 2)
            yield return "Language must be a 2-character ISO 639-1 code";
    }
}

/// <summary>
/// Request to update a review.
/// </summary>
public sealed record UpdateReviewRequest(
    string? Body = null,
    bool? ContainsSpoilers = null,
    string? Language = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (Body != null && string.IsNullOrWhiteSpace(Body))
            yield return "Review body cannot be empty";
        
        if (Body != null && Body.Length > 10000)
            yield return "Review body must be 10,000 characters or less";
        
        if (Language != null && Language.Length != 2)
            yield return "Language must be a 2-character ISO 639-1 code";
    }
}

// =========================
// Experience DTOs
// =========================

/// <summary>
/// Experience details for attended logs.
/// </summary>
public sealed record ExperienceDto(
    Guid Id,
    Guid LogId,
    Guid? GrandstandId,
    string? GrandstandName,
    string? SeatDescription,
    int? VenueRating,
    int? ViewRating,
    int? AccessRating,
    int? FacilitiesRating,
    int? AtmosphereRating,
    string? ViewPhotoUrl
);

/// <summary>
/// Request to create an experience entry.
/// </summary>
public sealed record CreateExperienceRequest(
    Guid? GrandstandId = null,
    string? SeatDescription = null,
    int? VenueRating = null,
    int? ViewRating = null,
    int? AccessRating = null,
    int? FacilitiesRating = null,
    int? AtmosphereRating = null,
    string? ViewPhotoUrl = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (VenueRating.HasValue && (VenueRating < 1 || VenueRating > 5))
            yield return "Venue rating must be between 1 and 5";
        
        if (ViewRating.HasValue && (ViewRating < 1 || ViewRating > 5))
            yield return "View rating must be between 1 and 5";
        
        if (AccessRating.HasValue && (AccessRating < 1 || AccessRating > 5))
            yield return "Access rating must be between 1 and 5";
        
        if (FacilitiesRating.HasValue && (FacilitiesRating < 1 || FacilitiesRating > 5))
            yield return "Facilities rating must be between 1 and 5";
        
        if (AtmosphereRating.HasValue && (AtmosphereRating < 1 || AtmosphereRating > 5))
            yield return "Atmosphere rating must be between 1 and 5";
        
        if (SeatDescription != null && SeatDescription.Length > 500)
            yield return "Seat description must be 500 characters or less";
    }
}

/// <summary>
/// Request to update an experience entry.
/// </summary>
public sealed record UpdateExperienceRequest(
    Guid? GrandstandId = null,
    string? SeatDescription = null,
    int? VenueRating = null,
    int? ViewRating = null,
    int? AccessRating = null,
    int? FacilitiesRating = null,
    int? AtmosphereRating = null,
    string? ViewPhotoUrl = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (VenueRating.HasValue && (VenueRating < 1 || VenueRating > 5))
            yield return "Venue rating must be between 1 and 5";
        
        if (ViewRating.HasValue && (ViewRating < 1 || ViewRating > 5))
            yield return "View rating must be between 1 and 5";
        
        if (AccessRating.HasValue && (AccessRating < 1 || AccessRating > 5))
            yield return "Access rating must be between 1 and 5";
        
        if (FacilitiesRating.HasValue && (FacilitiesRating < 1 || FacilitiesRating > 5))
            yield return "Facilities rating must be between 1 and 5";
        
        if (AtmosphereRating.HasValue && (AtmosphereRating < 1 || AtmosphereRating > 5))
            yield return "Atmosphere rating must be between 1 and 5";
        
        if (SeatDescription != null && SeatDescription.Length > 500)
            yield return "Seat description must be 500 characters or less";
    }
}

// =========================
// Weekend Logging DTOs
// =========================

/// <summary>
/// Request to log multiple sessions at once (Weekend Wrapper).
/// </summary>
public sealed record LogWeekendRequest(
    Guid RoundId,
    IReadOnlyList<LogSessionEntry> Sessions,
    bool IsAttended,
    DateOnly? DateWatched = null,
    CreateExperienceRequest? Experience = null
)
{
    /// <summary>
    /// Validates the request.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (Sessions == null || Sessions.Count == 0)
            yield return "At least one session must be selected";
        
        foreach (var session in Sessions ?? [])
        {
            foreach (var error in session.Validate())
                yield return $"Session {session.SessionId}: {error}";
        }
        
        if (!IsAttended && Experience != null)
            yield return "Experience data can only be provided for attended logs";
        
        if (Experience != null)
        {
            foreach (var error in Experience.Validate())
                yield return error;
        }
    }
}

/// <summary>
/// Individual session entry within a weekend log request.
/// </summary>
public sealed record LogSessionEntry(
    Guid SessionId,
    decimal? StarRating = null,
    int? ExcitementRating = null,
    bool Liked = false,
    CreateReviewRequest? Review = null
)
{
    /// <summary>
    /// Validates the entry.
    /// </summary>
    public IEnumerable<string> Validate()
    {
        if (StarRating.HasValue && (StarRating < 0.5m || StarRating > 5.0m))
            yield return "Star rating must be between 0.5 and 5.0";
        
        if (StarRating.HasValue && StarRating % 0.5m != 0)
            yield return "Star rating must be in 0.5 increments";
        
        if (ExcitementRating.HasValue && (ExcitementRating < 0 || ExcitementRating > 10))
            yield return "Excitement rating must be between 0 and 10";
        
        if (Review != null)
        {
            foreach (var error in Review.Validate())
                yield return $"Review: {error}";
        }
    }
}

/// <summary>
/// Response from weekend logging.
/// </summary>
public sealed record LogWeekendResponse(
    IReadOnlyList<LogSummaryDto> Logs,
    int TotalLogged,
    decimal? WeekendAverageRating
);

// =========================
// User Activity DTOs
// =========================

/// <summary>
/// User's log history with pagination.
/// </summary>
public sealed record UserLogsResponse(
    IReadOnlyList<LogSummaryDto> Logs,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);

/// <summary>
/// User statistics summary.
/// </summary>
public sealed record UserLogStatsDto(
    int TotalLogs,
    int TotalReviews,
    int TotalAttended,
    int TotalWatched,
    int UniqueCircuits,
    int UniqueDriversFollowed,
    decimal? AverageRating,
    int? TotalHoursWatched
);
