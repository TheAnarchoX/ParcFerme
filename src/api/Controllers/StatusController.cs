using System.Diagnostics;
using System.Net.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using ParcFerme.Api.Data;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Health check and status endpoint for monitoring system dependencies.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class StatusController : ControllerBase
{
    private readonly ParcFermeDbContext _dbContext;
    private readonly IDistributedCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StatusController> _logger;

    public StatusController(
        ParcFermeDbContext dbContext,
        IDistributedCache cache,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<StatusController> logger)
    {
        _dbContext = dbContext;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Simple health check - returns 200 if API is running.
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new StatusResponse(
            Service: "Parc Fermé API",
            Version: "1.0.0",
            Status: "healthy",
            Timestamp: DateTime.UtcNow
        ));
    }

    /// <summary>
    /// Detailed health check with all dependency statuses.
    /// Use this endpoint for status pages and monitoring.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        var checks = await Task.WhenAll(
            CheckDatabaseAsync(cancellationToken),
            CheckRedisAsync(cancellationToken),
            CheckOpenF1Async(cancellationToken)
        );

        var dbHealth = checks[0];
        var redisHealth = checks[1];
        var openf1Health = checks[2];

        var overallHealthy = dbHealth.Healthy && redisHealth.Healthy;
        var overallStatus = overallHealthy ? "healthy" : "degraded";

        var response = new DetailedHealthResponse(
            Service: "Parc Fermé API",
            Version: "1.0.0",
            Status: overallStatus,
            Timestamp: DateTime.UtcNow,
            Dependencies: new DependencyHealthList(
                Database: dbHealth,
                Redis: redisHealth,
                OpenF1: openf1Health
            )
        );

        return overallHealthy ? Ok(response) : StatusCode(503, response);
    }

    private async Task<DependencyHealth> CheckDatabaseAsync(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            // Simple connectivity check
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            sw.Stop();
            return new DependencyHealth(
                Name: "PostgreSQL",
                Healthy: true,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: null
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Database health check failed");
            return new DependencyHealth(
                Name: "PostgreSQL",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: ex.Message
            );
        }
    }

    private async Task<DependencyHealth> CheckRedisAsync(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            // Try to set and get a test key
            var testKey = "__health_check__";
            var testValue = DateTime.UtcNow.ToString("O");
            await _cache.SetStringAsync(testKey, testValue, ct);
            var retrieved = await _cache.GetStringAsync(testKey, ct);
            await _cache.RemoveAsync(testKey, ct);
            sw.Stop();

            if (retrieved == testValue)
            {
                return new DependencyHealth(
                    Name: "Redis",
                    Healthy: true,
                    ResponseTimeMs: sw.ElapsedMilliseconds,
                    Error: null
                );
            }
            return new DependencyHealth(
                Name: "Redis",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: "Cache read/write verification failed"
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Redis health check failed");
            return new DependencyHealth(
                Name: "Redis",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: ex.Message
            );
        }
    }

    private async Task<DependencyHealth> CheckOpenF1Async(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            
            // Check OpenF1 with a minimal request
            var response = await client.GetAsync(
                "https://api.openf1.org/v1/sessions?session_key=latest",
                ct
            );
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                return new DependencyHealth(
                    Name: "OpenF1 API",
                    Healthy: true,
                    ResponseTimeMs: sw.ElapsedMilliseconds,
                    Error: null
                );
            }

            return new DependencyHealth(
                Name: "OpenF1 API",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
            );
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            return new DependencyHealth(
                Name: "OpenF1 API",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: "Request timed out"
            );
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "OpenF1 health check failed");
            return new DependencyHealth(
                Name: "OpenF1 API",
                Healthy: false,
                ResponseTimeMs: sw.ElapsedMilliseconds,
                Error: ex.Message
            );
        }
    }
}

// =========================
// Response DTOs
// =========================

public record StatusResponse(
    string Service,
    string Version,
    string Status,
    DateTime Timestamp
);

public record DetailedHealthResponse(
    string Service,
    string Version,
    string Status,
    DateTime Timestamp,
    DependencyHealthList Dependencies
);

public record DependencyHealthList(
    DependencyHealth Database,
    DependencyHealth Redis,
    DependencyHealth OpenF1
);

public record DependencyHealth(
    string Name,
    bool Healthy,
    long ResponseTimeMs,
    string? Error
);
