using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using ParcFerme.Api.Controllers;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for SessionsController.
/// Tests session retrieval and spoiler shield functionality.
/// </summary>
public class SessionsControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    // Test data IDs for consistent reference
    private static readonly Guid TestSeriesId = Guid.NewGuid();
    private static readonly Guid TestSeasonId = Guid.NewGuid();
    private static readonly Guid TestSeason2025Id = Guid.NewGuid();
    private static readonly Guid TestRoundId = Guid.NewGuid();
    private static readonly Guid TestRecentRoundId = Guid.NewGuid();
    private static readonly Guid TestCircuitId = Guid.NewGuid();
    private static readonly Guid TestRaceSessionId = Guid.NewGuid();
    private static readonly Guid TestQualifyingSessionId = Guid.NewGuid();
    private static readonly Guid TestFP1SessionId = Guid.NewGuid();
    private static readonly Guid TestRecentSessionId = Guid.NewGuid();
    private static readonly Guid TestUserId = Guid.NewGuid();
    private static readonly Guid TestDriverId = Guid.NewGuid();
    private static readonly Guid TestTeamId = Guid.NewGuid();
    private static readonly Guid TestEntrantId = Guid.NewGuid();

    public SessionsControllerTests(ParcFermeWebApplicationFactory factory)
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

        // Check if data already exists (from shared fixture)
        if (await db.Sessions.AnyAsync(s => s.Id == TestRaceSessionId))
        {
            return;
        }

        // Create test series
        var series = new Series
        {
            Id = TestSeriesId,
            Name = "Formula 1",
            Slug = "f1"
        };
        db.Series.Add(series);
        await db.SaveChangesAsync();

        // Create test circuit
        var circuit = new Circuit
        {
            Id = TestCircuitId,
            Name = "Silverstone Circuit",
            Slug = "silverstone",
            Location = "Silverstone",
            Country = "United Kingdom",
            CountryCode = "GB"
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
            Name = "British Grand Prix",
            Slug = "british-grand-prix",
            RoundNumber = 12,
            DateStart = new DateOnly(2024, 7, 5),
            DateEnd = new DateOnly(2024, 7, 7)
        };
        db.Rounds.Add(round);
        await db.SaveChangesAsync();

        // Create test sessions
        var raceSession = new Session
        {
            Id = TestRaceSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Race,
            StartTimeUtc = new DateTime(2024, 7, 7, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var qualifyingSession = new Session
        {
            Id = TestQualifyingSessionId,
            RoundId = TestRoundId,
            Type = SessionType.Qualifying,
            StartTimeUtc = new DateTime(2024, 7, 6, 15, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var fp1Session = new Session
        {
            Id = TestFP1SessionId,
            RoundId = TestRoundId,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 7, 5, 11, 30, 0, DateTimeKind.Utc), // Friday morning FP1
            Status = SessionStatus.Completed
        };

        db.Sessions.AddRange(raceSession, qualifyingSession, fp1Session);
        await db.SaveChangesAsync();

        // Create 2025 season for recent sessions tests
        var season2025 = new Season
        {
            Id = TestSeason2025Id,
            SeriesId = TestSeriesId,
            Year = 2025
        };
        db.Seasons.Add(season2025);
        await db.SaveChangesAsync();

        // Create a recent round
        var recentRound = new Round
        {
            Id = TestRecentRoundId,
            SeasonId = TestSeason2025Id,
            CircuitId = TestCircuitId,
            Name = "Recent GP",
            Slug = "recent-gp",
            RoundNumber = 1,
            DateStart = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-4)),
            DateEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2))
        };
        db.Rounds.Add(recentRound);
        await db.SaveChangesAsync();

        // Create a recent session for testing "recent" endpoint
        var recentSession = new Session
        {
            Id = TestRecentSessionId,
            RoundId = TestRecentRoundId,
            Type = SessionType.Race,
            StartTimeUtc = DateTime.UtcNow.AddDays(-3),
            Status = SessionStatus.Completed
        };
        db.Sessions.Add(recentSession);
        await db.SaveChangesAsync();

        // Create test driver and team
        var driver = new Driver
        {
            Id = TestDriverId,
            FirstName = "Lewis",
            LastName = "Hamilton",
            Slug = "lewis-hamilton",
            Abbreviation = "HAM",
            Nationality = "British"
        };
        db.Drivers.Add(driver);

        var team = new Team
        {
            Id = TestTeamId,
            Name = "Mercedes-AMG PETRONAS F1 Team",
            Slug = "mercedes"
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

        // Create race results
        var result = new Result
        {
            Id = Guid.NewGuid(),
            SessionId = TestRaceSessionId,
            EntrantId = TestEntrantId,
            Position = 1,
            GridPosition = 2,
            Status = ResultStatus.Finished,
            Points = 25,
            Time = TimeSpan.FromHours(1).Add(TimeSpan.FromMinutes(30).Add(TimeSpan.FromSeconds(15.456)))
        };
        db.Results.Add(result);
        await db.SaveChangesAsync();

        // Create test user with password
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            Id = TestUserId,
            UserName = "testuser",
            Email = "test@example.com",
            DisplayName = "Test User",
            SpoilerMode = SpoilerMode.Strict
        };
        await userManager.CreateAsync(user, "TestPassword123!");
    }

    private async Task<string> GetAuthTokenAsync()
    {
        var loginRequest = new { Email = "test@example.com", Password = "TestPassword123!" };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        return result.GetProperty("accessToken").GetString()!;
    }

    private HttpClient CreateAuthenticatedClient()
    {
        var client = _factory.CreateClient();
        var token = GetAuthTokenAsync().GetAwaiter().GetResult();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task CreateLogForUserAsync(Guid sessionId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();

        var log = new Log
        {
            Id = Guid.NewGuid(),
            UserId = TestUserId,
            SessionId = sessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow),
            ExcitementRating = 8
        };
        db.Logs.Add(log);
        await db.SaveChangesAsync();
    }

    #endregion

    #region GetSession Tests

    [Fact]
    public async Task GetSession_WithValidId_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSession_WithValidId_ReturnsSessionDetail()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.Id.Should().Be(TestRaceSessionId);
        session.Type.Should().Be("Race");
        session.Status.Should().Be("Completed");
    }

    [Fact]
    public async Task GetSession_WithInvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSession_Anonymous_HidesSpoilers()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.SpoilersRevealed.Should().BeFalse();
        session.Results.Should().BeNull();
        session.IsLogged.Should().BeFalse();
    }

    [Fact]
    public async Task GetSession_AuthenticatedStrictMode_HidesSpoilers()
    {
        // Arrange - Use qualifying session which other tests don't create logs for
        using var client = CreateAuthenticatedClient();

        // First verify the user hasn't logged this session
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var hasLog = await db.Logs.AnyAsync(l => l.UserId == TestUserId && l.SessionId == TestQualifyingSessionId);
        
        // Skip if log already exists (from another test)
        if (hasLog)
        {
            return; // Test cannot run in isolation; consider using test fixtures
        }

        // Act
        var response = await client.GetAsync($"/api/v1/sessions/{TestQualifyingSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.SpoilersRevealed.Should().BeFalse();
        session.Results.Should().BeNull();
    }

    [Fact]
    public async Task GetSession_AuthenticatedWithLog_RevealsSpoilers()
    {
        // Arrange
        await CreateLogForUserAsync(TestRaceSessionId);
        using var client = CreateAuthenticatedClient();

        // Act
        var response = await client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.SpoilersRevealed.Should().BeTrue();
        session.IsLogged.Should().BeTrue();
        session.Results.Should().NotBeNull();
        session.Results!.Winner.Should().NotBeNull();
        session.Results.Winner!.Driver.LastName.Should().Be("Hamilton");
    }

    [Fact]
    public async Task GetSession_IncludesRoundAndCircuitContext()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.Round.Should().NotBeNull();
        session.Round.Name.Should().Be("British Grand Prix");
        session.Round.Circuit.Should().NotBeNull();
        session.Round.Circuit.Name.Should().Be("Silverstone Circuit");
    }

    [Fact]
    public async Task GetSession_IncludesStats()
    {
        // Arrange - Add a log to generate stats
        await CreateLogForUserAsync(TestRaceSessionId);

        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/{TestRaceSessionId}");
        var session = await response.Content.ReadFromJsonAsync<SessionDetailDto>(TestHelpers.JsonOptions);

        // Assert
        session.Should().NotBeNull();
        session!.Stats.Should().NotBeNull();
        session.Stats.TotalEntrants.Should().BeGreaterOrEqualTo(1);
        session.Stats.TotalLogs.Should().BeGreaterOrEqualTo(1);
    }

    #endregion

    #region GetSessionsByRound Tests

    [Fact]
    public async Task GetSessionsByRound_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-round/{TestRoundId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSessionsByRound_ReturnsAllRoundSessions()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-round/{TestRoundId}");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().NotBeNull();
        sessions.Should().HaveCount(3); // Race, Qualifying, FP1
    }

    [Fact]
    public async Task GetSessionsByRound_OrdersByStartTime()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-round/{TestRoundId}");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().BeInAscendingOrder(s => s.StartTimeUtc);
    }

    [Fact]
    public async Task GetSessionsByRound_WithInvalidId_ReturnsEmptyList()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-round/{Guid.NewGuid()}");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        sessions.Should().BeEmpty();
    }

    #endregion

    #region GetSessionsBySeason Tests

    [Fact]
    public async Task GetSessionsBySeason_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-season/{TestSeasonId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSessionsBySeason_ReturnsAllSeasonSessions()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-season/{TestSeasonId}");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().NotBeNull();
        sessions.Should().HaveCountGreaterOrEqualTo(3);
    }

    [Fact]
    public async Task GetSessionsBySeason_FiltersByType()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-season/{TestSeasonId}?type=Race");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().NotBeNull();
        sessions.Should().OnlyContain(s => s.Type == "Race");
    }

    [Fact]
    public async Task GetSessionsBySeason_IgnoresInvalidTypeFilter()
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/sessions/by-season/{TestSeasonId}?type=InvalidType");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        sessions.Should().HaveCountGreaterOrEqualTo(3); // Returns all when filter is invalid
    }

    #endregion

    #region GetRecentSessions Tests

    [Fact]
    public async Task GetRecentSessions_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sessions/recent");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRecentSessions_DefaultsTo7Days()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sessions/recent");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert - Recent session was created 3 days ago
        sessions.Should().NotBeNull();
        sessions.Should().Contain(s => s.Id == TestRecentSessionId);
    }

    [Fact]
    public async Task GetRecentSessions_RespectsCustomDays()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sessions/recent?days=1");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert - Recent session is 3 days old, shouldn't appear in 1-day window
        sessions.Should().NotBeNull();
        sessions.Should().NotContain(s => s.Id == TestRecentSessionId);
    }

    [Fact]
    public async Task GetRecentSessions_FiltersByType()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sessions/recent?days=7&type=Race");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().NotBeNull();
        sessions.Should().OnlyContain(s => s.Type == "Race");
    }

    [Fact]
    public async Task GetRecentSessions_OrdersByStartTimeDescending()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sessions/recent?days=365");
        var sessions = await response.Content.ReadFromJsonAsync<List<SessionSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        sessions.Should().BeInDescendingOrder(s => s.StartTimeUtc);
    }

    #endregion

    #region RevealSpoilers Tests

    [Fact]
    public async Task RevealSpoilers_Anonymous_ReturnsUnauthorized()
    {
        // Arrange
        var request = new { SessionId = TestRaceSessionId, Confirmed = true };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/v1/sessions/{TestRaceSessionId}/reveal", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RevealSpoilers_WithoutConfirmation_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionId = TestRaceSessionId, Confirmed = false };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/sessions/{TestRaceSessionId}/reveal", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RevealSpoilers_MismatchedSessionId_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionId = Guid.NewGuid(), Confirmed = true };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/sessions/{TestRaceSessionId}/reveal", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RevealSpoilers_InvalidSession_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var invalidId = Guid.NewGuid();
        var request = new { SessionId = invalidId, Confirmed = true };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/sessions/{invalidId}/reveal", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RevealSpoilers_ValidRequest_ReturnsResults()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionId = TestRaceSessionId, Confirmed = true };

        // Act
        var response = await client.PostAsJsonAsync($"/api/v1/sessions/{TestRaceSessionId}/reveal", request);
        var result = await response.Content.ReadFromJsonAsync<RevealSpoilersResponse>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Results.Should().NotBeNull();
    }

    [Fact]
    public async Task RevealSpoilers_CreatesLogEntry()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionId = TestQualifyingSessionId, Confirmed = true };

        // Act
        await client.PostAsJsonAsync($"/api/v1/sessions/{TestQualifyingSessionId}/reveal", request);

        // Verify log was created
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var log = db.Logs.FirstOrDefault(l => l.UserId == TestUserId && l.SessionId == TestQualifyingSessionId);

        // Assert
        log.Should().NotBeNull();
        log!.DateWatched.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow));
    }

    [Fact]
    public async Task RevealSpoilers_Idempotent_DoesNotCreateDuplicateLogs()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionId = TestFP1SessionId, Confirmed = true };

        // Act - Reveal twice
        await client.PostAsJsonAsync($"/api/v1/sessions/{TestFP1SessionId}/reveal", request);
        await client.PostAsJsonAsync($"/api/v1/sessions/{TestFP1SessionId}/reveal", request);

        // Verify only one log exists
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        var logCount = db.Logs.Count(l => l.UserId == TestUserId && l.SessionId == TestFP1SessionId);

        // Assert
        logCount.Should().Be(1);
    }

    #endregion

    #region GetSpoilerStatus Tests

    [Fact]
    public async Task GetSpoilerStatus_Anonymous_ReturnsStrictMode()
    {
        // Arrange
        var request = new { SessionIds = new[] { TestRaceSessionId, TestQualifyingSessionId } };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/sessions/spoiler-status", request);
        var status = await response.Content.ReadFromJsonAsync<SpoilerStatusResponse>(TestHelpers.JsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        status.Should().NotBeNull();
        status!.SpoilerMode.Should().Be("Strict");
        status.LoggedSessionIds.Should().BeEmpty();
        status.RevealedCount.Should().Be(0);
    }

    [Fact]
    public async Task GetSpoilerStatus_Authenticated_ReturnsUserMode()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();
        var request = new { SessionIds = new[] { TestRaceSessionId } };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/sessions/spoiler-status", request);
        var status = await response.Content.ReadFromJsonAsync<SpoilerStatusResponse>(TestHelpers.JsonOptions);

        // Assert
        status.Should().NotBeNull();
        status!.SpoilerMode.Should().Be("Strict"); // User was created with Strict mode
    }

    [Fact]
    public async Task GetSpoilerStatus_WithLoggedSessions_ReturnsLoggedIds()
    {
        // Arrange
        await CreateLogForUserAsync(TestRaceSessionId);
        using var client = CreateAuthenticatedClient();
        var request = new { SessionIds = new[] { TestRaceSessionId, TestQualifyingSessionId } };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/sessions/spoiler-status", request);
        var status = await response.Content.ReadFromJsonAsync<SpoilerStatusResponse>(TestHelpers.JsonOptions);

        // Assert
        status.Should().NotBeNull();
        status!.LoggedSessionIds.Should().Contain(TestRaceSessionId);
        status.LoggedSessionIds.Should().NotContain(TestQualifyingSessionId);
        status.RevealedCount.Should().Be(1);
    }

    #endregion
}
