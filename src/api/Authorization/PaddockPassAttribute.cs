using Microsoft.AspNetCore.Authorization;

namespace ParcFerme.Api.Authorization;

/// <summary>
/// Requires the user to have an active PaddockPass (premium) membership.
/// Use this attribute on controllers or actions that should be premium-only.
/// </summary>
/// <example>
/// [PaddockPass]
/// [HttpGet("advanced-stats")]
/// public IActionResult GetAdvancedStats() { ... }
/// </example>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class PaddockPassAttribute : AuthorizeAttribute
{
    public PaddockPassAttribute() : base(Policies.PaddockPass)
    {
    }
}

/// <summary>
/// Requires any authenticated user (Free or PaddockPass).
/// Equivalent to [Authorize] but more explicit about intent.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthenticatedAttribute : AuthorizeAttribute
{
    public AuthenticatedAttribute() : base(Policies.Authenticated)
    {
    }
}
