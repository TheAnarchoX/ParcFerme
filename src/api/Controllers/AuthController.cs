using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Authorization;
using ParcFerme.Api.Data;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Auth;

/// <summary>
/// Authentication and user management endpoints.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtTokenService _tokenService;
    private readonly ParcFermeDbContext _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtTokenService tokenService,
        ParcFermeDbContext db,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Sanitizes a string for safe logging by removing control characters
    /// that could be used for log injection attacks.
    /// </summary>
    /// <param name="value">The string to sanitize.</param>
    /// <returns>A sanitized string safe for logging, or empty string if input is null/empty.</returns>
    internal static string SanitizeForLogging(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        // Remove all Unicode control characters (including ASCII 0-31 and 127) that could be used
        // to forge or break log entries. This includes \r, \n, \t, \f, \v, and other control characters.
        var sb = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            if (!char.IsControl(c))
            {
                sb.Append(c);
            }
        }
        return sb.ToString();
    }

    /// <summary>
    /// Register a new user account.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return Problem(
                title: "Email already registered",
                detail: "An account with this email address already exists.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            CreatedAt = DateTime.UtcNow,
            SpoilerMode = SpoilerMode.Strict, // Safe default
            MembershipTier = MembershipTier.Free
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return ValidationProblem();
        }

        _logger.LogInformation("New user registered: {UserId} ({Email})", user.Id, SanitizeForLogging(user.Email));

        var response = await GenerateAuthResponse(user);
        return CreatedAtAction(nameof(GetCurrentUser), response);
    }

    /// <summary>
    /// Login with email and password.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
            {
                return Problem(
                    title: "Account locked",
                    detail: "Too many failed login attempts. Please try again later.",
                    statusCode: StatusCodes.Status423Locked
                );
            }
            return Unauthorized(new { message = "Invalid email or password" });
        }

        // Update last login time
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        _logger.LogInformation("User logged in: {UserId}", user.Id);

        var response = await GenerateAuthResponse(user);
        return Ok(response);
    }

    /// <summary>
    /// Refresh an access token using a refresh token.
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);

        if (user == null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }

        _logger.LogInformation("Token refreshed for user: {UserId}", user.Id);

        var response = await GenerateAuthResponse(user);
        return Ok(response);
    }

    /// <summary>
    /// Logout and invalidate refresh token.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId != null && Guid.TryParse(userId, out var id))
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user != null)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiresAt = null;
                await _userManager.UpdateAsync(user);
                _logger.LogInformation("User logged out: {UserId}", id);
            }
        }

        return NoContent();
    }

    /// <summary>
    /// Get the current authenticated user's profile.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(UserDto.FromUser(user));
    }

    /// <summary>
    /// Update the current user's profile.
    /// </summary>
    [HttpPatch("me")]
    [Authorize]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return Unauthorized();
        }

        if (request.DisplayName != null) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;
        if (request.SpoilerMode.HasValue) user.SpoilerMode = request.SpoilerMode.Value;

        await _userManager.UpdateAsync(user);

        _logger.LogInformation("Profile updated for user: {UserId}", id);

        return Ok(UserDto.FromUser(user));
    }

    /// <summary>
    /// Change the current user's password.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return Unauthorized();
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return ValidationProblem();
        }

        _logger.LogInformation("Password changed for user: {UserId}", id);

        return NoContent();
    }

    /// <summary>
    /// Example endpoint requiring PaddockPass membership.
    /// </summary>
    [HttpGet("paddock-test")]
    [PaddockPass]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult PaddockPassTest()
    {
        return Ok(new { message = "Welcome to the Paddock! You have premium access." });
    }

    private async Task<AuthResponse> GenerateAuthResponse(ApplicationUser user)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var expiresAt = _tokenService.GetAccessTokenExpiration();

        // Store refresh token
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiration();
        await _userManager.UpdateAsync(user);

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            User = UserDto.FromUser(user)
        };
    }
}
