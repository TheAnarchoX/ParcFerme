# Parc Fermé 🏁

**The social cataloging platform for motorsport** — a "Letterboxd for racing" where fans can log, rate, and review races they've watched or attended.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)

### Setup

```bash
# Clone and enter the repo
git clone https://github.com/yourusername/parcferme.git
cd parcferme

# Copy environment file
cp .env.example .env

# First-time setup (starts Docker, installs dependencies)
make setup
```

### Development

Run these in separate terminals:

```bash
# Terminal 1: Start Docker services
make up

# Terminal 2: Run the API (http://localhost:5000)
make api

# Terminal 3: Run the frontend (http://localhost:3000)
make web
```

### Available Commands

```bash
make help        # Show all commands
make setup       # First-time setup (install deps, start services)

# Services
make up          # Start all Docker services (DB, Redis, Elasticsearch)
make down        # Stop all Docker services
make logs        # Tail Docker service logs

# Development
make api         # Run .NET API with hot reload (http://localhost:5000)
make web         # Run React frontend with hot reload (http://localhost:3000)
make web-host    # Run frontend with LAN access
make python      # Run Python healthcheck

# Data Sync (OpenF1)
make sync        # Sync F1 data for current year
make sync-all    # Sync all F1 data (2024 + 2025)
make sync-recent # Sync F1 data from the last 7 days
make sync-2024   # Sync full 2024 season
make sync-2025   # Sync full 2025 season

# Database
make db-migrate  # Apply EF Core migrations
make db-reset    # Reset database (WARNING: destroys data)
make db-clean    # Clean racing data tables (preserves users)
make db-audit    # Audit data quality

# Cleanup
make clean       # Remove build artifacts and node_modules
```

## Project Structure

```
parcferme/
├── src/
│   ├── api/               # ASP.NET Core 10 backend
│   │   ├── Controllers/   # API endpoints
│   │   ├── Data/          # EF Core DbContext
│   │   ├── Models/        # Domain entities
│   │   ├── Auth/          # JWT token service
│   │   ├── Authorization/ # Membership gates
│   │   ├── Caching/       # Redis cache service
│   │   └── AGENTS.md      # Backend AI instructions
│   ├── web/               # React 19 + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── store/     # Redux Toolkit
│   │   │   └── types/     # TypeScript definitions
│   │   └── AGENTS.md      # Frontend AI instructions
│   └── python/            # Data ingestion pipeline
│       ├── ingestion/
│       │   └── clients/   # OpenF1 API client
│       └── AGENTS.md      # Python AI instructions
├── tests/
│   └── api/               # Backend tests (xUnit)
├── docs/
│   └── BLUEPRINT.md       # Full product specification
├── docker-compose.yml     # Local dev services
├── Makefile               # Dev commands
├── AGENTS.md              # Root AI instructions
└── ROADMAP.md             # Development roadmap
```

## Key Concepts

### The "Spoiler Shield" 🛡️

All APIs and UIs hide race results by default. Results are only revealed when a user has logged the race as watched. This is configurable per-user with three modes:

- **Strict** (default): Hide all results until logged
- **Moderate**: Show excitement ratings but hide winner/podium
- **None**: Show everything (for users who don't care about spoilers)

### "Watched" vs. "Attended" 📺🎫

Users can rate both:
- **Watched**: The broadcast experience (TV direction, on-track action)
- **Attended**: The venue experience (view quality, atmosphere, facilities)

Attended logs include additional fields like seat location, facilities rating, and seat-view photos to build crowdsourced circuit guides.

### Multi-Series Support 🏎️

Schema designed for F1, MotoGP, IndyCar, and WEC without refactoring.

## Architecture

### Domain Model

```
Series → Season → Round (Weekend) → Session
                      ↓
                  Circuit

User → Log → Review
         ↓
     Experience (venue data if attended)
```

### Data Flow

```
                    ┌──────────────┐
                    │   Frontend   │
                    │  (React 19)  │
                    └──────┬───────┘
                           │ HTTP/REST
                    ┌──────▼───────┐
                    │   API (.NET) │
                    │ Spoiler Shield│
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼───────┐┌──────▼───────┐┌──────▼───────┐
    │  PostgreSQL  ││    Redis     ││ Elasticsearch│
    │   (data)     ││   (cache)    ││   (search)   │
    └──────────────┘└──────────────┘└──────────────┘
                           ▲
                    ┌──────┴───────┐
                    │   Python     │
                    │  Ingestion   │
                    └──────────────┘
                           ▲
                    ┌──────┴───────┐
                    │  OpenF1 API  │
                    └──────────────┘
```

### Key Services

| Service | Purpose |
|---------|---------|
| `SpoilerShieldService` | Masks race results based on user preferences and log history |
| `JwtTokenService` | JWT and refresh token generation/validation |
| `CacheService` | Redis-backed caching with response caching middleware |
| `EntityResolver` | Resolves driver/team/circuit aliases across data sources |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 10, Entity Framework Core |
| Auth | ASP.NET Core Identity + JWT + OAuth2 |
| Database | PostgreSQL |
| Cache | Redis |
| Search | Elasticsearch |
| Frontend | React 18, TypeScript, Redux Toolkit, Tailwind CSS |
| Data Pipeline | Python 3.11+, OpenF1 API |

## API Documentation

The API is documented using Swagger/OpenAPI. When running locally:

- **Swagger UI**: http://localhost:5000/swagger
- **OpenAPI JSON**: http://localhost:5000/swagger/v1/swagger.json

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/series` | List all racing series |
| `GET` | `/api/v1/series/{slug}` | Get series details with seasons |
| `GET` | `/api/v1/sessions/{id}` | Session details (spoiler-aware) |
| `POST` | `/api/v1/sessions/{id}/reveal` | Reveal spoilers (creates log) |
| `POST` | `/api/v1/auth/login` | Authenticate and get JWT tokens |
| `POST` | `/api/v1/auth/register` | Create new account |

## Testing

```bash
# Run all backend tests
cd tests/api && dotnet test

# Run specific test class
dotnet test --filter "FullyQualifiedName~SessionsControllerTests"

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"
```

The test suite includes:
- **Unit tests**: Service and utility tests
- **Integration tests**: Full API endpoint tests with in-memory database

## Documentation

- [BLUEPRINT.md](docs/BLUEPRINT.md) — Full product specification
- [ROADMAP.md](ROADMAP.md) — Development roadmap and task tracking
- [AGENTS.md](AGENTS.md) — AI coding guidelines
- [Bulk Sync Guide](docs/BULK_SYNC.md) — OpenF1 data synchronization guide

## Contributing

1. Check the [ROADMAP.md](ROADMAP.md) for current tasks
2. Follow the [AGENTS.md](AGENTS.md) coding guidelines
3. Ensure all tests pass before submitting PRs
4. Use conventional commits format

## License

MIT
