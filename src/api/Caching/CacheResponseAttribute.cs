using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ParcFerme.Api.Caching;

/// <summary>
/// Response caching filter that caches entire API responses in Redis.
/// Supports user-specific caching and cache invalidation.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class CacheResponseAttribute : Attribute, IAsyncActionFilter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>Cache duration in seconds. Default is 60 seconds.</summary>
    public int DurationSeconds { get; set; } = 60;
    
    /// <summary>If true, cache is per-user. If false, shared across all users.</summary>
    public bool VaryByUser { get; set; } = false;
    
    /// <summary>Query string parameters to include in cache key variation.</summary>
    public string[]? VaryByQueryParams { get; set; }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var cache = context.HttpContext.RequestServices.GetRequiredService<IDistributedCache>();
        var cacheKey = GenerateCacheKey(context);

        // Try to get cached response
        var cachedBytes = await cache.GetAsync(cacheKey);
        if (cachedBytes != null)
        {
            var cachedResponse = JsonSerializer.Deserialize<CachedResponse>(cachedBytes, JsonOptions);
            if (cachedResponse != null)
            {
                context.HttpContext.Response.Headers["X-Cache"] = "HIT";
                context.Result = new ContentResult
                {
                    Content = cachedResponse.Content,
                    ContentType = cachedResponse.ContentType,
                    StatusCode = cachedResponse.StatusCode
                };
                return;
            }
        }

        // Execute the action
        var executedContext = await next();
        context.HttpContext.Response.Headers["X-Cache"] = "MISS";

        // Cache successful responses only
        if (executedContext.Result is ObjectResult objectResult && 
            objectResult.StatusCode is null or >= 200 and < 300)
        {
            var content = JsonSerializer.Serialize(objectResult.Value, JsonOptions);
            var cachedResponse = new CachedResponse
            {
                Content = content,
                ContentType = "application/json",
                StatusCode = objectResult.StatusCode ?? 200
            };

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(DurationSeconds)
            };

            var bytes = JsonSerializer.SerializeToUtf8Bytes(cachedResponse, JsonOptions);
            await cache.SetAsync(cacheKey, bytes, options);
        }
    }

    private string GenerateCacheKey(ActionExecutingContext context)
    {
        var request = context.HttpContext.Request;
        var keyBuilder = new StringBuilder();
        
        keyBuilder.Append("response:");
        keyBuilder.Append(request.Method);
        keyBuilder.Append(':');
        keyBuilder.Append(request.Path.Value?.ToLowerInvariant());

        // Vary by specific query params
        if (VaryByQueryParams?.Length > 0)
        {
            foreach (var param in VaryByQueryParams.OrderBy(p => p))
            {
                if (request.Query.TryGetValue(param, out var value))
                {
                    keyBuilder.Append($":{param}={value}");
                }
            }
        }

        // Vary by user if specified
        if (VaryByUser)
        {
            var userId = context.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                keyBuilder.Append($":user:{userId}");
            }
            else
            {
                keyBuilder.Append(":user:anonymous");
            }
        }

        // Hash long keys
        var key = keyBuilder.ToString();
        if (key.Length > 200)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(key));
            key = $"response:{Convert.ToHexString(hash)}";
        }

        return key;
    }

    private sealed record CachedResponse
    {
        public required string Content { get; init; }
        public required string ContentType { get; init; }
        public required int StatusCode { get; init; }
    }
}

/// <summary>
/// Marks an action as one that invalidates cache entries.
/// Use on POST/PUT/DELETE endpoints to clear related caches.
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public sealed class InvalidatesCacheAttribute : Attribute
{
    /// <summary>Cache key prefixes to invalidate.</summary>
    public string[] Prefixes { get; }

    public InvalidatesCacheAttribute(params string[] prefixes)
    {
        Prefixes = prefixes;
    }
}
