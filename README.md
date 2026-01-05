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
make help       # Show all commands
make up         # Start PostgreSQL, Redis, Elasticsearch
make down       # Stop Docker services
make api        # Run .NET API with hot reload
make web        # Run React frontend with hot reload
make python     # Run Python healthcheck
make db-migrate # Apply database migrations
```

## Project Structure

```
parcferme/
├── src/
│   ├── api/           # ASP.NET Core 10 backend
│   │   ├── Controllers/
│   │   ├── Data/      # EF Core DbContext
│   │   ├── Models/    # Domain entities
│   │   └── Program.cs
│   ├── web/           # React 18 + TypeScript frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── store/ # Redux Toolkit
│   │   └── package.json
│   └── python/        # Data ingestion scripts
│       └── ingestion/
│           └── clients/  # OpenF1 API client
├── docs/
│   └── BLUEPRINT.md   # Full product specification
├── docker-compose.yml # Local dev services
├── Makefile           # Dev commands
└── .env.example       # Environment template
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
| Frontend | React 18, TypeScript, Redux Toolkit, Tailwind CSS |
| Data Pipeline | Python, FastF1, OpenF1 API |

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

## License

MIT
