# Parc Fermé - Backend (.NET API) Agent Instructions

## Project Context

This is the ASP.NET Core 10 backend for Parc Fermé, a "Letterboxd for motorsport" platform. The API serves a React frontend and handles authentication, racing data, user logs/reviews, and the critical Spoiler Shield system.

## Tech Stack

- **Runtime**: .NET 10 (ASP.NET Core)
- **ORM**: Entity Framework Core with PostgreSQL
- **Auth**: ASP.NET Core Identity + JWT + OAuth2
- **Cache**: Redis via `CacheService`
- **Testing**: xUnit with integration and unit tests in `/tests/api/`

## Architecture Overview

```
/Controllers     # API endpoints (inherit BaseApiController)
/Models          # EF Core entities (EventModels, SocialModels, ApplicationUser)
/Data            # DbContext configuration
/Auth            # JWT token service, auth DTOs
/Authorization   # Membership requirements, PaddockPass attribute
/Caching         # Redis cache service and attributes
/Migrations      # EF Core migrations
```

## Critical Patterns

### API Versioning
All endpoints use URL path versioning via `BaseApiController`:
```csharp
[Route("api/v1/[controller]")]
public class MyController : BaseApiController
```

### Strict DTO Typing
**Never use `dynamic` or `object` types.** All request/response DTOs must be strongly typed:
```csharp
// ✅ Correct - use records for immutable DTOs
public record SessionDto(Guid Id, string Name, SessionType Type, DateTime StartTimeUtc);

// ❌ Wrong - no dynamic types
public object GetSession() => new { id = 1 };
```

### The Spoiler Shield Protocol
**This is the most critical feature.** All endpoints that return race results must:

1. Check the user's `SpoilerMode` preference (Strict, Moderate, None)
2. Check if the user has logged the session
3. Return masked or full data accordingly

```csharp
// Pattern: Conditional result serialization
if (user.SpoilerMode == SpoilerMode.None || 
    user.Logs.Any(l => l.SessionId == sessionId))
{
    return FullResultDto(result);  // Winner, positions, etc.
}
else
{
    return MaskedResultDto(result); // winner: null, status: "completed"
}
```

### Entity Relationships (Domain Model)
```
Series → Season → Round (Weekend) → Session
                       ↓
                   Circuit

User → Log → Review
          ↓
      Experience (venue data if attended)

Entrant (Driver + Team + Round) → Result (SPOILER DATA)
```

### Authentication
- JWT tokens for API auth
- Refresh tokens stored on `ApplicationUser`
- OAuth2 support (Google, Discord)
- Use `[Authorize]` for protected endpoints
- Use `[PaddockPass]` for premium-only features

### Membership Tiers
```csharp
public enum MembershipTier
{
    Free = 0,
    PaddockPass = 1  // Premium tier
}
```

### Caching
Use `CacheService` for Redis operations:
```csharp
await _cache.SetAsync(CacheKeys.Session(id), sessionDto, TimeSpan.FromMinutes(15));
var cached = await _cache.GetAsync<SessionDto>(CacheKeys.Session(id));
```

## Key Business Rules

1. **Never gate historical data** - All race history is free (unlike competitors)
2. **Excitement Rating (0-10)** is separate from Star Rating (0.5-5.0) - excitement is spoiler-safe
3. **Spoiler toggle on reviews** - Auto-checked if race < 7 days old
4. **Venue ratings aggregate to Circuit Guides** - Crowdsourced seat views

## Database Conventions

- Use `Guid` for all primary keys
- Use `DateTime.UtcNow` for all timestamps
- Use `DateOnly` for date-only fields (DateStart, DateEnd)
- Slugs should be URL-safe lowercase with hyphens
- OpenF1 correlation via `OpenF1SessionKey` and `OpenF1MeetingKey`

## Testing

- Unit tests: `/tests/api/Unit/`
- Integration tests: `/tests/api/Integration/`
- Run with: `dotnet test` from solution root

## Common Commands

```bash
# From src/api/
dotnet watch run          # Hot reload development
dotnet ef migrations add MigrationName  # New migration
dotnet ef database update # Apply migrations
dotnet build              # Build only
dotnet test               # Run tests (from solution root)
```

## File Organization

When adding new features:
- Controllers go in `/Controllers/`
- DTOs go in a `Dtos/` folder within the relevant feature area or `/Models/`
- Services go in `/Services/` (create if needed)
- Keep controllers thin - business logic in services
