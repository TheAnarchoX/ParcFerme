using ParcFerme.Api.Auth;
using ParcFerme.Api.Authorization;
using ParcFerme.Api.Caching;
using ParcFerme.Api.Data;
using ParcFerme.Api.Models;
using ParcFerme.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =========================
// Database Configuration
// =========================
if (builder.Environment.IsEnvironment("Testing"))
{
    // In-memory database for integration tests - registration deferred to test host
    // Tests will call AddDbContext with InMemory provider
}
else
{
    builder.Services.AddDbContext<ParcFermeDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions => npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public")
        ));
}

// =========================
// Identity Configuration
// =========================
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 8;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ParcFermeDbContext>()
.AddDefaultTokenProviders();

// =========================
// Authentication (JWT + OAuth)
// =========================
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// Add Google OAuth only if configured
var googleClientId = builder.Configuration["OAuth:Google:ClientId"];
var googleClientSecret = builder.Configuration["OAuth:Google:ClientSecret"];
if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret))
{
    authBuilder.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
    });
}
// TODO: Add Discord OAuth when ready

// =========================
// Authorization (Membership Tiers)
// =========================
builder.Services.AddParcFermeAuthorization();

// =========================
// Auth Services (JWT Token Generation)
// =========================
builder.Services.AddParcFermeAuth(builder.Configuration);

// =========================
// Caching (Redis + Response)
// =========================
builder.Services.AddParcFermeCaching(builder.Configuration);

// =========================
// Application Services
// =========================
builder.Services.AddScoped<ISpoilerShieldService, SpoilerShieldService>();

// =========================
// HTTP Client Factory (for external API health checks)
// =========================
builder.Services.AddHttpClient();

// =========================
// API Configuration
// =========================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Parc Fermé API",
        Version = "v1",
        Description = """
            The social cataloging platform for motorsport. 
            
            **Spoiler Shield**: All race result endpoints respect user's spoiler preferences. 
            Results are hidden by default until the user has logged the session.
            
            **Authentication**: Use JWT Bearer tokens for authenticated endpoints. 
            Get tokens via `/api/v1/auth/login`.
            """,
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Parc Fermé",
            Url = new Uri("https://github.com/theanarchox/parcferme")
        },
        License = new Microsoft.OpenApi.Models.OpenApiLicense
        {
            Name = "MIT",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });

    // JWT Bearer authentication
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token. Get one from `/api/v1/auth/login`."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Include XML documentation
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(builder.Configuration["FrontendUrl"] ?? "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// =========================
// Health Checks
// =========================
if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHealthChecks();
}
else
{
    builder.Services.AddHealthChecks()
        .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
        .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
        .AddElasticsearch(builder.Configuration.GetConnectionString("Elasticsearch")!);
}

var app = builder.Build();

// =========================
// Middleware Pipeline
// =========================
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Parc Fermé API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseCors("Frontend");
app.UseResponseCaching();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Marker class for WebApplicationFactory
public partial class Program { }
