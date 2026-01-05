using Microsoft.AspNetCore.Authorization;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Authorization;

/// <summary>
/// Authorization requirement that checks user's membership tier.
/// </summary>
public sealed class MembershipRequirement : IAuthorizationRequirement
{
    public MembershipTier MinimumTier { get; }

    public MembershipRequirement(MembershipTier minimumTier)
    {
        MinimumTier = minimumTier;
    }
}

/// <summary>
/// Handler for membership tier authorization.
/// </summary>
public sealed class MembershipRequirementHandler : AuthorizationHandler<MembershipRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MembershipRequirement requirement)
    {
        var tierClaim = context.User.FindFirst(ParcFermeClaims.MembershipTier);
        
        if (tierClaim == null)
        {
            // No tier claim means free tier (default)
            if (requirement.MinimumTier == MembershipTier.Free)
            {
                context.Succeed(requirement);
            }
            return Task.CompletedTask;
        }

        if (Enum.TryParse<MembershipTier>(tierClaim.Value, out var userTier))
        {
            // Check if user's tier meets minimum requirement
            if (userTier >= requirement.MinimumTier)
            {
                context.Succeed(requirement);
            }
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Custom claim types for Parc Fermé.
/// </summary>
public static class ParcFermeClaims
{
    public const string MembershipTier = "pf:membership_tier";
    public const string MembershipExpires = "pf:membership_expires";
    public const string SpoilerMode = "pf:spoiler_mode";
    public const string DisplayName = "pf:display_name";
    public const string AvatarUrl = "pf:avatar_url";
}

/// <summary>
/// Authorization policy names.
/// </summary>
public static class Policies
{
    /// <summary>Requires any authenticated user (Free or PaddockPass)</summary>
    public const string Authenticated = "Authenticated";
    
    /// <summary>Requires PaddockPass (premium) membership</summary>
    public const string PaddockPass = "PaddockPass";
    
    /// <summary>Requires the user to own the resource being accessed</summary>
    public const string ResourceOwner = "ResourceOwner";
}
