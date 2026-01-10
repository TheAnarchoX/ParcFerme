using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for ReviewsController.
/// Tests CRUD operations, authorization, like/unlike, and spoiler handling.
/// </summary>
public class ReviewsControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    // Test data IDs for consistent reference
    private static readonly Guid TestSeriesId = Guid.NewGuid();
    private static readonly Guid TestSeasonId = Guid.NewGuid();
    private static readonly Guid TestRoundId = Guid.NewGuid();
    private static readonly Guid TestRecentRoundId = Guid.NewGuid();
    private static readonly Guid TestCircuitId = Guid.NewGuid();
    private static readonly Guid TestRaceSessionId = Guid.NewGuid();
    private static readonly Guid TestQualifyingSessionId = Guid.NewGuid();
    private static readonly Guid TestRecentSessionId = Guid.NewGuid();
    private static readonly Guid TestUserId = Guid.NewGuid();
    private static readonly Guid TestOtherUserId = Guid.NewGuid();

    public ReviewsControllerTests(ParcFermeWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.InitializeDatabaseAsync();
        await SeedTestDataAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region Test Data Setup

    private async Task SeedTestDataAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();

        // Check if data already exists
        if (await db.Sessions.AnyAsync(s => s.Id == TestRaceSessionId))
        {
            return;
        }

        // Create test series
        var series = new Series
        {
            Id = TestSeriesId,
            Name = "Formula 1",
            Slug = "reviews-test-f1"
        };
        db.Series.Add(series);
        await db.SaveChangesAsync();

        // Create test circuit
        var circuit = new Circuit
        {
            Id = TestCircuitId,
            Name = "Review Test Circuit",
            Slug = "reviews-test-circuit",
            Location = "Test City",
            Country = "Test Country",
            CountryCode = "TC"
        };
        db.Circuits.Add(circuit);
        await db.SaveChangesAsync();

        // Create test season
        var season = new Season
        {
            Id = TestSeasonId,
            SeriesId = TestSeriesId,
            Year = 2024
        };
        db.Seasons.Add(season);
        await db.SaveChangesAsync();

        // Create test round
        var round = new Round
        {
            Id = TestRoundId,
            SeasonId = TestSeasonId,
            CircuitId = TestCircuitId,
            Name = "Review Test Grand Prix",
            Slug = "reviews-test-grand-prix",
            RoundNumber = 1,
            DateStart = new DateOnly(2024, 3, 1),
            DateEnd = new DateOnly(2024, 3, 3)
        };
        db.Rounds.Add(round);
        await db.SaveChangesAsync();

        // Create recent round (for auto-spoiler detection)
        var recentRound = new Round
        {
            Id = TestRecentRoundId,
            SeasonId = TestSeasonId,
            CircuitId = TestCircuitId,
            Name = "Recent Review GP",
            Slug = "reviews-recent-grand-prix",
            RoundNumber = 2,
            DateStart = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
            DateEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1))
        };
        db.Rounds.Add(recentRound);
        await db.SaveChangesAsync();

        // Create test sessions
        var raceSession = new Session
        {
            Id = TestRaceSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Race,
            StartTimeUtc = new DateTime(2024, 3, 3, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var qualifyingSession = new Session
        {
            Id = TestQualifyingSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Qualifying,
            StartTimeUtc = new DateTime(2024, 3, 2, 15, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        // Recent session (within 7 days)
        var recentSession = new Session
        {
            Id = TestRecentSessionId,
            RoundId = TestRecentRoundId,
            Type = SessionType.Race,
            StartTimeUtc = DateTime.UtcNow.AddDays(-2),
            Status = SessionStatus.Completed
        };

        db.Sessions.AddRange(raceSession, qualifyingSession, recentSession);
        await db.SaveChangesAsync();

        // Create test users with passwords
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        
        var user = new ApplicationUser
        {
            Id = TestUserId,
            UserName = "reviewsuser",
            Email = "reviewsuser@test.com",
            DisplayName = "Reviews Test User",
            SpoilerMode = SpoilerMode.Strict
        };
        await userManager.CreateAsync(user, "TestPassword123!");

        var otherUser = new ApplicationUser
        {
            Id = TestOtherUserId,
            UserName = "otherreviewsuser",
            Email = "otherreviewsuser@test.com",
            DisplayName = "Other Reviews User",
            SpoilerMode = SpoilerMode.Strict
        };
        await userManager.CreateAsync(otherUser, "TestPassword123!");
    }

    private async Task<string> GetAuthTokenAsync(string email = "reviewsuser@test.com")
    {
        var loginRequest = new { Email = email, Password = "TestPassword123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        return result.GetProperty("accessToken").GetString()!;
    }

    private HttpClient CreateAuthenticatedClient(string email = "reviewsuser@test.com")
    {
        var client = _factory.CreateClient();
        var token = GetAuthTokenAsync(email).GetAwaiter().GetResult();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<Guid> CreateLogForUserAsync(Guid userId, Guid sessionId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();

        var log = new Log
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionId = sessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow),
            ExcitementRating = 8,
            StarRating = 4.0m,
            Liked = true
        };
        db.Logs.Add(log);
        await db.SaveChangesAsync();
        return log.Id;
    }

    private async Task<Guid> CreateReviewForLogAsync(Guid logId, bool containsSpoilers = false, string body = "Great race!")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();

        var review = new Review
        {
            Id = Guid.NewGuid(),
            LogId = logId,
            Body = body,
            ContainsSpoilers = containsSpoilers,
            Language = "en",
            CreatedAt = DateTime.UtcNow
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review.Id;
    }

    #endregion

    #region CreateReview Tests

    [Fact]
    public async Task CreateReview_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new
        {
            Body = "An amazing race with incredible overtakes!",
            ContainsSpoilers = false,
            Language = "en"
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateReview_WithValidRequest_ReturnsReviewDto()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestQualifyingSessionId);
        var request = new
        {
            Body = "Exciting qualifying session!",
            ContainsSpoilers = true,
            Language = "en"
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review.Should().NotBeNull();
        review!.Body.Should().Be("Exciting qualifying session!");
        review.ContainsSpoilers.Should().BeTrue();
        review.LogId.Should().Be(logId);
    }

    [Fact]
    public async Task CreateReview_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new { Body = "Test review" };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateReview_OtherUsersLog_ReturnsForbidden()
    {
        // Arrange - Create a log for the other user
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        using var client = CreateAuthenticatedClient(); // Login as TestUserId
        var request = new { Body = "Trying to review someone else's log" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateReview_LogAlreadyHasReview_ReturnsConflict()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        await CreateReviewForLogAsync(logId);
        var request = new { Body = "Another review" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreateReview_NonExistentLog_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { Body = "Review for non-existent log" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{Guid.NewGuid()}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateReview_EmptyBody_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new { Body = "" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateReview_BodyTooLong_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new { Body = new string('x', 10001) }; // Over 10,000 chars

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateReview_InvalidLanguageCode_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new
        {
            Body = "Valid body",
            Language = "english" // Should be 2-char ISO code
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateReview_RecentSession_AutoMarksAsSpoiler()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRecentSessionId);
        var request = new
        {
            Body = "Great recent race!",
            ContainsSpoilers = false // User says no spoilers
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/reviews/log/{logId}", request);
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        review!.ContainsSpoilers.Should().BeTrue(); // Auto-marked as spoiler
    }

    #endregion

    #region GetReview Tests

    [Fact]
    public async Task GetReview_WithValidId_ReturnsOk()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/{reviewId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetReview_WithValidId_ReturnsReviewDto()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId, containsSpoilers: true, body: "Test review body");

        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/{reviewId}");
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review.Should().NotBeNull();
        review!.Id.Should().Be(reviewId);
        review.Body.Should().Be("Test review body");
        review.ContainsSpoilers.Should().BeTrue();
    }

    [Fact]
    public async Task GetReview_InvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetReview_Anonymous_ShowsIsLikedByCurrentUserAsFalse()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/{reviewId}");
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review!.IsLikedByCurrentUser.Should().BeFalse();
    }

    #endregion

    #region UpdateReview Tests

    [Fact]
    public async Task UpdateReview_OwnReview_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId, body: "Original review");
        var request = new { Body = "Updated review content" };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateReview_OwnReview_UpdatesValues()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId, containsSpoilers: false, body: "Original");
        var request = new
        {
            Body = "Updated body",
            ContainsSpoilers = true,
            Language = "es"
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review!.Body.Should().Be("Updated body");
        review.ContainsSpoilers.Should().BeTrue();
        review.Language.Should().Be("es");
        review.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateReview_OtherUsersReview_ReturnsForbidden()
    {
        // Arrange - Create a review for the other user
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        using var client = CreateAuthenticatedClient(); // Login as TestUserId
        var request = new { Body = "Trying to update" };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateReview_NonExistent_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { Body = "Update" };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{Guid.NewGuid()}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateReview_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        var request = new { Body = "Update" };

        // Act
        var response = await _client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateReview_EmptyBody_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        var request = new { Body = "" };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region DeleteReview Tests

    [Fact]
    public async Task DeleteReview_OwnReview_ReturnsNoContent()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await client.DeleteAsync($"/api/v1/reviews/{reviewId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteReview_OwnReview_ActuallyDeletes()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        await client.DeleteAsync($"/api/v1/reviews/{reviewId}");
        var getResponse = await _client.GetAsync($"/api/v1/reviews/{reviewId}");

        // Assert
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteReview_OtherUsersReview_ReturnsForbidden()
    {
        // Arrange - Create a review for the other user
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        using var client = CreateAuthenticatedClient(); // Login as TestUserId

        // Act
        var response = await client.DeleteAsync($"/api/v1/reviews/{reviewId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteReview_NonExistent_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();

        // Act
        var response = await client.DeleteAsync($"/api/v1/reviews/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteReview_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.DeleteAsync($"/api/v1/reviews/{reviewId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Like/Unlike Tests

    [Fact]
    public async Task LikeReview_Authenticated_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Create a review by a different user to like
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task LikeReview_Authenticated_IncrementsLikeCount()
    {
        // Arrange - create unique session and review for this test to avoid shared state
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var likeTestSessionId = Guid.NewGuid();
        var likeTestSession = new Session
        {
            Id = likeTestSessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 3, 1, 9, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(likeTestSession);
        
        // Create a log directly in the database
        var likeTestLogId = Guid.NewGuid();
        var likeTestLog = new Log
        {
            Id = likeTestLogId,
            UserId = TestOtherUserId,
            SessionId = likeTestSessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow),
            ExcitementRating = 8
        };
        db.Logs.Add(likeTestLog);
        
        // Create a review directly in the database
        var likeTestReviewId = Guid.NewGuid();
        var likeTestReview = new Review
        {
            Id = likeTestReviewId,
            LogId = likeTestLogId,
            Body = "Test review for like test",
            ContainsSpoilers = false,
            CreatedAt = DateTime.UtcNow
        };
        db.Reviews.Add(likeTestReview);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient();

        // Get initial count before liking
        var initialResponse = await client.GetAsync($"/api/v1/reviews/{likeTestReviewId}");
        var initialReview = await initialResponse.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);
        var initialCount = initialReview!.LikeCount;

        // Act
        var response = await client.PostAsync($"/api/v1/reviews/{likeTestReviewId}/like", null);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert - likeCount should be initial + 1
        result.GetProperty("likeCount").GetInt32().Should().Be(initialCount + 1);
    }

    [Fact]
    public async Task LikeReview_AlreadyLiked_ReturnsConflict()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        
        // Like once
        await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Act - try to like again
        var response = await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task LikeReview_NonExistent_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();

        // Act
        var response = await client.PostAsync($"/api/v1/reviews/{Guid.NewGuid()}/like", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LikeReview_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UnlikeReview_Authenticated_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        
        // Like first
        await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Act - unlike
        var response = await client.DeleteAsync($"/api/v1/reviews/{reviewId}/like");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UnlikeReview_Authenticated_DecrementsLikeCount()
    {
        // Arrange - create unique session and review for this test to avoid shared state
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var unlikeTestSessionId = Guid.NewGuid();
        var unlikeTestSession = new Session
        {
            Id = unlikeTestSessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP2,
            StartTimeUtc = new DateTime(2024, 3, 1, 13, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(unlikeTestSession);
        
        // Create a log directly in the database
        var unlikeTestLogId = Guid.NewGuid();
        var unlikeTestLog = new Log
        {
            Id = unlikeTestLogId,
            UserId = TestOtherUserId,
            SessionId = unlikeTestSessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow),
            ExcitementRating = 8
        };
        db.Logs.Add(unlikeTestLog);
        
        // Create a review directly in the database
        var unlikeTestReviewId = Guid.NewGuid();
        var unlikeTestReview = new Review
        {
            Id = unlikeTestReviewId,
            LogId = unlikeTestLogId,
            Body = "Test review for unlike test",
            ContainsSpoilers = false,
            CreatedAt = DateTime.UtcNow
        };
        db.Reviews.Add(unlikeTestReview);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient();
        
        // Like first
        await client.PostAsync($"/api/v1/reviews/{unlikeTestReviewId}/like", null);

        // Get count after like
        var afterLikeResponse = await client.GetAsync($"/api/v1/reviews/{unlikeTestReviewId}");
        var afterLikeReview = await afterLikeResponse.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);
        var countAfterLike = afterLikeReview!.LikeCount;

        // Act - unlike
        var response = await client.DeleteAsync($"/api/v1/reviews/{unlikeTestReviewId}/like");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert - likeCount should decrease by 1
        result.GetProperty("likeCount").GetInt32().Should().Be(countAfterLike - 1);
    }

    [Fact]
    public async Task UnlikeReview_NotLiked_ReturnsOkWithSameCount()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act - try to unlike without having liked
        var response = await client.DeleteAsync($"/api/v1/reviews/{reviewId}/like");

        // Assert - should succeed but count stays 0
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("likeCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task UnlikeReview_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.DeleteAsync($"/api/v1/reviews/{reviewId}/like");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GetSessionReviews Tests

    [Fact]
    public async Task GetSessionReviews_ValidSession_ReturnsOk()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        await CreateReviewForLogAsync(logId);

        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/session/{TestRaceSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSessionReviews_ValidSession_ReturnsPaginatedReviews()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        await CreateReviewForLogAsync(logId, body: "Review 1");
        
        var otherLogId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        await CreateReviewForLogAsync(otherLogId, body: "Review 2");

        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/session/{TestRaceSessionId}");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert
        result.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(2);
        result.GetProperty("reviews").GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task GetSessionReviews_InvalidSession_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/reviews/session/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSessionReviews_Anonymous_HidesSpoilerReviews()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestQualifyingSessionId);
        await CreateReviewForLogAsync(logId, containsSpoilers: true, body: "Spoiler review");
        
        var otherLogId = await CreateLogForUserAsync(TestOtherUserId, TestQualifyingSessionId);
        await CreateReviewForLogAsync(otherLogId, containsSpoilers: false, body: "Non-spoiler review");

        // Act - anonymous user without includeSpoilers flag
        var response = await _client.GetAsync($"/api/v1/reviews/session/{TestQualifyingSessionId}");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert - should only see non-spoiler review
        var reviews = result.GetProperty("reviews").EnumerateArray().ToList();
        reviews.Should().AllSatisfy(r => r.GetProperty("containsSpoilers").GetBoolean().Should().BeFalse());
    }

    [Fact]
    public async Task GetSessionReviews_WithIncludeSpoilers_ShowsAllReviews()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestQualifyingSessionId);
        await CreateReviewForLogAsync(logId, containsSpoilers: true, body: "Spoiler review");
        
        var otherLogId = await CreateLogForUserAsync(TestOtherUserId, TestQualifyingSessionId);
        await CreateReviewForLogAsync(otherLogId, containsSpoilers: false, body: "Non-spoiler review");

        // Act - with includeSpoilers=true
        var response = await _client.GetAsync($"/api/v1/reviews/session/{TestQualifyingSessionId}?includeSpoilers=true");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert - should see all reviews
        result.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task GetSessionReviews_UserHasLoggedSession_ShowsSpoilersRegardless()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Create spoiler review by other user
        var otherLogId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        await CreateReviewForLogAsync(otherLogId, containsSpoilers: true, body: "Spoiler from other user");
        
        // Current user also logs the session (this should allow them to see spoilers)
        var myLogId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act - authenticated user who has logged the session
        var response = await client.GetAsync($"/api/v1/reviews/session/{TestRaceSessionId}");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert - should see spoiler review because user has logged the session
        var hasSpoilerReview = result.GetProperty("reviews").EnumerateArray()
            .Any(r => r.GetProperty("containsSpoilers").GetBoolean());
        hasSpoilerReview.Should().BeTrue();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task CreateReview_CanLikeOwnReview()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);

        // Act - user likes their own review
        var response = await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Assert - should be allowed
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetReview_Authenticated_ShowsCorrectIsLikedStatus()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId);
        
        // Like the review
        await client.PostAsync($"/api/v1/reviews/{reviewId}/like", null);

        // Act
        var response = await client.GetAsync($"/api/v1/reviews/{reviewId}");
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review!.IsLikedByCurrentUser.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateReview_PartialUpdate_PreservesUnchangedFields()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var reviewId = await CreateReviewForLogAsync(logId, containsSpoilers: true, body: "Original body");
        
        // Only update body, not spoiler flag
        var request = new { Body = "Updated body" };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/reviews/{reviewId}", request);
        var review = await response.Content.ReadFromJsonAsync<ReviewDto>(TestHelpers.JsonOptions);

        // Assert
        review!.Body.Should().Be("Updated body");
        review.ContainsSpoilers.Should().BeTrue(); // Should still be true
    }

    #endregion
}
