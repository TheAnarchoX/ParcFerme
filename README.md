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

All APIs and UIs hide race results by default. Results are only revealed when a user has logged the race as watched.

### "Watched" vs. "Attended" 📺🎫

Users can rate both:
- **Watched**: The broadcast experience (TV direction, on-track action)
- **Attended**: The venue experience (view quality, atmosphere, facilities)

### Multi-Series Support 🏎️

Schema designed for F1, MotoGP, IndyCar, and WEC without refactoring.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 10, Entity Framework Core |
| Auth | ASP.NET Core Identity + JWT + OAuth2 |
| Database | PostgreSQL |
| Cache | Redis |
| Search | Elasticsearch |
| Frontend | React 19, TypeScript, Redux Toolkit, Tailwind CSS |
| Data Pipeline | Python 3.11+, OpenF1 API |

## API Endpoints

```
GET  /api/v1/status              # Health check
GET  /api/v1/sessions/{id}       # Session details (spoiler-aware)
GET  /api/v1/circuits/{id}/reviews  # Venue ratings aggregate
POST /api/v1/logs                # Log a race
```

## Documentation

- [BLUEPRINT.md](docs/BLUEPRINT.md) — Full product specification
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — AI coding guidelines
- [.github/copilot-setup-steps.yaml](.github/copilot-setup-steps.yaml) — Copilot environment setup

## License

MIT
