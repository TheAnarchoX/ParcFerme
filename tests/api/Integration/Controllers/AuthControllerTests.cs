using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ParcFerme.Api.Auth;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for AuthController endpoints.
/// Tests the full HTTP request/response cycle with in-memory database.
/// </summary>
public class AuthControllerTests : IClassFixture<ParcFermeWebApplicationFactory>, IAsyncLifetime
{
    private readonly ParcFermeWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests(ParcFermeWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.InitializeDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region Helper Methods

    private static RegisterRequest CreateValidRegisterRequest(string? email = null) => new()
    {
        Email = email ?? $"test_{Guid.NewGuid():N}@parcferme.com",
        Password = "TestP@ssw0rd!",
        DisplayName = "Test Driver"
    };

    private async Task<AuthResponse> RegisterAndGetTokensAsync(string? email = null)
    {
        var request = CreateValidRegisterRequest(email);
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);
        response.EnsureSuccessStatusCode();
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(TestHelpers.JsonOptions);
        return authResponse!;
    }

    private void SetAuthorizationHeader(string accessToken)
    {
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", accessToken);
    }

    #endregion

    #region Register Tests

    [Fact]
    public async Task Register_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = CreateValidRegisterRequest();

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Register_WithValidRequest_ReturnsAuthResponse()
    {
        // Arrange
        var request = CreateValidRegisterRequest();

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(TestHelpers.JsonOptions);

        // Assert
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.RefreshToken.Should().NotBeNullOrWhiteSpace();
        authResponse.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
        authResponse.User.Should().NotBeNull();
        authResponse.User.Email.Should().Be(request.Email);
        authResponse.User.DisplayName.Should().Be(request.DisplayName);
    }

