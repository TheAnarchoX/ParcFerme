using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using ParcFerme.Api.Data;
using ParcFerme.Api.Dtos;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for SeriesController endpoints.
/// Tests series browsing and season retrieval functionality.
/// </summary>
public class SeriesControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SeriesControllerTests(ParcFermeWebApplicationFactory factory)
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
            Id = Guid.NewGuid(),
            Name = "Formula 1",
            Slug = "f1",
            LogoUrl = null
        };

        var wecSeries = new Series
        {
            Id = Guid.NewGuid(),
            Name = "World Endurance Championship",
            Slug = "wec",
            LogoUrl = null
        };

        db.Series.AddRange(f1Series, wecSeries);
        await db.SaveChangesAsync();

        // Create test circuit
        var silverstone = new Circuit
        {
            Id = Guid.NewGuid(),
            Name = "Silverstone Circuit",
            Slug = "silverstone",
            Location = "Silverstone",
            Country = "United Kingdom",
            CountryCode = "GB"
        };

        db.Circuits.Add(silverstone);
        await db.SaveChangesAsync();

        // Create test seasons for F1
        var f1Season2024 = new Season
        {
            Id = Guid.NewGuid(),
            SeriesId = f1Series.Id,
            Year = 2024
        };

        var f1Season2025 = new Season
        {
            Id = Guid.NewGuid(),
            SeriesId = f1Series.Id,
            Year = 2025
        };

        db.Seasons.AddRange(f1Season2024, f1Season2025);
        await db.SaveChangesAsync();

        // Create test round for 2024 season
        var britishGp2024 = new Round
        {
            Id = Guid.NewGuid(),
            SeasonId = f1Season2024.Id,
            CircuitId = silverstone.Id,
            Name = "British Grand Prix",
            Slug = "british-grand-prix",
            RoundNumber = 12,
            DateStart = new DateOnly(2024, 7, 5),
            DateEnd = new DateOnly(2024, 7, 7)
        };

        db.Rounds.Add(britishGp2024);
        await db.SaveChangesAsync();

        // Create test sessions
        var fp1 = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            Type = SessionType.FP1,
            StartTimeUtc = new DateTime(2024, 7, 5, 11, 30, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        var race = new Session
        {
            Id = Guid.NewGuid(),
            RoundId = britishGp2024.Id,
            Type = SessionType.Race,
            StartTimeUtc = new DateTime(2024, 7, 7, 14, 0, 0, DateTimeKind.Utc),
            Status = SessionStatus.Completed
        };

        db.Sessions.AddRange(fp1, race);
        await db.SaveChangesAsync();
    }

    #endregion

    #region GetAllSeries Tests

    [Fact]
    public async Task GetAllSeries_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAllSeries_ReturnsList()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series");
        var series = await response.Content.ReadFromJsonAsync<List<SeriesSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        series.Should().NotBeNull();
        series.Should().HaveCountGreaterOrEqualTo(2);
    }

    [Fact]
    public async Task GetAllSeries_IncludesExpectedData()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series");
        var series = await response.Content.ReadFromJsonAsync<List<SeriesSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        var f1 = series!.FirstOrDefault(s => s.Slug == "f1");
        f1.Should().NotBeNull();
        f1!.Name.Should().Be("Formula 1");
        f1.SeasonCount.Should().BeGreaterOrEqualTo(2);
    }

    [Fact]
    public async Task GetAllSeries_IncludesDescription()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series");
        var series = await response.Content.ReadFromJsonAsync<List<SeriesSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        var f1 = series!.First(s => s.Slug == "f1");
        f1.Description.Should().NotBeNullOrEmpty();
        f1.Description.Should().Contain("motorsport");
    }

    #endregion

    #region GetSeriesBySlug Tests

    [Fact]
    public async Task GetSeriesBySlug_WithValidSlug_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSeriesBySlug_WithValidSlug_ReturnsDetail()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1");
        var detail = await response.Content.ReadFromJsonAsync<SeriesDetailDto>(TestHelpers.JsonOptions);

        // Assert
        detail.Should().NotBeNull();
        detail!.Name.Should().Be("Formula 1");
        detail.Slug.Should().Be("f1");
        detail.Seasons.Should().NotBeEmpty();
        detail.Stats.Should().NotBeNull();
    }

    [Fact]
    public async Task GetSeriesBySlug_WithValidSlug_ReturnsSeasonsSortedByYearDescending()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1");
        var detail = await response.Content.ReadFromJsonAsync<SeriesDetailDto>(TestHelpers.JsonOptions);

        // Assert
        detail!.Seasons.Should().BeInDescendingOrder(s => s.Year);
    }

    [Fact]
    public async Task GetSeriesBySlug_WithInvalidSlug_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/invalid-series");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSeriesBySlug_IsCaseInsensitive()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/F1");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSeriesBySlug_IncludesStats()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1");
        var detail = await response.Content.ReadFromJsonAsync<SeriesDetailDto>(TestHelpers.JsonOptions);

        // Assert
        detail!.Stats.TotalSeasons.Should().BeGreaterOrEqualTo(2);
        detail.Stats.TotalRounds.Should().BeGreaterOrEqualTo(1);
        detail.Stats.TotalSessions.Should().BeGreaterOrEqualTo(2);
    }

    #endregion

    #region GetSeasonsBySeriesSlug Tests

    [Fact]
    public async Task GetSeasonsBySeriesSlug_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSeasonsBySeriesSlug_ReturnsSeasons()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons");
        var seasons = await response.Content.ReadFromJsonAsync<List<SeasonSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        seasons.Should().NotBeNull();
        seasons.Should().HaveCountGreaterOrEqualTo(2);
    }

    [Fact]
    public async Task GetSeasonsBySeriesSlug_WithYearFilter_FiltersCorrectly()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons?fromYear=2025");
        var seasons = await response.Content.ReadFromJsonAsync<List<SeasonSummaryDto>>(TestHelpers.JsonOptions);

        // Assert
        seasons.Should().NotBeNull();
        seasons.Should().OnlyContain(s => s.Year >= 2025);
    }

    [Fact]
    public async Task GetSeasonsBySeriesSlug_WithInvalidSeries_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/invalid/seasons");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region GetSeasonByYear Tests

    [Fact]
    public async Task GetSeasonByYear_WithValidParams_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons/2024");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSeasonByYear_WithValidParams_ReturnsDetail()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons/2024");
        var detail = await response.Content.ReadFromJsonAsync<SeasonDetailDto>(TestHelpers.JsonOptions);

        // Assert
        detail.Should().NotBeNull();
        detail!.Year.Should().Be(2024);
        detail.Series.Slug.Should().Be("f1");
        detail.Rounds.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetSeasonByYear_IncludesRoundsWithCircuitInfo()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons/2024");
        var detail = await response.Content.ReadFromJsonAsync<SeasonDetailDto>(TestHelpers.JsonOptions);

        // Assert
        var round = detail!.Rounds.First();
        round.Circuit.Should().NotBeNull();
        round.Circuit.Name.Should().Be("Silverstone Circuit");
        round.Circuit.Country.Should().Be("United Kingdom");
    }

    [Fact]
    public async Task GetSeasonByYear_WithInvalidYear_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons/1900");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSeasonByYear_IncludesStats()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/series/f1/seasons/2024");
        var detail = await response.Content.ReadFromJsonAsync<SeasonDetailDto>(TestHelpers.JsonOptions);

        // Assert
        detail!.Stats.Should().NotBeNull();
        detail.Stats.TotalRounds.Should().BeGreaterOrEqualTo(1);
        detail.Stats.TotalSessions.Should().BeGreaterOrEqualTo(2);
    }

    #endregion
}
