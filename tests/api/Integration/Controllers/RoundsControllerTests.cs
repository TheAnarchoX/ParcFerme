using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for RoundsController endpoints.
/// Tests round (race weekend) detail and listing functionality.
/// </summary>
public class RoundsControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    // Test data IDs
    private Guid _f1SeriesId;
    private Guid _wecSeriesId;
    private Guid _silverstoneId;
    private Guid _spaId;
    private Guid _season2024Id;
    private Guid _season2025Id;
    private Guid _britishGp2024Id;
    private Guid _belgianGp2024Id;
    private Guid _britishGp2025Id;
    private Guid _fp1SessionId;
    private Guid _qualySessionId;
    private Guid _raceSessionId;

    public RoundsControllerTests(ParcFermeWebApplicationFactory factory)
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

        // Create test series
        var f1Series = new Series
        {
            Id = _f1SeriesId = Guid.NewGuid(),
            Name = "Formula 1",
            Slug = "f1",
            LogoUrl = "https://example.com/f1-logo.png",
            BrandColors = ["#E10600", "#FFFFFF"]
        };

        var wecSeries = new Series
        {
            Id = _wecSeriesId = Guid.NewGuid(),
            Name = "World Endurance Championship",
            Slug = "wec",
            LogoUrl = null
        };

        db.Series.AddRange(f1Series, wecSeries);
        await db.SaveChangesAsync();

        // Create test circuits
        var silverstone = new Circuit
        {
            Id = _silverstoneId = Guid.NewGuid(),
            Name = "Silverstone Circuit",
            Slug = "silverstone",
            Location = "Silverstone",
            Country = "United Kingdom",
            CountryCode = "GB",
            Latitude = 52.0786,
            Longitude = -1.0169,
            LengthMeters = 5891
        };

        var spa = new Circuit
        {
            Id = _spaId = Guid.NewGuid(),
            Name = "Circuit de Spa-Francorchamps",
            Slug = "spa",
            Location = "Stavelot",
            Country = "Belgium",
            CountryCode = "BE",
            Latitude = 50.4372,
            Longitude = 5.9714,
            LengthMeters = 7004
        };

        db.Circuits.AddRange(silverstone, spa);
        await db.SaveChangesAsync();

        // Create test seasons for F1
        var f1Season2024 = new Season
        {
            Id = _season2024Id = Guid.NewGuid(),
            SeriesId = f1Series.Id,
            Year = 2024
        };

        var f1Season2025 = new Season
        {
            Id = _season2025Id = Guid.NewGuid(),
            SeriesId = f1Series.Id,
            Year = 2025
        };

        db.Seasons.AddRange(f1Season2024, f1Season2025);
        await db.SaveChangesAsync();

        // Create test rounds for 2024 season
        var britishGp2024 = new Round
        {
            Id = _britishGp2024Id = Guid.NewGuid(),
            SeasonId = f1Season2024.Id,
            CircuitId = silverstone.Id,
            Name = "British Grand Prix",
            Slug = "british-grand-prix",
            RoundNumber = 12,
            DateStart = new DateOnly(2024, 7, 5),
            DateEnd = new DateOnly(2024, 7, 7),
            OpenF1MeetingKey = 1234
        };

        var belgianGp2024 = new Round
        {
            Id = _belgianGp2024Id = Guid.NewGuid(),
            SeasonId = f1Season2024.Id,
            CircuitId = spa.Id,
            Name = "Belgian Grand Prix",
            Slug = "belgian-grand-prix",
            RoundNumber = 14,
            DateStart = new DateOnly(2024, 7, 26),
            DateEnd = new DateOnly(2024, 7, 28),
            OpenF1MeetingKey = 1235
        };

        db.Rounds.AddRange(britishGp2024, belgianGp2024);
        await db.SaveChangesAsync();

        // Create test round for 2025 season
        var britishGp2025 = new Round
        {
            Id = _britishGp2025Id = Guid.NewGuid(),
            SeasonId = f1Season2025.Id,
            CircuitId = silverstone.Id,
            Name = "British Grand Prix",
            Slug = "british-grand-prix",
            RoundNumber = 10,
            DateStart = new DateOnly(2025, 7, 4),
            DateEnd = new DateOnly(2025, 7, 6)
        };

        db.Rounds.Add(britishGp2025);
        await db.SaveChangesAsync();

        // Create test sessions for British GP 2024
        var fp1 = new Session
        {
            Id = _fp1SessionId = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 7, 5, 11, 30, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var qualy = new Session
        {
            Id = _qualySessionId = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            Type = SessionType.Qualifying,
            StartTimeUtc = new DateTime(2024, 7, 6, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var race = new Session
        {
            Id = _raceSessionId = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            Type = SessionType.Race,
            StartTimeUtc = new DateTime(2024, 7, 7, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        db.Sessions.AddRange(fp1, qualy, race);
        await db.SaveChangesAsync();

        // Create test driver and team for entrants
        var driver = new Driver
        {
            Id = Guid.NewGuid(),
            FirstName = "Lewis",
            LastName = "Hamilton",
            Slug = "lewis-hamilton",
            Abbreviation = "HAM",
            Nationality = "British",
            DriverNumber = 44
        };

        var team = new Team
        {
            Id = Guid.NewGuid(),
            Name = "Mercedes-AMG PETRONAS F1 Team",
            Slug = "mercedes",
            ShortName = "Mercedes",
            PrimaryColor = "#00D2BE"
        };

        db.Drivers.Add(driver);
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        // Create entrant
        var entrant = new Entrant
        {
            Id = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            DriverId = driver.Id,
            TeamId = team.Id,
            CarNumber = 44
        };

        db.Entrants.Add(entrant);
        await db.SaveChangesAsync();
    }

    #endregion

    #region GetRoundBySlug Tests

    [Fact]
    public async Task GetRoundBySlug_WithValidParams_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRoundBySlug_WithValidParams_ReturnsRoundPageResponse()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result.Should().NotBeNull();
        result!.Round.Should().NotBeNull();
        result.Round.Name.Should().Be("British Grand Prix");
        result.Round.Slug.Should().Be("british-grand-prix");
        result.Round.RoundNumber.Should().Be(12);
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsSeriesContext()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.Series.Should().NotBeNull();
        result.Round.Series.Name.Should().Be("Formula 1");
        result.Round.Series.Slug.Should().Be("f1");
        result.Round.Series.BrandColors.Should().HaveCount(2);
        result.Round.Series.BrandColors[0].Should().Be("#E10600");
        result.Round.Year.Should().Be(2024);
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsCircuitDetail()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.Circuit.Should().NotBeNull();
        result.Round.Circuit.Name.Should().Be("Silverstone Circuit");
        result.Round.Circuit.Slug.Should().Be("silverstone");
        result.Round.Circuit.Country.Should().Be("United Kingdom");
        result.Round.Circuit.CountryCode.Should().Be("GB");
        result.Round.Circuit.Location.Should().Be("Silverstone");
        result.Round.Circuit.Latitude.Should().Be(52.0786);
        result.Round.Circuit.Longitude.Should().Be(-1.0169);
        result.Round.Circuit.LengthMeters.Should().Be(5891);
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsSessionsTimeline()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.Sessions.Should().NotBeNull();
        result.Round.Sessions.Should().HaveCount(3);
        
        // Sessions should be ordered by start time
        var sessionTypes = result.Round.Sessions.Select(s => s.Type).ToList();
        sessionTypes.Should().ContainInOrder("FP1", "Qualifying", "Race");
    }

    [Fact]
    public async Task GetRoundBySlug_SessionsHaveDisplayNames()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        var fp1 = result!.Round.Sessions.First(s => s.Type == "FP1");
        fp1.DisplayName.Should().Be("Free Practice 1");

        var race = result.Round.Sessions.First(s => s.Type == "Race");
        race.DisplayName.Should().Be("Race");
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsStats()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.Stats.Should().NotBeNull();
        result.Round.Stats.TotalSessions.Should().Be(3);
        result.Round.Stats.CompletedSessions.Should().Be(3);
        result.Round.Stats.TotalEntrants.Should().Be(1);
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsStatusFlags()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert - 2024 race is in the past
        result!.Round.IsCompleted.Should().BeTrue();
        result.Round.IsCurrent.Should().BeFalse();
        result.Round.IsUpcoming.Should().BeFalse();
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsOpenF1MeetingKey()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.OpenF1MeetingKey.Should().Be(1234);
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsDates()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.Round.DateStart.Should().Be(new DateOnly(2024, 7, 5));
        result.Round.DateEnd.Should().Be(new DateOnly(2024, 7, 7));
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsAdjacentRounds_WhenExists()
    {
        // Act - Belgian GP is Round 14, British GP is Round 12
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/belgian-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert - should have British GP as previous, no next
        result!.PreviousRound.Should().NotBeNull();
        result.PreviousRound!.Name.Should().Be("British Grand Prix");
        result.PreviousRound.RoundNumber.Should().Be(12);
        result.NextRound.Should().BeNull();
    }

    [Fact]
    public async Task GetRoundBySlug_ReturnsNoPreviousRound_WhenFirst()
    {
        // Act - British GP is Round 12, the first in our test data
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/british-grand-prix");
        var result = await response.Content.ReadFromJsonAsync<RoundPageResponse>(TestHelpers.JsonOptions);

        // Assert
        result!.PreviousRound.Should().BeNull();
        result.NextRound.Should().NotBeNull();
        result.NextRound!.Name.Should().Be("Belgian Grand Prix");
    }

    [Fact]
    public async Task GetRoundBySlug_WithInvalidSeries_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/invalid/2024/british-grand-prix");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRoundBySlug_WithInvalidYear_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2020/british-grand-prix");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRoundBySlug_WithInvalidRoundSlug_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024/invalid-round");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRoundBySlug_SlugIsCaseInsensitive()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/F1/2024/BRITISH-GRAND-PRIX");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    #endregion

    #region GetRoundsBySeason Tests

    [Fact]
    public async Task GetRoundsBySeason_WithValidParams_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRoundsBySeason_ReturnsRoundList()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");
        var rounds = await response.Content.ReadFromJsonAsync<List<RoundSummaryForSeasonDto>>(TestHelpers.JsonOptions);

        // Assert
        rounds.Should().NotBeNull();
        rounds.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetRoundsBySeason_RoundsAreOrderedByRoundNumber()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");
        var rounds = await response.Content.ReadFromJsonAsync<List<RoundSummaryForSeasonDto>>(TestHelpers.JsonOptions);

        // Assert
        var roundNumbers = rounds!.Select(r => r.RoundNumber).ToList();
        roundNumbers.Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetRoundsBySeason_IncludesCircuitInfo()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");
        var rounds = await response.Content.ReadFromJsonAsync<List<RoundSummaryForSeasonDto>>(TestHelpers.JsonOptions);

        // Assert
        var britishGp = rounds!.First(r => r.Slug == "british-grand-prix");
        britishGp.Circuit.Should().NotBeNull();
        britishGp.Circuit.Name.Should().Be("Silverstone Circuit");
    }

    [Fact]
    public async Task GetRoundsBySeason_IncludesSessionCount()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");
        var rounds = await response.Content.ReadFromJsonAsync<List<RoundSummaryForSeasonDto>>(TestHelpers.JsonOptions);

        // Assert
        var britishGp = rounds!.First(r => r.Slug == "british-grand-prix");
        britishGp.SessionCount.Should().Be(3);
    }

    [Fact]
    public async Task GetRoundsBySeason_IncludesStatusFlags()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2024");
        var rounds = await response.Content.ReadFromJsonAsync<List<RoundSummaryForSeasonDto>>(TestHelpers.JsonOptions);

        // Assert - 2024 races are completed
        var britishGp = rounds!.First(r => r.Slug == "british-grand-prix");
        britishGp.IsCompleted.Should().BeTrue();
        britishGp.IsCurrent.Should().BeFalse();
        britishGp.IsUpcoming.Should().BeFalse();
    }

    [Fact]
    public async Task GetRoundsBySeason_WithInvalidSeries_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/invalid/2024");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRoundsBySeason_WithInvalidYear_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/rounds/f1/2020");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
