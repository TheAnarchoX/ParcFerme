using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ParcFerme.Api.Authorization;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Auth;

/// <summary>
/// Configuration options for JWT tokens.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    
    public required string Secret { get; init; }
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public int AccessTokenExpirationMinutes { get; init; } = 15;
    public int RefreshTokenExpirationDays { get; init; } = 7;
}

/// <summary>
/// Service for generating and validating JWT tokens.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>Generate an access token for a user.</summary>
    string GenerateAccessToken(ApplicationUser user);
    
    /// <summary>Generate a refresh token.</summary>
    string GenerateRefreshToken();
    
    /// <summary>Validate a refresh token and extract the user ID.</summary>
    TokenValidationResult ValidateAccessToken(string token);
    
    /// <summary>Get the access token expiration time.</summary>
    DateTime GetAccessTokenExpiration();
    
    /// <summary>Get the refresh token expiration time.</summary>
    DateTime GetRefreshTokenExpiration();
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
    }

    public string GenerateAccessToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.DisplayName),
            new(ParcFermeClaims.DisplayName, user.DisplayName),
            new(ParcFermeClaims.MembershipTier, user.MembershipTier.ToString()),
            new(ParcFermeClaims.SpoilerMode, user.SpoilerMode.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (user.AvatarUrl != null)
        {
            claims.Add(new Claim(ParcFermeClaims.AvatarUrl, user.AvatarUrl));
        }

        if (user.MembershipExpiresAt.HasValue)
        {
            claims.Add(new Claim(ParcFermeClaims.MembershipExpires, 
                user.MembershipExpiresAt.Value.ToString("O")));
        }

        var credentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);
        var expires = GetAccessTokenExpiration();

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public TokenValidationResult ValidateAccessToken(string token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return new TokenValidationResult { IsValid = false, Error = "Token is null or empty" };
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = false, // We check expiration manually for refresh scenarios
                ValidateIssuerSigningKey = true,
                ValidIssuer = _options.Issuer,
                ValidAudience = _options.Audience,
                IssuerSigningKey = _signingKey
            }, out var validatedToken);

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return new TokenValidationResult { IsValid = false, Error = "Invalid token claims" };
            }

            return new TokenValidationResult { IsValid = true, UserId = userId };
        }
        catch (SecurityTokenException ex)
        {
            return new TokenValidationResult { IsValid = false, Error = ex.Message };
        }
        catch (ArgumentException ex)
        {
            return new TokenValidationResult { IsValid = false, Error = ex.Message };
        }
    }

    public DateTime GetAccessTokenExpiration() => 
        DateTime.UtcNow.AddMinutes(_options.AccessTokenExpirationMinutes);

    public DateTime GetRefreshTokenExpiration() => 
        DateTime.UtcNow.AddDays(_options.RefreshTokenExpirationDays);
}
