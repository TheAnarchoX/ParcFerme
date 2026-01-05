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
    
    // Navigation properties
    public ICollection<Log> Logs { get; set; } = [];
    public ICollection<UserList> Lists { get; set; } = [];
    public ICollection<UserFollow> Following { get; set; } = [];
    public ICollection<UserFollow> Followers { get; set; } = [];
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
