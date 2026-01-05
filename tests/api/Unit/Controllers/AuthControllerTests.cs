using ParcFerme.Api.Auth;

namespace ParcFerme.Api.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for AuthController helper methods.
/// Tests security-critical sanitization functions.
/// </summary>
public class AuthControllerTests
{
    #region SanitizeForLogging Tests

    [Fact]
    public void SanitizeForLogging_WithNull_ReturnsEmptyString()
    {
        // Act
        var result = AuthController.SanitizeForLogging(null);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void SanitizeForLogging_WithEmptyString_ReturnsEmptyString()
    {
        // Act
        var result = AuthController.SanitizeForLogging(string.Empty);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void SanitizeForLogging_WithNewlineCharacters_RemovesThem()
    {
        // Arrange
        var input = "user@example.com\nFAKE LOG ENTRY";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE LOG ENTRY");
        result.Should().NotContain("\n");
    }

    [Fact]
    public void SanitizeForLogging_WithCarriageReturnCharacters_RemovesThem()
    {
        // Arrange
        var input = "user@example.com\rFAKE LOG ENTRY";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE LOG ENTRY");
        result.Should().NotContain("\r");
    }

    [Fact]
    public void SanitizeForLogging_WithBothCarriageReturnAndNewline_RemovesBoth()
    {
        // Arrange
        var input = "user@example.com\r\nFAKE LOG ENTRY";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE LOG ENTRY");
        result.Should().NotContain("\r");
        result.Should().NotContain("\n");
    }

    [Fact]
    public void SanitizeForLogging_WithTabCharacters_RemovesThem()
    {
        // Arrange
        var input = "user@example.com\tFAKE\tLOG";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKELOG");
        result.Should().NotContain("\t");
    }

    [Fact]
    public void SanitizeForLogging_WithFormFeedCharacters_RemovesThem()
    {
        // Arrange
        var input = "user@example.com\fFAKE LOG";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE LOG");
        result.Should().NotContain("\f");
    }

    [Fact]
    public void SanitizeForLogging_WithVerticalTabCharacters_RemovesThem()
    {
        // Arrange
        var input = "user@example.com\vFAKE LOG";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE LOG");
        result.Should().NotContain("\v");
    }

    [Fact]
    public void SanitizeForLogging_WithMultipleInjectionAttempts_RemovesAllControlCharacters()
    {
        // Arrange - simulate a sophisticated injection attack
        var input = "admin@site.com\n[2024-01-01] Unauthorized access\r\nFAKE: User deleted\t\t\vMalicious entry";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().NotContain("\n");
        result.Should().NotContain("\r");
        result.Should().NotContain("\t");
        result.Should().NotContain("\v");
        result.Should().Be("admin@site.com[2024-01-01] Unauthorized accessFAKE: User deletedMalicious entry");
    }

    [Fact]
    public void SanitizeForLogging_WithLegitimateEmail_DoesNotModifyIt()
    {
        // Arrange
        var input = "user@example.com";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be(input);
    }

    [Fact]
    public void SanitizeForLogging_WithComplexEmail_PreservesValidCharacters()
    {
        // Arrange
        var input = "user+test@sub-domain.example.com";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be(input);
    }

    [Fact]
    public void SanitizeForLogging_WithNullCharacter_RemovesIt()
    {
        // Arrange
        var input = "user@example.com\0FAKE";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE");
        result.Should().NotContain("\0");
    }

    [Fact]
    public void SanitizeForLogging_WithBellCharacter_RemovesIt()
    {
        // Arrange - Bell character (ASCII 7) could trigger terminal alerts
        var input = "user@example.com\aFAKE";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE");
        result.Should().NotContain("\a");
    }

    [Fact]
    public void SanitizeForLogging_WithEscapeCharacter_RemovesIt()
    {
        // Arrange - Escape character (ASCII 27) used for ANSI escape sequences
        var input = "user@example.com\u001b[31mFAKE\u001b[0m";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.com[31mFAKE[0m");
        result.Should().NotContain("\u001b");
    }

    [Fact]
    public void SanitizeForLogging_WithDeleteCharacter_RemovesIt()
    {
        // Arrange - DEL character (ASCII 127)
        var input = "user@example.com\u007FFAKE";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("user@example.comFAKE");
        result.Should().NotContain("\u007F");
    }

    [Fact]
    public void SanitizeForLogging_WithAllControlCharacters_RemovesThemAll()
    {
        // Arrange - test ASCII control characters 0-31 and 127
        var controlChars = string.Concat(Enumerable.Range(0, 32).Select(i => (char)i)) + (char)127;
        var input = $"safe@email.com{controlChars}end";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be("safe@email.comend");
        foreach (var controlChar in controlChars)
        {
            result.Should().NotContain(controlChar.ToString());
        }
    }

    [Fact]
    public void SanitizeForLogging_WithUnicodeCharacters_PreservesThem()
    {
        // Arrange - Unicode characters should be preserved, only ASCII control chars removed
        var input = "user@例え.com";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be(input);
    }

    [Fact]
    public void SanitizeForLogging_WithEmojiCharacters_PreservesThem()
    {
        // Arrange - Emojis should be preserved
        var input = "user@example.com 🏎️";

        // Act
        var result = AuthController.SanitizeForLogging(input);

        // Assert
        result.Should().Be(input);
    }

    #endregion
}
