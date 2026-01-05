using Microsoft.Extensions.Options;
using ParcFerme.Api.Auth;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Unit.Auth;

/// <summary>
/// Unit tests for JwtTokenService.
/// Tests token generation, validation, and expiration logic.
/// </summary>
public class JwtTokenServiceTests
{
    private readonly JwtOptions _options = new()
    {
        Secret = "SuperSecretKeyForTestingPurposesMustBe32CharsOrMore!",
        Issuer = "ParcFerme.Tests",
        Audience = "ParcFerme.TestClients",
        AccessTokenExpirationMinutes = 15,
        RefreshTokenExpirationDays = 7
    };

    private readonly JwtTokenService _sut;

    public JwtTokenServiceTests()
    {
        _sut = new JwtTokenService(Options.Create(_options));
    }

    private static ApplicationUser CreateTestUser() => new()
    {
        Id = Guid.NewGuid(),
        Email = "test@parcferme.com",
        UserName = "test@parcferme.com",
        DisplayName = "Test Driver",
        MembershipTier = MembershipTier.Free,
        SpoilerMode = SpoilerMode.Strict
    };

    #region GenerateAccessToken Tests

    [Fact]
    public void GenerateAccessToken_WithValidUser_ReturnsNonEmptyToken()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token = _sut.GenerateAccessToken(user);

        // Assert
        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateAccessToken_TokenContainsThreeParts()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token = _sut.GenerateAccessToken(user);

