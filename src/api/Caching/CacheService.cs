using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace ParcFerme.Api.Caching;

/// <summary>
/// Abstraction for cache operations with typed access.
/// Wraps IDistributedCache with JSON serialization and convenient methods.
/// </summary>
public interface ICacheService
{
    /// <summary>Get a cached item, or null if not found.</summary>
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    
    /// <summary>Get a cached item, or execute factory and cache the result.</summary>
    Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CacheOptions? options = null, CancellationToken ct = default) where T : class;
    
    /// <summary>Set a cached item with optional expiration.</summary>
    Task SetAsync<T>(string key, T value, CacheOptions? options = null, CancellationToken ct = default) where T : class;
    
    /// <summary>Remove a cached item.</summary>
    Task RemoveAsync(string key, CancellationToken ct = default);
    
    /// <summary>Remove all cached items matching a pattern (prefix).</summary>
    Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default);
}

/// <summary>
/// Options for cache entry expiration.
/// </summary>
public sealed record CacheOptions
{
    /// <summary>Absolute expiration time from now.</summary>
    public TimeSpan? AbsoluteExpiration { get; init; }
    
    /// <summary>Sliding expiration time (resets on access).</summary>
    public TimeSpan? SlidingExpiration { get; init; }
    
    /// <summary>Default: 5 minutes absolute expiration.</summary>
    public static CacheOptions Default => new() { AbsoluteExpiration = TimeSpan.FromMinutes(5) };
    
    /// <summary>Short-lived cache: 1 minute.</summary>
    public static CacheOptions Short => new() { AbsoluteExpiration = TimeSpan.FromMinutes(1) };
    
    /// <summary>Medium cache: 15 minutes.</summary>
    public static CacheOptions Medium => new() { AbsoluteExpiration = TimeSpan.FromMinutes(15) };
    
    /// <summary>Long cache: 1 hour.</summary>
    public static CacheOptions Long => new() { AbsoluteExpiration = TimeSpan.FromHours(1) };
    
    /// <summary>Extended cache: 24 hours (good for static data like circuits).</summary>
    public static CacheOptions Extended => new() { AbsoluteExpiration = TimeSpan.FromHours(24) };
}

/// <summary>
/// Redis-backed implementation of ICacheService.
/// </summary>
public sealed class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        try
        {
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes == null) return null;
            
            return JsonSerializer.Deserialize<T>(bytes, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache get failed for key {Key}", key);
            return null;
        }
    }

    public async Task<T> GetOrCreateAsync<T>(
        string key, 
        Func<Task<T>> factory, 
        CacheOptions? options = null, 
        CancellationToken ct = default) where T : class
    {
        var cached = await GetAsync<T>(key, ct);
        if (cached != null) return cached;

        var value = await factory();
        await SetAsync(key, value, options, ct);
        return value;
    }

    public async Task SetAsync<T>(string key, T value, CacheOptions? options = null, CancellationToken ct = default) where T : class
    {
        options ??= CacheOptions.Default;
        
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
            var distributedOptions = new DistributedCacheEntryOptions();
            
            if (options.AbsoluteExpiration.HasValue)
                distributedOptions.AbsoluteExpirationRelativeToNow = options.AbsoluteExpiration;
            if (options.SlidingExpiration.HasValue)
                distributedOptions.SlidingExpiration = options.SlidingExpiration;
            
            await _cache.SetAsync(key, bytes, distributedOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache set failed for key {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await _cache.RemoveAsync(key, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache remove failed for key {Key}", key);
        }
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        // Note: IDistributedCache doesn't support pattern-based removal.
        // For production, consider using StackExchange.Redis directly for SCAN + DEL.
        _logger.LogWarning("RemoveByPrefixAsync is not fully implemented for IDistributedCache");
        return Task.CompletedTask;
    }
}
