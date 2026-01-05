# =========================
# Parc Fermé - Development Makefile
# =========================

.PHONY: help setup up down api web python db-migrate db-reset logs clean

# Default target
help:
	@echo "Parc Fermé Development Commands"
	@echo "================================"
	@echo ""
	@echo "Setup:"
	@echo "  make setup        - First-time setup (install deps, start services)"
	@echo ""
	@echo "Services:"
	@echo "  make up           - Start all Docker services (DB, Redis, Elasticsearch)"
	@echo "  make down         - Stop all Docker services"
	@echo "  make logs         - Tail Docker service logs"
	@echo ""
	@echo "Development:"
	@echo "  make api          - Run the .NET API (hot reload)"
	@echo "  make web          - Run the React frontend (hot reload)"
	@echo "  make python       - Run Python ingestion healthcheck"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Apply EF Core migrations"
	@echo "  make db-reset     - Reset database (WARNING: destroys data)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Remove build artifacts and node_modules"

# =========================
# Setup
# =========================

setup: up
	@echo "📦 Installing frontend dependencies..."
	cd src/web && npm install
	@echo "🐍 Setting up Python environment..."
	cd src/python && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
	@echo "🔧 Restoring .NET packages..."
	cd src/api && dotnet restore
	@echo ""
	@echo "✅ Setup complete! Run 'make api' and 'make web' in separate terminals."

# =========================
# Docker Services
# =========================

up:
	@echo "🐳 Starting Docker services..."
	docker compose up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 5
	@docker compose ps

down:
	@echo "🐳 Stopping Docker services..."
	docker compose down

logs:
	docker compose logs -f

# =========================
# Development Servers
# =========================

api:
	@echo "🚀 Starting .NET API on http://localhost:5000"
	cd src/api && dotnet watch run

web:
	@echo "🚀 Starting React frontend on http://localhost:3000"
	cd src/web && npm run dev

python:
	@echo "🐍 Running Python healthcheck..."
	cd src/python && .venv/bin/python -m ingestion.healthcheck

# =========================
# Database
# =========================

db-migrate:
	@echo "📦 Applying database migrations..."
	cd src/api && dotnet ef database update

db-reset:
	@echo "⚠️  Resetting database (this will destroy all data)..."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker compose down -v
	docker compose up -d postgres
	@sleep 3
	cd src/api && dotnet ef database update
	@echo "✅ Database reset complete"

# =========================
# Cleanup
# =========================

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf src/api/bin src/api/obj
	rm -rf src/web/node_modules src/web/dist
	rm -rf src/python/.venv src/python/__pycache__
	@echo "✅ Clean complete"
