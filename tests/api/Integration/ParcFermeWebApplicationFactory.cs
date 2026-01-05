using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ParcFerme.Api.Data;

namespace ParcFerme.Api.Tests.Integration;

/// <summary>
/// Custom WebApplicationFactory for integration tests.
/// Replaces external dependencies (PostgreSQL, Redis, Elasticsearch) with in-memory/mock versions.
/// </summary>
public class ParcFermeWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"ParcFerme_Test_{Guid.NewGuid()}";
    
    // Test JWT configuration values
    private const string TestJwtSecret = "SuperSecretKeyForTestingPurposesMustBe32CharsOrMore!";
    private const string TestJwtIssuer = "ParcFerme.Tests";
    private const string TestJwtAudience = "ParcFerme.TestClients";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Add test configuration
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret,
                ["Jwt:Issuer"] = TestJwtIssuer,
                ["Jwt:Audience"] = TestJwtAudience,
                ["Jwt:AccessTokenExpirationMinutes"] = "15",
                ["Jwt:RefreshTokenExpirationDays"] = "7",
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;",
                ["ConnectionStrings:Redis"] = "localhost:6379",
                ["ConnectionStrings:Elasticsearch"] = "http://localhost:9200",
                ["FrontendUrl"] = "http://localhost:3000",
            });
        });
        
        builder.ConfigureTestServices(services =>
        {
            // Add in-memory database for testing with unique database name per factory
            // (Note: DbContext is NOT registered in Program.cs when ASPNETCORE_ENVIRONMENT=Testing)
            services.AddDbContext<ParcFermeDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });
            
            // Remove Redis caching and use in-memory cache
            services.RemoveAll<Microsoft.Extensions.Caching.Distributed.IDistributedCache>();
            services.AddDistributedMemoryCache();
            
            // Reconfigure JWT Bearer authentication to use test settings
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = TestJwtIssuer,
                    ValidAudience = TestJwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret))
                };
            });
        });
    }
    
    /// <summary>
    /// Creates a new scope and returns the database context.
    /// Useful for seeding test data or verifying database state.
    /// </summary>
    public ParcFermeDbContext CreateDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
    }
    
    /// <summary>
    /// Ensures the database is created and any pending migrations are applied.
    /// </summary>
    public async Task InitializeDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ParcFermeDbContext>();
        await db.Database.EnsureCreatedAsync();
    }
}
