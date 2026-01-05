using Microsoft.AspNetCore.Authorization;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Authorization;

/// <summary>
/// Extension methods to register authorization policies.
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// Adds Parc Fermé authorization policies to the service collection.
    /// </summary>
    public static IServiceCollection AddParcFermeAuthorization(this IServiceCollection services)
    {
        services.AddScoped<IAuthorizationHandler, MembershipRequirementHandler>();

        services.AddAuthorizationBuilder()
            .AddPolicy(Policies.Authenticated, policy =>
            {
                policy.RequireAuthenticatedUser();
            })
            .AddPolicy(Policies.PaddockPass, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.AddRequirements(new MembershipRequirement(MembershipTier.PaddockPass));
            });

        return services;
    }
}
