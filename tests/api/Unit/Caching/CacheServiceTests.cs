using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ParcFerme.Api.Caching;

namespace ParcFerme.Api.Tests.Unit.Caching;

/// <summary>
/// Unit tests for RedisCacheService.
/// Tests cache operations with mocked IDistributedCache.
/// </summary>
public class CacheServiceTests
{
    private readonly IDistributedCache _mockCache;
    private readonly ILogger<RedisCacheService> _mockLogger;
    private readonly RedisCacheService _sut;

    public CacheServiceTests()
    {
        _mockCache = Substitute.For<IDistributedCache>();
        _mockLogger = Substitute.For<ILogger<RedisCacheService>>();
        _sut = new RedisCacheService(_mockCache, _mockLogger);
    }

    private record TestData(int Id, string Name, DateTime CreatedAt);

    #region GetAsync Tests

    [Fact]
    public async Task GetAsync_WhenKeyExists_ReturnsDeserializedValue()
    {
        // Arrange
        var key = "test:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);
        var bytes = JsonSerializer.SerializeToUtf8Bytes(data, new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>()).Returns(bytes);

        // Act
        var result = await _sut.GetAsync<TestData>(key);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(data.Id);
        result.Name.Should().Be(data.Name);
    }

    [Fact]
    public async Task GetAsync_WhenKeyDoesNotExist_ReturnsNull()
    {
        // Arrange
        var key = "missing:key";
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>()).Returns((byte[]?)null);

        // Act
        var result = await _sut.GetAsync<TestData>(key);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_WhenCacheThrows_ReturnsNullAndLogs()
    {
        // Arrange
        var key = "error:key";
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>())
            .ThrowsAsync(new Exception("Redis connection failed"));

        // Act
        var result = await _sut.GetAsync<TestData>(key);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_WithCancellationToken_PassesItToCache()
    {
        // Arrange
        var key = "test:key";
        var cts = new CancellationTokenSource();

        // Act
        await _sut.GetAsync<TestData>(key, cts.Token);

        // Assert
        await _mockCache.Received(1).GetAsync(key, cts.Token);
    }

    #endregion

    #region SetAsync Tests

