using System.Text.Json;
using System.Text.Json.Serialization;

namespace ParcFerme.Api.Tests.Integration;

/// <summary>
/// Shared test helper utilities.
/// </summary>
public static class TestHelpers
{
    /// <summary>
    /// JsonSerializerOptions configured to match the API's JSON serialization settings.
    /// Includes JsonStringEnumConverter for proper enum serialization/deserialization.
    /// </summary>
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };
}
