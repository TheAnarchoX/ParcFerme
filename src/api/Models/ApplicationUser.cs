using Microsoft.AspNetCore.Identity;

namespace ParcFerme.Api.Models;

/// <summary>
/// Application user extending ASP.NET Core Identity.
/// Stores user preferences including spoiler settings.
/// </summary>
public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    
    /// <summary>
    /// Membership tier: Free or PaddockPass (premium).
    /// Determines access to advanced features.
    /// </summary>
    public MembershipTier MembershipTier { get; set; } = MembershipTier.Free;
    
    /// <summary>
    /// When the current membership tier expires (null for Free tier).
    /// </summary>
    public DateTime? MembershipExpiresAt { get; set; }
    
    /// <summary>
    /// Spoiler protection mode: Strict, Moderate, or None.
    /// Default is Strict (hide all results until logged).
    /// </summary>
    public SpoilerMode SpoilerMode { get; set; } = SpoilerMode.Strict;
    
    /// <summary>
    /// User's preferred primary series (F1, MotoGP, etc.)
    /// </summary>
    public Guid? PrimarySeriesId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    
    /// <summary>
    /// Refresh token for JWT token renewal.
    /// </summary>
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    
    // Navigation properties
    public ICollection<Log> Logs { get; set; } = [];
    public ICollection<UserList> Lists { get; set; } = [];
    public ICollection<UserFollow> Following { get; set; } = [];
    public ICollection<UserFollow> Followers { get; set; } = [];
    
    /// <summary>
    /// Check if user has an active premium membership.
    /// </summary>
    public bool HasActivePaddockPass => 
        MembershipTier == MembershipTier.PaddockPass && 
        (MembershipExpiresAt == null || MembershipExpiresAt > DateTime.UtcNow);
}

/// <summary>
/// Membership tiers for the application.
/// </summary>
public enum MembershipTier
{
    /// <summary>Free tier with basic features</summary>
    Free = 0,
    /// <summary>Premium tier with advanced features (Paddock Pass)</summary>
    PaddockPass = 1
}

public enum SpoilerMode
{
    /// <summary>Hide all results, images, and review content until race is logged</summary>
    Strict = 0,
    /// <summary>Show thumbnails and excitement ratings, hide winner/podium</summary>
    Moderate = 1,
    /// <summary>Show everything immediately (for live viewers)</summary>
    None = 2
}
