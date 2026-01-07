using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParcFerme.Api.Data;
using ParcFerme.Api.Models;
using ParcFerme.Api.Services;

namespace ParcFerme.Api.Tests.Unit.Services;

/// <summary>
/// Unit tests for SpoilerShieldService.
/// Tests spoiler visibility logic based on user modes and log state.
/// </summary>
public class SpoilerShieldServiceTests : IAsyncLifetime
{
    private readonly ParcFermeDbContext _db;
    private readonly SpoilerShieldService _sut;
    
    // Test data IDs
    private static readonly Guid TestSessionId = Guid.NewGuid();
    private static readonly Guid TestUserId = Guid.NewGuid();
    private static readonly Guid TestUserNoneMode = Guid.NewGuid();
    private static readonly Guid TestUserModerateMode = Guid.NewGuid();

    public SpoilerShieldServiceTests()
    {
        var options = new DbContextOptionsBuilder<ParcFermeDbContext>()
            .UseInMemoryDatabase(databaseName: $"SpoilerShield_{Guid.NewGuid()}")
            .Options;
        _db = new ParcFermeDbContext(options);
        var logger = new LoggerFactory().CreateLogger<SpoilerShieldService>();
        _sut = new SpoilerShieldService(_db, logger);
    }

    public async Task InitializeAsync()
    {
        await SeedTestDataAsync();
    }

    public Task DisposeAsync()
    {
        _db.Dispose();
        return Task.CompletedTask;
    }

    private async Task SeedTestDataAsync()
    {
        // Create users with different spoiler modes
        var strictUser = new ApplicationUser
        {
            Id = TestUserId,
            UserName = "strictuser",
            Email = "strict@test.com",
            DisplayName = "Strict User",
            SpoilerMode = SpoilerMode.Strict
        };

        var noneUser = new ApplicationUser
        {
            Id = TestUserNoneMode,
            UserName = "noneuser",
            Email = "none@test.com",
            DisplayName = "None Mode User",
            SpoilerMode = SpoilerMode.None
        };

        var moderateUser = new ApplicationUser
        {
            Id = TestUserModerateMode,
            UserName = "moderateuser",
            Email = "moderate@test.com",
            DisplayName = "Moderate User",
            SpoilerMode = SpoilerMode.Moderate
        };

        _db.Users.AddRange(strictUser, noneUser, moderateUser);
        await _db.SaveChangesAsync();
    }

    #region GetVisibilityMode Tests

    [Fact]
    public void GetVisibilityMode_StrictMode_ReturnsHidden()
    {
        // Act
        var result = _sut.GetVisibilityMode(SpoilerMode.Strict);

        // Assert
        result.Should().Be(SpoilerVisibility.Hidden);
    }

    [Fact]
    public void GetVisibilityMode_ModerateMode_ReturnsPartial()
    {
        // Act
        var result = _sut.GetVisibilityMode(SpoilerMode.Moderate);

        // Assert
        result.Should().Be(SpoilerVisibility.Partial);
    }

    [Fact]
    public void GetVisibilityMode_NoneMode_ReturnsFull()
    {
        // Act
        var result = _sut.GetVisibilityMode(SpoilerMode.None);

        // Assert
        result.Should().Be(SpoilerVisibility.Full);
    }

    [Theory]
    [InlineData(SpoilerMode.Strict, SpoilerVisibility.Hidden)]
    [InlineData(SpoilerMode.Moderate, SpoilerVisibility.Partial)]
    [InlineData(SpoilerMode.None, SpoilerVisibility.Full)]
    public void GetVisibilityMode_AllModes_ReturnExpectedVisibility(SpoilerMode mode, SpoilerVisibility expected)
    {
        // Act
        var result = _sut.GetVisibilityMode(mode);

        // Assert
        result.Should().Be(expected);
    }

    #endregion

    #region ShouldRevealSpoilersAsync Tests

    [Fact]
    public async Task ShouldRevealSpoilersAsync_AnonymousUser_ReturnsFalse()
    {
        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(null, TestSessionId);

        // Assert
        result.Should().BeFalse("anonymous users should never see spoilers");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_NonExistentUser_ReturnsFalse()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(nonExistentUserId, TestSessionId);

        // Assert
        result.Should().BeFalse("non-existent users should not see spoilers");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_UserWithNoneMode_ReturnsTrue()
    {
        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserNoneMode, TestSessionId);

        // Assert
        result.Should().BeTrue("users with SpoilerMode.None should see all spoilers");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_StrictUserWithoutLog_ReturnsFalse()
    {
        // Arrange - No log exists for this session

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserId, TestSessionId);

        // Assert
        result.Should().BeFalse("strict mode users without a log should not see spoilers");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_StrictUserWithLog_ReturnsTrue()
    {
        // Arrange - Create a log for this user/session
        var log = new Log
        {
            Id = Guid.NewGuid(),
            UserId = TestUserId,
            SessionId = TestSessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        _db.Logs.Add(log);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserId, TestSessionId);

        // Assert
        result.Should().BeTrue("users who have logged a session should see spoilers for it");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_ModerateUserWithoutLog_ReturnsFalse()
    {
        // Arrange - No log for this session
        var differentSession = Guid.NewGuid();

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserModerateMode, differentSession);

        // Assert
        result.Should().BeFalse("moderate mode users without a log should not see spoilers");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_UserLogForDifferentSession_ReturnsFalse()
    {
        // Arrange - Create a log for a DIFFERENT session
        var differentSessionId = Guid.NewGuid();
        var log = new Log
        {
            Id = Guid.NewGuid(),
            UserId = TestUserId,
            SessionId = differentSessionId,
            LoggedAt = DateTime.UtcNow,
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        _db.Logs.Add(log);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserId, TestSessionId);

        // Assert
        result.Should().BeFalse("logging a different session should not reveal spoilers for the requested session");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task ShouldRevealSpoilersAsync_EmptyGuidUserId_ReturnsFalse()
    {
        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(Guid.Empty, TestSessionId);

        // Assert
        result.Should().BeFalse("empty GUID user should not exist in database");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_EmptyGuidSessionId_StillWorksForNoneMode()
    {
        // Users with None mode should see spoilers regardless of session existence
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserNoneMode, Guid.Empty);

        // Assert
        result.Should().BeTrue("None mode users see spoilers regardless of session");
    }

    [Fact]
    public async Task ShouldRevealSpoilersAsync_MultipleLogs_StillReturnsTrue()
    {
        // Arrange - Create multiple logs
        var log1 = new Log
        {
            Id = Guid.NewGuid(),
            UserId = TestUserId,
            SessionId = TestSessionId,
            LoggedAt = DateTime.UtcNow.AddDays(-7),
            DateWatched = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7))
        };

        _db.Logs.Add(log1);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.ShouldRevealSpoilersAsync(TestUserId, TestSessionId);

        // Assert
        result.Should().BeTrue("having a log should reveal spoilers");
    }

    #endregion
}