    [Fact]
    public async Task SetAsync_WithValue_SerializesAndStoresInCache()
    {
        // Arrange
        var key = "test:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);

        // Act
        await _sut.SetAsync(key, data);

        // Assert
        await _mockCache.Received(1).SetAsync(
            key,
            Arg.Any<byte[]>(),
            Arg.Any<DistributedCacheEntryOptions>(),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task SetAsync_WithDefaultOptions_Uses5MinuteExpiration()
    {
        // Arrange
        var key = "test:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);
        DistributedCacheEntryOptions? capturedOptions = null;
        _mockCache.SetAsync(key, Arg.Any<byte[]>(), Arg.Do<DistributedCacheEntryOptions>(o => capturedOptions = o), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        // Act
        await _sut.SetAsync(key, data);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task SetAsync_WithCustomAbsoluteExpiration_UsesProvidedValue()
    {
        // Arrange
        var key = "test:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);
        var options = new CacheOptions { AbsoluteExpiration = TimeSpan.FromHours(1) };
        DistributedCacheEntryOptions? capturedOptions = null;
        _mockCache.SetAsync(key, Arg.Any<byte[]>(), Arg.Do<DistributedCacheEntryOptions>(o => capturedOptions = o), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        // Act
        await _sut.SetAsync(key, data, options);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(TimeSpan.FromHours(1));
    }

    [Fact]
    public async Task SetAsync_WithSlidingExpiration_UsesProvidedValue()
    {
        // Arrange
        var key = "test:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);
        var options = new CacheOptions { SlidingExpiration = TimeSpan.FromMinutes(10) };
        DistributedCacheEntryOptions? capturedOptions = null;
        _mockCache.SetAsync(key, Arg.Any<byte[]>(), Arg.Do<DistributedCacheEntryOptions>(o => capturedOptions = o), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        // Act
        await _sut.SetAsync(key, data, options);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.SlidingExpiration.Should().Be(TimeSpan.FromMinutes(10));
    }

    [Fact]
    public async Task SetAsync_WhenCacheThrows_DoesNotRethrowAndLogs()
    {
        // Arrange
        var key = "error:key";
        var data = new TestData(1, "Test", DateTime.UtcNow);
        _mockCache.SetAsync(key, Arg.Any<byte[]>(), Arg.Any<DistributedCacheEntryOptions>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new Exception("Redis connection failed"));

        // Act
        var act = () => _sut.SetAsync(key, data);

        // Assert
        await act.Should().NotThrowAsync();
    }

    #endregion

    #region GetOrCreateAsync Tests

    [Fact]
    public async Task GetOrCreateAsync_WhenKeyExists_ReturnsCachedValue()
    {
        // Arrange
        var key = "test:key";
        var cachedData = new TestData(1, "Cached", DateTime.UtcNow);
        var bytes = JsonSerializer.SerializeToUtf8Bytes(cachedData, new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>()).Returns(bytes);
        var factoryCalled = false;

        // Act
        var result = await _sut.GetOrCreateAsync(key, () =>
        {
            factoryCalled = true;
            return Task.FromResult(new TestData(2, "Fresh", DateTime.UtcNow));
        });

        // Assert
        result.Id.Should().Be(1);
        result.Name.Should().Be("Cached");
        factoryCalled.Should().BeFalse("Factory should not be called when cache hit");
    }

    [Fact]
    public async Task GetOrCreateAsync_WhenKeyDoesNotExist_CallsFactoryAndCaches()
    {
        // Arrange
        var key = "missing:key";
        var freshData = new TestData(2, "Fresh", DateTime.UtcNow);
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>()).Returns((byte[]?)null);
        var factoryCalled = false;

        // Act
        var result = await _sut.GetOrCreateAsync(key, () =>
        {
            factoryCalled = true;
            return Task.FromResult(freshData);
        });

        // Assert
        result.Should().Be(freshData);
        factoryCalled.Should().BeTrue();
        await _mockCache.Received(1).SetAsync(
            key,
            Arg.Any<byte[]>(),
            Arg.Any<DistributedCacheEntryOptions>(),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task GetOrCreateAsync_UsesProvidedCacheOptions()
    {
        // Arrange
        var key = "missing:key";
        var options = CacheOptions.Long;
        _mockCache.GetAsync(key, Arg.Any<CancellationToken>()).Returns((byte[]?)null);
        DistributedCacheEntryOptions? capturedOptions = null;
        _mockCache.SetAsync(key, Arg.Any<byte[]>(), Arg.Do<DistributedCacheEntryOptions>(o => capturedOptions = o), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        // Act
        await _sut.GetOrCreateAsync(key, () => Task.FromResult(new TestData(1, "Test", DateTime.UtcNow)), options);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(TimeSpan.FromHours(1));
    }

    #endregion

    #region RemoveAsync Tests

    [Fact]
    public async Task RemoveAsync_CallsCacheRemove()
    {
        // Arrange
        var key = "test:key";

        // Act
        await _sut.RemoveAsync(key);

        // Assert
        await _mockCache.Received(1).RemoveAsync(key, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RemoveAsync_WhenCacheThrows_DoesNotRethrowAndLogs()
    {
        // Arrange
        var key = "error:key";
        _mockCache.RemoveAsync(key, Arg.Any<CancellationToken>())
            .ThrowsAsync(new Exception("Redis connection failed"));

        // Act
        var act = () => _sut.RemoveAsync(key);

        // Assert
        await act.Should().NotThrowAsync();
    }

    #endregion

    #region CacheOptions Tests

    [Fact]
    public void CacheOptions_Default_Has5MinuteExpiration()
    {
        var options = CacheOptions.Default;
        options.AbsoluteExpiration.Should().Be(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public void CacheOptions_Short_Has1MinuteExpiration()
    {
        var options = CacheOptions.Short;
        options.AbsoluteExpiration.Should().Be(TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void CacheOptions_Medium_Has15MinuteExpiration()
    {
        var options = CacheOptions.Medium;
        options.AbsoluteExpiration.Should().Be(TimeSpan.FromMinutes(15));
    }

    [Fact]
    public void CacheOptions_Long_Has1HourExpiration()
    {
        var options = CacheOptions.Long;
        options.AbsoluteExpiration.Should().Be(TimeSpan.FromHours(1));
    }

    [Fact]
    public void CacheOptions_Extended_Has24HourExpiration()
    {
        var options = CacheOptions.Extended;
        options.AbsoluteExpiration.Should().Be(TimeSpan.FromHours(24));
    }

    #endregion
}