    [Fact]
    public async Task Register_WithNewUser_SetsCorrectDefaults()
    {
        // Arrange
        var request = CreateValidRegisterRequest();

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(TestHelpers.JsonOptions);

        // Assert
        authResponse!.User.SpoilerMode.Should().Be(SpoilerMode.Strict, "Default should be Strict for spoiler protection");
        authResponse.User.MembershipTier.Should().Be(MembershipTier.Free, "New users should be Free tier");
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        // Arrange
        var email = $"duplicate_{Guid.NewGuid():N}@parcferme.com";
        await RegisterAndGetTokensAsync(email);
        var duplicateRequest = CreateValidRegisterRequest(email);

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", duplicateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "not-an-email",
            Password = "TestP@ssw0rd!",
            DisplayName = "Test Driver"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = $"test_{Guid.NewGuid():N}@parcferme.com",
            Password = "weak", // Too short, no uppercase, no digit
            DisplayName = "Test Driver"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithShortDisplayName_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = $"test_{Guid.NewGuid():N}@parcferme.com",
            Password = "TestP@ssw0rd!",
            DisplayName = "X" // Too short (min 2)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOk()
    {
        // Arrange
        var email = $"login_{Guid.NewGuid():N}@parcferme.com";
        var password = "TestP@ssw0rd!";
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = password,
            DisplayName = "Login Test"
        };
        await _client.PostAsJsonAsync("/api/v1/auth/register", registerRequest);

        var loginRequest = new LoginRequest { Email = email, Password = password };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var email = $"login_{Guid.NewGuid():N}@parcferme.com";
        var password = "TestP@ssw0rd!";
        await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password,
            DisplayName = "Login Test"
        });

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", 
            new LoginRequest { Email = email, Password = password });
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(TestHelpers.JsonOptions);

        // Assert
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.RefreshToken.Should().NotBeNullOrWhiteSpace();
        authResponse.User.Email.Should().Be(email);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        // Arrange
        var email = $"login_{Guid.NewGuid():N}@parcferme.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "TestP@ssw0rd!",
            DisplayName = "Login Test"
        });

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "WrongP@ssw0rd!" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_ReturnsUnauthorized()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "nonexistent@parcferme.com",
            Password = "TestP@ssw0rd!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Refresh Token Tests

    [Fact]
    public async Task RefreshToken_WithValidToken_ReturnsNewTokens()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        var refreshRequest = new RefreshTokenRequest { RefreshToken = authResponse.RefreshToken };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newAuthResponse = await response.Content.ReadFromJsonAsync<AuthResponse>(TestHelpers.JsonOptions);
        newAuthResponse.Should().NotBeNull();
        newAuthResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        newAuthResponse.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task RefreshToken_WithInvalidToken_ReturnsUnauthorized()
    {
        // Arrange
        var refreshRequest = new RefreshTokenRequest { RefreshToken = "invalid-refresh-token" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Logout Tests

    [Fact]
    public async Task Logout_WhenAuthenticated_ReturnsNoContent()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        SetAuthorizationHeader(authResponse.AccessToken);

        // Act
        var response = await _client.PostAsync("/api/v1/auth/logout", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Logout_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - Don't set authorization header
        _client.DefaultRequestHeaders.Authorization = null;

        // Act
        var response = await _client.PostAsync("/api/v1/auth/logout", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_InvalidatesRefreshToken()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        SetAuthorizationHeader(authResponse.AccessToken);
        
        // Act - Logout
        await _client.PostAsync("/api/v1/auth/logout", null);
        
        // Try to use the old refresh token
        _client.DefaultRequestHeaders.Authorization = null;
        var refreshRequest = new RefreshTokenRequest { RefreshToken = authResponse.RefreshToken };
        var refreshResponse = await _client.PostAsJsonAsync("/api/v1/auth/refresh", refreshRequest);

        // Assert - Refresh should fail because token was invalidated
        refreshResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GetCurrentUser (GET /me) Tests

    [Fact]
    public async Task GetMe_WhenAuthenticated_ReturnsUserProfile()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        SetAuthorizationHeader(authResponse.AccessToken);

        // Act
        var response = await _client.GetAsync("/api/v1/auth/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.Content.ReadFromJsonAsync<UserDto>(TestHelpers.JsonOptions);
        user.Should().NotBeNull();
        user!.Id.Should().Be(authResponse.User.Id);
        user.Email.Should().Be(authResponse.User.Email);
    }

    [Fact]
    public async Task GetMe_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        _client.DefaultRequestHeaders.Authorization = null;

        // Act
        var response = await _client.GetAsync("/api/v1/auth/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_WithInvalidToken_ReturnsUnauthorized()
    {
        // Arrange
        SetAuthorizationHeader("invalid.jwt.token");

        // Act
        var response = await _client.GetAsync("/api/v1/auth/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region UpdateProfile (PATCH /me) Tests

    [Fact]
    public async Task UpdateProfile_WithValidRequest_ReturnsUpdatedUser()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        SetAuthorizationHeader(authResponse.AccessToken);
        var updateRequest = new UpdateProfileRequest
        {
            DisplayName = "Updated Name",
            Bio = "Racing enthusiast"
        };

        // Act
        var response = await _client.PatchAsJsonAsync("/api/v1/auth/me", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedUser = await response.Content.ReadFromJsonAsync<UserDto>(TestHelpers.JsonOptions);
        updatedUser.Should().NotBeNull();
        updatedUser!.DisplayName.Should().Be("Updated Name");
        updatedUser.Bio.Should().Be("Racing enthusiast");
    }

    [Fact]
    public async Task UpdateProfile_SpoilerMode_UpdatesSuccessfully()
    {
        // Arrange
        var authResponse = await RegisterAndGetTokensAsync();
        SetAuthorizationHeader(authResponse.AccessToken);
        var updateRequest = new UpdateProfileRequest
        {
            SpoilerMode = SpoilerMode.None // Change from default Strict
        };

        // Act
        var response = await _client.PatchAsJsonAsync("/api/v1/auth/me", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedUser = await response.Content.ReadFromJsonAsync<UserDto>(TestHelpers.JsonOptions);
        updatedUser!.SpoilerMode.Should().Be(SpoilerMode.None);
    }

    [Fact]
    public async Task UpdateProfile_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        _client.DefaultRequestHeaders.Authorization = null;
        var updateRequest = new UpdateProfileRequest { DisplayName = "New Name" };

        // Act
        var response = await _client.PatchAsJsonAsync("/api/v1/auth/me", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion
}