        // Assert
        token.Split('.').Should().HaveCount(3, "JWT tokens have header.payload.signature format");
    }

    [Fact]
    public void GenerateAccessToken_DifferentUsersGetDifferentTokens()
    {
        // Arrange
        var user1 = CreateTestUser();
        var user2 = CreateTestUser();
        user2.Email = "other@parcferme.com";

        // Act
        var token1 = _sut.GenerateAccessToken(user1);
        var token2 = _sut.GenerateAccessToken(user2);

        // Assert
        token1.Should().NotBe(token2);
    }

    [Fact]
    public void GenerateAccessToken_SameUserGetsDifferentTokens_DueToJti()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token1 = _sut.GenerateAccessToken(user);
        var token2 = _sut.GenerateAccessToken(user);

        // Assert
        token1.Should().NotBe(token2, "Each token should have a unique JTI");
    }

    [Fact]
    public void GenerateAccessToken_WithPaddockPassUser_GeneratesToken()
    {
        // Arrange
        var user = CreateTestUser();
        user.MembershipTier = MembershipTier.PaddockPass;
        user.MembershipExpiresAt = DateTime.UtcNow.AddMonths(1);

        // Act
        var token = _sut.GenerateAccessToken(user);

        // Assert
        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateAccessToken_WithAvatarUrl_GeneratesToken()
    {
        // Arrange
        var user = CreateTestUser();
        user.AvatarUrl = "https://example.com/avatar.jpg";

        // Act
        var token = _sut.GenerateAccessToken(user);

        // Assert
        token.Should().NotBeNullOrWhiteSpace();
    }

    #endregion

    #region GenerateRefreshToken Tests

    [Fact]
    public void GenerateRefreshToken_ReturnsNonEmptyString()
    {
        // Act
        var refreshToken = _sut.GenerateRefreshToken();

        // Assert
        refreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsBase64EncodedString()
    {
        // Act
        var refreshToken = _sut.GenerateRefreshToken();

        // Assert
        var action = () => Convert.FromBase64String(refreshToken);
        action.Should().NotThrow("Refresh token should be valid base64");
    }

    [Fact]
    public void GenerateRefreshToken_GeneratesUniqueTokens()
    {
        // Act
        var tokens = Enumerable.Range(0, 100)
            .Select(_ => _sut.GenerateRefreshToken())
            .ToList();

        // Assert
        tokens.Should().OnlyHaveUniqueItems("Each refresh token should be cryptographically unique");
    }

    [Fact]
    public void GenerateRefreshToken_HasSufficientLength()
    {
        // Act
        var refreshToken = _sut.GenerateRefreshToken();
        var bytes = Convert.FromBase64String(refreshToken);

        // Assert
        bytes.Should().HaveCount(64, "Refresh token should be 64 bytes for security");
    }

    #endregion

    #region ValidateAccessToken Tests

    [Fact]
    public void ValidateAccessToken_WithValidToken_ReturnsSuccess()
    {
        // Arrange
        var user = CreateTestUser();
        var token = _sut.GenerateAccessToken(user);

        // Act
        var result = _sut.ValidateAccessToken(token);

        // Assert
        result.IsValid.Should().BeTrue();
        result.UserId.Should().Be(user.Id);
        result.Error.Should().BeNull();
    }

    [Fact]
    public void ValidateAccessToken_WithInvalidToken_ReturnsFailure()
    {
        // Act
        var result = _sut.ValidateAccessToken("invalid.token.here");

        // Assert
        result.IsValid.Should().BeFalse();
        result.Error.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void ValidateAccessToken_WithTamperedToken_ReturnsFailure()
    {
        // Arrange
        var user = CreateTestUser();
        var token = _sut.GenerateAccessToken(user);
        var parts = token.Split('.');
        parts[1] = "tamperedpayload"; // Tamper with payload
        var tamperedToken = string.Join('.', parts);

        // Act
        var result = _sut.ValidateAccessToken(tamperedToken);

        // Assert
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateAccessToken_WithEmptyToken_ReturnsFailure()
    {
        // Act
        var result = _sut.ValidateAccessToken(string.Empty);

        // Assert
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateAccessToken_WithWrongIssuer_ReturnsFailure()
    {
        // Arrange - Create a token with different options
        var wrongOptions = new JwtOptions
        {
            Secret = _options.Secret,
            Issuer = "WrongIssuer",
            Audience = _options.Audience,
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = 7
        };
        var wrongService = new JwtTokenService(Options.Create(wrongOptions));
        var user = CreateTestUser();
        var token = wrongService.GenerateAccessToken(user);

        // Act
        var result = _sut.ValidateAccessToken(token);

        // Assert
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateAccessToken_WithWrongAudience_ReturnsFailure()
    {
        // Arrange
        var wrongOptions = new JwtOptions
        {
            Secret = _options.Secret,
            Issuer = _options.Issuer,
            Audience = "WrongAudience",
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = 7
        };
        var wrongService = new JwtTokenService(Options.Create(wrongOptions));
        var user = CreateTestUser();
        var token = wrongService.GenerateAccessToken(user);

        // Act
        var result = _sut.ValidateAccessToken(token);

        // Assert
        result.IsValid.Should().BeFalse();
    }

    #endregion

    #region Expiration Tests

    [Fact]
    public void GetAccessTokenExpiration_ReturnsFutureDate()
    {
        // Act
        var expiration = _sut.GetAccessTokenExpiration();

        // Assert
        expiration.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void GetAccessTokenExpiration_ReturnsCorrectOffset()
    {
        // Act
        var expiration = _sut.GetAccessTokenExpiration();

        // Assert
        var expectedMin = DateTime.UtcNow.AddMinutes(_options.AccessTokenExpirationMinutes - 1);
        var expectedMax = DateTime.UtcNow.AddMinutes(_options.AccessTokenExpirationMinutes + 1);
        expiration.Should().BeOnOrAfter(expectedMin).And.BeOnOrBefore(expectedMax);
    }

    [Fact]
    public void GetRefreshTokenExpiration_ReturnsFutureDate()
    {
        // Act
        var expiration = _sut.GetRefreshTokenExpiration();

        // Assert
        expiration.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void GetRefreshTokenExpiration_ReturnsCorrectOffset()
    {
        // Act
        var expiration = _sut.GetRefreshTokenExpiration();

        // Assert
        var expectedMin = DateTime.UtcNow.AddDays(_options.RefreshTokenExpirationDays - 1);
        var expectedMax = DateTime.UtcNow.AddDays(_options.RefreshTokenExpirationDays + 1);
        expiration.Should().BeOnOrAfter(expectedMin).And.BeOnOrBefore(expectedMax);
    }

    [Fact]
    public void GetRefreshTokenExpiration_IsLongerThanAccessToken()
    {
        // Act
        var accessExpiration = _sut.GetAccessTokenExpiration();
        var refreshExpiration = _sut.GetRefreshTokenExpiration();

        // Assert
        refreshExpiration.Should().BeAfter(accessExpiration);
    }

    #endregion
}
