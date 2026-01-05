using System.ComponentModel.DataAnnotations;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Auth;

// =========================
// Request DTOs
// =========================

public sealed record RegisterRequest
{
    [Required, EmailAddress]
    public required string Email { get; init; }
    
    [Required, MinLength(8)]
    public required string Password { get; init; }
    
    [Required, MinLength(2), MaxLength(50)]
    public required string DisplayName { get; init; }
}

public sealed record LoginRequest
{
    [Required, EmailAddress]
    public required string Email { get; init; }
    
    [Required]
    public required string Password { get; init; }
}

public sealed record RefreshTokenRequest
{
    [Required]
    public required string RefreshToken { get; init; }
}

public sealed record UpdateProfileRequest
{
    [MinLength(2), MaxLength(50)]
    public string? DisplayName { get; init; }
    
    [MaxLength(500)]
    public string? Bio { get; init; }
    
    [Url]
    public string? AvatarUrl { get; init; }
    
    public SpoilerMode? SpoilerMode { get; init; }
}

public sealed record ChangePasswordRequest
{
    [Required]
    public required string CurrentPassword { get; init; }
    
    [Required, MinLength(8)]
    public required string NewPassword { get; init; }
}

// =========================
// Response DTOs
// =========================

public sealed record AuthResponse
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public required DateTime ExpiresAt { get; init; }
    public required UserDto User { get; init; }
}

public sealed record UserDto
{
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public required string DisplayName { get; init; }
    public string? AvatarUrl { get; init; }
    public string? Bio { get; init; }
    public required SpoilerMode SpoilerMode { get; init; }
    public required MembershipTier MembershipTier { get; init; }
    public DateTime? MembershipExpiresAt { get; init; }
    public required DateTime CreatedAt { get; init; }
    
    public static UserDto FromUser(ApplicationUser user) => new()
    {
        Id = user.Id,
        Email = user.Email!,
        DisplayName = user.DisplayName,
        AvatarUrl = user.AvatarUrl,
        Bio = user.Bio,
        SpoilerMode = user.SpoilerMode,
        MembershipTier = user.MembershipTier,
        MembershipExpiresAt = user.MembershipExpiresAt,
        CreatedAt = user.CreatedAt
    };
}

public sealed record TokenValidationResult
{
    public required bool IsValid { get; init; }
    public Guid? UserId { get; init; }
    public string? Error { get; init; }
}
