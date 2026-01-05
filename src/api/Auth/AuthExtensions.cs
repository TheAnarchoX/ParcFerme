namespace ParcFerme.Api.Auth;

/// <summary>
/// Extension methods to register authentication services.
/// </summary>
public static class AuthExtensions
{
    /// <summary>
    /// Adds Parc Fermé authentication services to the service collection.
    /// </summary>
    public static IServiceCollection AddParcFermeAuth(this IServiceCollection services, IConfiguration configuration)
    {
        // Bind JWT options
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        
        // Register token service
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
