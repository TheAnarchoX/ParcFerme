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
/// Integration tests for LogsController.
/// Tests CRUD operations, authorization, spoiler mode behavior, and weekend logging.
/// </summary>
public class LogsControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    // Test data IDs for consistent reference
    private static readonly Guid TestSeriesId = Guid.NewGuid();
    private static readonly Guid TestSeasonId = Guid.NewGuid();
    private static readonly Guid TestRoundId = Guid.NewGuid();
    private static readonly Guid TestCircuitId = Guid.NewGuid();
    private static readonly Guid TestRaceSessionId = Guid.NewGuid();
    private static readonly Guid TestQualifyingSessionId = Guid.NewGuid();
    private static readonly Guid TestFP1SessionId = Guid.NewGuid();
    private static readonly Guid TestFP2SessionId = Guid.NewGuid();
    private static readonly Guid TestRecentSessionId = Guid.NewGuid();
    private static readonly Guid TestRecentRoundId = Guid.NewGuid();
    private static readonly Guid TestUserId = Guid.NewGuid();
    private static readonly Guid TestOtherUserId = Guid.NewGuid();
    private static readonly Guid TestDriverId = Guid.NewGuid();
    private static readonly Guid TestTeamId = Guid.NewGuid();
    private static readonly Guid TestEntrantId = Guid.NewGuid();
    private static readonly Guid TestGrandstandId = Guid.NewGuid();

    public LogsControllerTests(ParcFermeWebApplicationFactory factory)
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
            Slug = "logs-test-f1"
        };
        db.Series.Add(series);
        await db.SaveChangesAsync();

        // Create test circuit
        var circuit = new Circuit
        {
            Id = TestCircuitId,
            Name = "Test Circuit",
            Slug = "logs-test-circuit",
            Location = "Test City",
            Country = "Test Country",
            CountryCode = "TC"
        };
        db.Circuits.Add(circuit);
        await db.SaveChangesAsync();

        // Create test grandstand for experience tests
        var grandstand = new Grandstand
        {
            Id = TestGrandstandId,
            CircuitId = TestCircuitId,
            Name = "Main Grandstand",
            Description = "The main grandstand"
        };
        db.Grandstands.Add(grandstand);
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
            Name = "Test Grand Prix",
            Slug = "logs-test-grand-prix",
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
            Name = "Recent Grand Prix",
            Slug = "logs-recent-grand-prix",
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

        var fp1Session = new Session
        {
            Id = TestFP1SessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 3, 1, 10, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var fp2Session = new Session
        {
            Id = TestFP2SessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP2,
            StartTimeUtc = new DateTime(2024, 3, 1, 14, 0, 0, DateTimeKind.Utc),
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

        db.Sessions.AddRange(raceSession, qualifyingSession, fp1Session, fp2Session, recentSession);
        await db.SaveChangesAsync();

        // Create test driver and team
        var driver = new Driver
        {
            Id = TestDriverId,
            FirstName = "Test",
            LastName = "Driver",
            Slug = "logs-test-driver",
            Abbreviation = "TDR",
            Nationality = "Test"
        };
        db.Drivers.Add(driver);

        var team = new Team
        {
            Id = TestTeamId,
            Name = "Test Team",
            Slug = "logs-test-team"
        };
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        // Create entrant
        var entrant = new Entrant
        {
            Id = TestEntrantId,
            RoundId = TestRoundId,
            DriverId = TestDriverId,
            TeamId = TestTeamId
        };
        db.Entrants.Add(entrant);
        await db.SaveChangesAsync();

        // Create race results (for spoiler tests)
        var result = new Result
        {
            Id = Guid.NewGuid(),
            SessionId = TestRaceSessionId,
            EntrantId = TestEntrantId,
            Position = 1,
            GridPosition = 2,
            Status = ResultStatus.Finished,
            Points = 25,
            Time = TimeSpan.FromHours(1).Add(TimeSpan.FromMinutes(30))
        };
        db.Results.Add(result);
        await db.SaveChangesAsync();

        // Create test users with passwords
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        
        var user = new ApplicationUser
        {
            Id = TestUserId,
            UserName = "logsuser",
            Email = "logsuser@test.com",
            DisplayName = "Logs Test User",
            SpoilerMode = SpoilerMode.Strict
        };
        await userManager.CreateAsync(user, "TestPassword123!");

        var otherUser = new ApplicationUser
        {
            Id = TestOtherUserId,
            UserName = "otherlogsuser",
            Email = "otherlogsuser@test.com",
            DisplayName = "Other Logs User",
            SpoilerMode = SpoilerMode.Strict
        };
        await userManager.CreateAsync(otherUser, "TestPassword123!");
    }

    private async Task<string> GetAuthTokenAsync(string email = "logsuser@test.com")
    {
        var loginRequest = new { Email = email, Password = "TestPassword123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        return result.GetProperty("accessToken").GetString()!;
    }

    private HttpClient CreateAuthenticatedClient(string email = "logsuser@test.com")
    {
        var client = _factory.CreateClient();
        var token = GetAuthTokenAsync(email).GetAwaiter().GetResult();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<Guid> CreateLogForUserAsync(Guid userId, Guid sessionId, decimal? starRating = 4.0m)
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
            StarRating = starRating,
            Liked = true
        };
        db.Logs.Add(log);
        await db.SaveChangesAsync();
        return log.Id;
    }

    #endregion

    #region CreateLog Tests

    [Fact]
    public async Task CreateLog_WithValidRequest_ReturnsCreated()
    {
        // Arrange - create unique session for this test
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var uniqueSessionId = Guid.NewGuid();
        var uniqueSession = new Session
        {
            Id = uniqueSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Qualifying,
            StartTimeUtc = new DateTime(2024, 3, 2, 16, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(uniqueSession);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient();
        var request = new
        {
            SessionId = uniqueSessionId,
            IsAttended = false,
            StarRating = 4.0m,
            ExcitementRating = 7,
            Liked = true
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateLog_WithValidRequest_ReturnsLogDetail()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var sessionId = TestFP1SessionId;
        var request = new
        {
            SessionId = sessionId,
            IsAttended = false,
            StarRating = 3.5m,
            ExcitementRating = 6,
            Liked = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        log.Should().NotBeNull();
        log!.SessionId.Should().Be(sessionId);
        log.StarRating.Should().Be(3.5m);
        log.ExcitementRating.Should().Be(6);
        log.Liked.Should().BeFalse();
        log.IsAttended.Should().BeFalse();
    }

    [Fact]
    public async Task CreateLog_WithReview_CreatesReview()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            SessionId = TestFP2SessionId,
            IsAttended = false,
            StarRating = 4.5m,
            ExcitementRating = 9,
            Review = new
            {
                Body = "An exciting session with lots of action!",
                ContainsSpoilers = false,
                Language = "en"
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        log!.Review.Should().NotBeNull();
        log.Review!.Body.Should().Be("An exciting session with lots of action!");
    }

    [Fact]
    public async Task CreateLog_WithExperienceForAttended_CreatesExperience()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Use a different session to avoid conflicts
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        // Create a new session for this test
        var newSessionId = Guid.NewGuid();
        var newSession = new Session
        {
            Id = newSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Sprint,
            StartTimeUtc = new DateTime(2024, 3, 2, 10, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(newSession);
        await db.SaveChangesAsync();

        var request = new
        {
            SessionId = newSessionId,
            IsAttended = true,
            StarRating = 5.0m,
            ExcitementRating = 10,
            Experience = new
            {
                GrandstandId = TestGrandstandId,
                SeatDescription = "Row 5, Seat 12",
                VenueRating = 5,
                ViewRating = 4,
                AccessRating = 3,
                FacilitiesRating = 4,
                AtmosphereRating = 5
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        log!.Experience.Should().NotBeNull();
        log.Experience!.GrandstandId.Should().Be(TestGrandstandId);
        log.Experience.SeatDescription.Should().Be("Row 5, Seat 12");
        log.Experience.VenueRating.Should().Be(5);
    }

    [Fact]
    public async Task CreateLog_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var request = new { SessionId = TestRaceSessionId, IsAttended = false };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateLog_DuplicateSession_ReturnsConflict()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        
        var request = new
        {
            SessionId = TestRaceSessionId,
            IsAttended = false,
            StarRating = 3.0m
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("already logged");
    }

    [Fact]
    public async Task CreateLog_InvalidSession_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            SessionId = Guid.NewGuid(),
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateLog_InvalidStarRating_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Create a new session to avoid conflicts
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var newSessionId = Guid.NewGuid();
        var newSession = new Session
        {
            Id = newSessionId,
            RoundId = TestRoundId,
            Type = SessionType.SprintQualifying,
            StartTimeUtc = new DateTime(2024, 3, 2, 12, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(newSession);
        await db.SaveChangesAsync();

        var request = new
        {
            SessionId = newSessionId,
            IsAttended = false,
            StarRating = 6.0m // Invalid: max is 5.0
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateLog_InvalidExcitementRating_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Create a new session to avoid conflicts
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var newSessionId = Guid.NewGuid();
        var newSession = new Session
        {
            Id = newSessionId,
            RoundId = TestRecentRoundId,
            Type = SessionType.FP1,
            StartTimeUtc = DateTime.UtcNow.AddDays(-2),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(newSession);
        await db.SaveChangesAsync();

        var request = new
        {
            SessionId = newSessionId,
            IsAttended = false,
            ExcitementRating = 15 // Invalid: max is 10
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateLog_ExperienceForNonAttended_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // Create a new session
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var newSessionId = Guid.NewGuid();
        var newSession = new Session
        {
            Id = newSessionId,
            RoundId = TestRecentRoundId,
            Type = SessionType.FP2,
            StartTimeUtc = DateTime.UtcNow.AddDays(-2),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(newSession);
        await db.SaveChangesAsync();

        var request = new
        {
            SessionId = newSessionId,
            IsAttended = false, // Not attended
            Experience = new    // But providing experience
            {
                VenueRating = 4
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateLog_RecentSession_AutoMarksReviewAsSpoiler()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            SessionId = TestRecentSessionId,
            IsAttended = false,
            Review = new
            {
                Body = "Great race!",
                ContainsSpoilers = false // User says no spoilers
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs", request);
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        log!.Review.Should().NotBeNull();
        log.Review!.ContainsSpoilers.Should().BeTrue(); // Auto-marked as spoiler
    }

    #endregion

    #region GetLog Tests

    [Fact]
    public async Task GetLog_WithValidId_ReturnsOk()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await _client.GetAsync($"/api/v1/logs/{logId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetLog_WithValidId_ReturnsLogDetail()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId, 4.5m);

        // Act
        var response = await _client.GetAsync($"/api/v1/logs/{logId}");
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        log.Should().NotBeNull();
        log!.Id.Should().Be(logId);
        log.StarRating.Should().Be(4.5m);
    }

    [Fact]
    public async Task GetLog_InvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/logs/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region GetLogBySession Tests

    [Fact]
    public async Task GetLogBySession_Authenticated_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await client.GetAsync($"/api/v1/logs/session/{TestRaceSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetLogBySession_NoLog_ReturnsNotFound()
    {
        // Arrange - create unique session for this test that no one has logged
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var unloggedSessionId = Guid.NewGuid();
        var unloggedSession = new Session
        {
            Id = unloggedSessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP3,
            StartTimeUtc = new DateTime(2024, 3, 2, 11, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(unloggedSession);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient();

        // Act - try to get log for a session the user hasn't logged
        var response = await client.GetAsync($"/api/v1/logs/session/{unloggedSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetLogBySession_Anonymous_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/logs/session/{TestRaceSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region UpdateLog Tests

    [Fact]
    public async Task UpdateLog_OwnLog_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId, 3.0m);
        var request = new
        {
            StarRating = 4.5m,
            ExcitementRating = 9
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/logs/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateLog_OwnLog_UpdatesValues()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId, 3.0m);
        var request = new
        {
            StarRating = 5.0m,
            ExcitementRating = 10,
            Liked = true
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/logs/{logId}", request);
        var log = await response.Content.ReadFromJsonAsync<LogDetailDto>(TestHelpers.JsonOptions);

        // Assert
        log!.StarRating.Should().Be(5.0m);
        log.ExcitementRating.Should().Be(10);
        log.Liked.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateLog_OtherUsersLog_ReturnsForbidden()
    {
        // Arrange - Create a log for the other user
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        using var client = CreateAuthenticatedClient(); // Login as TestUserId
        var request = new { StarRating = 5.0m };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/logs/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateLog_NonExistent_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { StarRating = 4.0m };

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/logs/{Guid.NewGuid()}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateLog_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new { StarRating = 4.0m };

        // Act
        var response = await _client.PutAsJsonAsync($"/api/v1/logs/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateLog_InvalidRating_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        var request = new { StarRating = 10.0m }; // Invalid

        // Act
        var response = await client.PutAsJsonAsync($"/api/v1/logs/{logId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region DeleteLog Tests

    [Fact]
    public async Task DeleteLog_OwnLog_ReturnsNoContent()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await client.DeleteAsync($"/api/v1/logs/{logId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteLog_OwnLog_ActuallyDeletes()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        await client.DeleteAsync($"/api/v1/logs/{logId}");
        var getResponse = await _client.GetAsync($"/api/v1/logs/{logId}");

        // Assert
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteLog_OtherUsersLog_ReturnsForbidden()
    {
        // Arrange - Create a log for the other user
        var logId = await CreateLogForUserAsync(TestOtherUserId, TestRaceSessionId);
        using var client = CreateAuthenticatedClient(); // Login as TestUserId

        // Act
        var response = await client.DeleteAsync($"/api/v1/logs/{logId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteLog_NonExistent_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();

        // Act
        var response = await client.DeleteAsync($"/api/v1/logs/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteLog_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var logId = await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await _client.DeleteAsync($"/api/v1/logs/{logId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Weekend Logging Tests

    [Fact]
    public async Task LogWeekend_WithValidRequest_ReturnsCreated()
    {
        // Arrange - create unique sessions for this test
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var weekendRoundId = Guid.NewGuid();
        var weekendRound = new Round
        {
            Id = weekendRoundId,
            SeasonId = TestSeasonId,
            CircuitId = TestCircuitId,
            Name = "Weekend Test GP 1",
            Slug = "weekend-test-gp-1",
            RoundNumber = 10,
            DateStart = new DateOnly(2024, 5, 1),
            DateEnd = new DateOnly(2024, 5, 3)
        };
        db.Rounds.Add(weekendRound);
        
        var sessionA = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = weekendRoundId,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 5, 1, 10, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        var sessionB = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = weekendRoundId,
            Type = SessionType.Qualifying,
            StartTimeUtc = new DateTime(2024, 5, 2, 15, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.AddRange(sessionA, sessionB);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient("otherlogsuser@test.com");
        var request = new
        {
            RoundId = weekendRoundId,
            Sessions = new[]
            {
                new { SessionId = sessionA.Id, StarRating = 3.0m, ExcitementRating = 5 },
                new { SessionId = sessionB.Id, StarRating = 4.0m, ExcitementRating = 7 }
            },
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task LogWeekend_WithValidRequest_CreatesAllLogs()
    {
        // Arrange - create unique sessions for this test
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        
        var weekendRoundId = Guid.NewGuid();
        var weekendRound = new Round
        {
            Id = weekendRoundId,
            SeasonId = TestSeasonId,
            CircuitId = TestCircuitId,
            Name = "Weekend Test GP 2",
            Slug = "weekend-test-gp-2",
            RoundNumber = 11,
            DateStart = new DateOnly(2024, 6, 1),
            DateEnd = new DateOnly(2024, 6, 3)
        };
        db.Rounds.Add(weekendRound);
        
        var sessionA = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = weekendRoundId,
            Type = SessionType.FP2,
            StartTimeUtc = new DateTime(2024, 6, 1, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        var sessionB = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = weekendRoundId,
            Type = SessionType.Race,
            StartTimeUtc = new DateTime(2024, 6, 3, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };
        db.Sessions.AddRange(sessionA, sessionB);
        await db.SaveChangesAsync();

        using var client = CreateAuthenticatedClient();
        var request = new
        {
            RoundId = weekendRoundId,
            Sessions = new[]
            {
                new { SessionId = sessionA.Id, StarRating = 3.0m, ExcitementRating = 5 },
                new { SessionId = sessionB.Id, StarRating = 3.5m, ExcitementRating = 6 }
            },
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert
        result.GetProperty("totalLogged").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task LogWeekend_SessionNotInRound_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            RoundId = TestRoundId,
            Sessions = new[]
            {
                new { SessionId = TestRecentSessionId } // This session is in a different round
            },
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LogWeekend_SomeSessionsAlreadyLogged_ReturnsConflict()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        // First, log one session
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        
        var request = new
        {
            RoundId = TestRoundId,
            Sessions = new[]
            {
                new { SessionId = TestRaceSessionId }, // Already logged
                new { SessionId = TestQualifyingSessionId }
            },
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task LogWeekend_EmptySessions_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            RoundId = TestRoundId,
            Sessions = Array.Empty<object>(),
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LogWeekend_InvalidRound_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new
        {
            RoundId = Guid.NewGuid(),
            Sessions = new[] { new { SessionId = TestRaceSessionId } },
            IsAttended = false
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LogWeekend_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var request = new
        {
            RoundId = TestRoundId,
            Sessions = new[] { new { SessionId = TestRaceSessionId } },
            IsAttended = false
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/logs/weekend", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region User Logs Listing Tests

    [Fact]
    public async Task GetMyLogs_Authenticated_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await client.GetAsync("/api/v1/logs/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetMyLogs_WithLogs_ReturnsPaginatedList()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);
        await CreateLogForUserAsync(TestUserId, TestQualifyingSessionId);

        // Act
        var response = await client.GetAsync("/api/v1/logs/me");
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Assert
        result.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(2);
        result.GetProperty("logs").GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task GetMyLogs_Anonymous_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/logs/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserLogs_ValidUser_ReturnsOk()
    {
        // Arrange
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await _client.GetAsync($"/api/v1/logs/user/{TestUserId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUserLogs_InvalidUser_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/logs/user/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region User Log Stats Tests

    [Fact]
    public async Task GetMyLogStats_Authenticated_ReturnsOk()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await client.GetAsync("/api/v1/logs/me/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUserLogStats_ValidUser_ReturnsOk()
    {
        // Arrange
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await _client.GetAsync($"/api/v1/logs/user/{TestUserId}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUserLogStats_InvalidUser_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/logs/user/{Guid.NewGuid()}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Session Logs (Public) Tests

    [Fact]
    public async Task GetSessionLogs_ValidSession_ReturnsOk()
    {
        // Arrange
        await CreateLogForUserAsync(TestUserId, TestRaceSessionId);

        // Act
        var response = await _client.GetAsync($"/api/v1/logs/session/{TestRaceSessionId}/all");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSessionLogs_InvalidSession_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/logs/session/{Guid.NewGuid()}/all");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
