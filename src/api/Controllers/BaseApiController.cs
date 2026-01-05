using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ParcFerme.Api.Authorization;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Controllers;

/// <summary>
/// Base controller with common helper methods.
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// Get the current user's ID from claims.
    /// </summary>
    protected Guid? CurrentUserId
    {
        get
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }

    /// <summary>
    /// Get the current user's membership tier from claims.
    /// </summary>
    protected MembershipTier CurrentMembershipTier
    {
        get
        {
            var claim = User.FindFirst(ParcFermeClaims.MembershipTier)?.Value;
            return Enum.TryParse<MembershipTier>(claim, out var tier) ? tier : MembershipTier.Free;
        }
    }

    /// <summary>
    /// Get the current user's spoiler mode from claims.
    /// </summary>
    protected SpoilerMode CurrentSpoilerMode
    {
        get
        {
            var claim = User.FindFirst(ParcFermeClaims.SpoilerMode)?.Value;
            return Enum.TryParse<SpoilerMode>(claim, out var mode) ? mode : SpoilerMode.Strict;
        }
    }

    /// <summary>
    /// Check if the current user has PaddockPass membership.
    /// </summary>
    protected bool IsPaddockPass => CurrentMembershipTier == MembershipTier.PaddockPass;

    /// <summary>
    /// Check if the current user is the owner of a resource.
    /// </summary>
    protected bool IsOwner(Guid resourceOwnerId) => CurrentUserId == resourceOwnerId;

    /// <summary>
    /// Return 404 with a standardized message.
    /// </summary>
    protected IActionResult NotFoundResult(string resource, object? id = null)
    {
        var message = id != null 
            ? $"{resource} with ID '{id}' was not found."
            : $"{resource} was not found.";
        
        return NotFound(new { message });
    }

    /// <summary>
    /// Return 403 when user lacks permission.
    /// </summary>
    protected IActionResult ForbiddenResult(string reason = "You do not have permission to perform this action.")
    {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = reason });
    }
}
