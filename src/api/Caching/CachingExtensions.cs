namespace ParcFerme.Api.Caching;

/// <summary>
/// Extension methods to register caching services.
/// </summary>
public static class CachingExtensions
{
    /// <summary>
    /// Adds Parc Fermé caching services to the service collection.
    /// </summary>
    public static IServiceCollection AddParcFermeCaching(this IServiceCollection services, IConfiguration configuration)
    {
        // Register Redis distributed cache
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "ParcFerme:";
        });

        // Register cache service abstraction
        services.AddScoped<ICacheService, RedisCacheService>();

        // Add response caching for HTTP
        services.AddResponseCaching(options =>
        {
            options.MaximumBodySize = 64 * 1024 * 1024; // 64MB
            options.UseCaseSensitivePaths = false;
        });

        return services;
    }
}
