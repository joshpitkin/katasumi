# Development Setup Guide

This guide covers setting up a complete local development environment for Katasumi, including both the TUI and Web applications.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Manual PostgreSQL Setup](#manual-postgresql-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Development Servers](#running-the-development-servers)
- [Troubleshooting](#troubleshooting)

## Overview

Katasumi uses **two different database systems** optimized for each application:

- **TUI**: SQLite for portability and offline usage
  - Bundled database at `packages/core/data/shortcuts.db`
  - User data at `~/.katasumi/user-data.db`
  
- **Web**: PostgreSQL for multi-user support and scalability
  - Shared database for all users
  - Supports user accounts and custom shortcuts

## Prerequisites

- **Node.js 18+** and npm (or pnpm)
- **Docker** and **Docker Compose** (recommended for easiest setup)
- **OR** PostgreSQL 14+ (if not using Docker)
- Git

## Quick Start with Docker

The fastest way to get started is using Docker Compose to run PostgreSQL:

### 1. Clone and Install

```bash
git clone https://github.com/joshpitkin/katasumi.git
cd katasumi
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432` with:
- Database: `katasumi_dev`
- Username: `katasumi`
- Password: `dev_password`

### 3. Copy Environment Files

```bash
# Core package (for SQLite/TUI)
cp packages/core/.env.example packages/core/.env

# Web package (already configured for Docker PostgreSQL)
cp packages/web/.env.example packages/web/.env.local
```

The default configuration in `.env.local` is already set up for the Docker PostgreSQL instance.

### 4. Run Setup

```bash
npm run setup
```

This command:
- Builds all TypeScript packages
- Runs database migrations for SQLite (TUI)
- Seeds the SQLite database with 770+ shortcuts
- Creates the bundled `shortcuts.db` for TUI

### 5. Seed PostgreSQL (Web)

```bash
# Migrate PostgreSQL schema
cd packages/core
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" npm run migrate

# Seed PostgreSQL with shortcuts data
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev" npm run seed

cd ../..
```

### 6. Start Development Servers

```bash
npm run dev
```

This starts:
- **TUI**: Watches for changes and recompiles
- **Web**: Next.js dev server at http://localhost:3000

### 7. Test the Applications

**Test TUI:**
```bash
npm run start:tui
```

**Test Web:**
Open http://localhost:3000 in your browser

## Manual PostgreSQL Setup

If you prefer not to use Docker, you can install PostgreSQL directly:

### Ubuntu/Debian

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE katasumi_dev;
CREATE USER katasumi WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE katasumi_dev TO katasumi;
\q
```

### macOS

```bash
# Install PostgreSQL with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb katasumi_dev
```

### Windows

1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, remember your postgres password
3. Use pgAdmin or psql to create the database:

```sql
CREATE DATABASE katasumi_dev;
```

Then follow steps 3-7 from the Quick Start guide above.

## Environment Configuration

### Core Package (packages/core/.env)

Used for seeding and building the SQLite database for TUI:

```bash
# SQLite database for TUI
DATABASE_URL="file:./data/katasumi.db"
DB_TYPE="sqlite"

# Optional: AI API keys
OPENAI_API_KEY="your-key-here"
ANTHROPIC_API_KEY="your-key-here"
```

### Web Package (packages/web/.env.local)

Used by Next.js web application:

```bash
# PostgreSQL connection
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev"
NODE_ENV="development"

# Optional: AI API keys
OPENAI_API_KEY="your-key-here"
ANTHROPIC_API_KEY="your-key-here"

# Optional: NextAuth (for production)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-secret"
```

### TUI Package

The TUI doesn't require any environment configuration. It uses the bundled database by default.

## Database Setup

### SQLite (TUI)

The SQLite database is automatically created when you run:

```bash
npm run setup
```

This creates:
- `packages/core/data/katasumi.db` - Source database with all shortcuts
- `packages/core/data/shortcuts.db` - Bundled read-only database for TUI
- `~/.katasumi/user-data.db` - User's personal shortcuts (created on first run)

### PostgreSQL (Web)

After starting PostgreSQL (Docker or manual), set it up:

```bash
cd packages/core

# Run migrations
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" npm run migrate

# Seed with shortcuts data
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev" npm run seed

cd ../..
```

## Running the Development Servers

### All Services (Recommended)

```bash
npm run dev
```

Runs both TUI and Web in parallel using Turborepo.

### Individual Services

**TUI Only:**
```bash
npm run dev --workspace=@katasumi/tui
```

**Web Only:**
```bash
npm run dev --workspace=@katasumi/web
# Then visit http://localhost:3000
```

## Testing

### Run All Tests

```bash
npm test
```

### Test Individual Packages

```bash
# Core package tests
npm test --workspace=@katasumi/core

# TUI tests
npm test --workspace=@katasumi/tui

# Web tests
npm test --workspace=@katasumi/web
```

## Database Management

### Check Migration Status

```bash
npm run migrate:status
```

### Rollback Last Migration

```bash
npm run migrate:rollback
```

### Re-seed Database

```bash
# SQLite (TUI)
npm run seed --workspace=@katasumi/core

# PostgreSQL (Web)
cd packages/core
DATABASE_URL="postgresql://katasumi:dev_password@localhost:5432/katasumi_dev" npm run seed
cd ../..
```

### Rebuild TUI Database

```bash
npm run build-db --workspace=@katasumi/core
```

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "Connection refused"**
- Ensure PostgreSQL is running: `docker-compose ps` or `sudo systemctl status postgresql`
- Check the port: `ss -tlnp | grep 5432`

**Error: "password authentication failed"**
- Verify credentials in `.env.local` match your PostgreSQL setup
- For Docker: use `katasumi` / `dev_password`

### Port Already in Use

**Port 5432 (PostgreSQL):**
```bash
# Check what's using the port
sudo lsof -i :5432

# Stop Docker container if needed
docker-compose down
```

**Port 3000 (Next.js):**
```bash
# Kill process on port 3000
kill -9 $(lsof -t -i:3000)
```

### TUI Database Not Found

```bash
# Rebuild the database
npm run build-db --workspace=@katasumi/core
```

### Prisma Client Generation Issues

```bash
# Regenerate Prisma clients
npm run build
```

### "No shortcuts found" in TUI

1. Check database exists: `ls -la packages/core/data/shortcuts.db`
2. Re-seed: `npm run seed --workspace=@katasumi/core`
3. Rebuild: `npm run build-db --workspace=@katasumi/core`

### Docker Compose Issues

```bash
# View logs
docker-compose logs postgres

# Restart containers
docker-compose restart

# Full reset (WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

## Production Deployment

### TUI

The TUI is distributed as a standalone npm package with the database bundled:

```bash
npm run build
# Database is bundled at packages/core/data/shortcuts.db
```

### Web

Deploy to Vercel, Netlify, or any Node.js hosting:

1. Set production environment variables
2. Use a hosted PostgreSQL (Supabase, Vercel Postgres, etc.)
3. Run migrations on production database
4. Deploy Next.js application

See [README.md](./README.md) for more details on production deployment.

## Additional Resources

- [README.md](./README.md) - Project overview and quick start
- [TODO.md](./TODO.md) - Development roadmap
- [Architecture Documentation](./docs/) - API documentation
- [Contributing Guide](./CONTRIBUTING.md) - Contribution guidelines

## Getting Help

- **Issues**: https://github.com/joshpitkin/katasumi/issues
- **Discussions**: https://github.com/joshpitkin/katasumi/discussions

---

Happy coding! 🚀
