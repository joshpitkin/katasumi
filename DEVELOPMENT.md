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

- **Node.js 18+** and **pnpm** (package manager)
- **Docker** and **Docker Compose** (recommended for easiest setup)
- **OR** PostgreSQL 14+ (if not using Docker)
- Git

## Quick Start with Docker

The fastest way to get started is using Docker Compose to run PostgreSQL:

### 1. Clone and Install

```bash
git clone https://github.com/joshpitkin/katasumi.git
cd katasumi
pnpm install
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
pnpm run setup:tui
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
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" pnpm run migrate

# Seed PostgreSQL with shortcuts data
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" pnpm run seed

cd ../..
```

### 6. Start Development Servers

```bash
pnpm run dev
```

This starts:
- **TUI**: Watches for changes and recompiles
- **Web**: Next.js dev server at http://localhost:3000

### 7. Test the Applications

**Test TUI:**
```bash
pnpm run start:tui
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
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev"
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
pnpm run setup:tui
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
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" pnpm run migrate

# Seed with shortcuts data
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" pnpm run seed

cd ../..
```

## Running the Development Servers

### All Services (Recommended)

```bash
pnpm run dev
```

Runs both TUI and Web in parallel using Turborepo.

### Individual Services

**TUI Only:**
```bash
pnpm run dev --workspace=@katasumi/tui
```

**Web Only:**
```bash
pnpm run dev --workspace=@katasumi/web
# Then visit http://localhost:3000
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Test Individual Packages

```bash
# Core package tests
pnpm test --workspace=@katasumi/core

# TUI tests
pnpm test --workspace=@katasumi/tui

# Web tests
pnpm test --workspace=@katasumi/web
```

## Database Management

### Check Migration Status

```bash
pnpm run migrate:status
```

### Rollback Last Migration

```bash
pnpm run migrate:rollback
```

### Re-seed Database

```bash
# SQLite (TUI)
pnpm run seed --workspace=@katasumi/core

# PostgreSQL (Web)
cd packages/core
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" pnpm run seed
cd ../..
```

### Rebuild TUI Database

```bash
pnpm run build-db --workspace=@katasumi/core
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
pnpm run build-db --workspace=@katasumi/core
```

### Prisma Client Generation Issues

```bash
# Regenerate Prisma clients
pnpm run build
```

### "No shortcuts found" in TUI

1. Check database exists: `ls -la packages/core/data/shortcuts.db`
2. Re-seed: `pnpm run seed --workspace=@katasumi/core`
3. Rebuild: `pnpm run build-db --workspace=@katasumi/core`

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
pnpm run build
# Database is bundled at packages/core/data/shortcuts.db
```

### Web

Deploy to Vercel, Netlify, or any Node.js hosting:

1. Set production environment variables
2. Use a hosted PostgreSQL (Supabase, Vercel Postgres, etc.)
3. Run migrations on production database
4. Deploy Next.js application

See [README.md](./README.md) for more details on production deployment.

## Common Hydration Error Patterns and Solutions

React hydration errors occur when the HTML rendered on the server doesn't match what React expects to render on the client. Here are common patterns and how to fix them in the Katasumi codebase:

### 1. Platform Detection (FIXED)

**Problem**: Detecting platform from `window.navigator.userAgent` during initial render causes hydration mismatch.

```typescript
// ❌ BAD - causes hydration error
const useStore = create((set) => ({
  platform: typeof window !== 'undefined' ? detectPlatform() : 'all'
}))
```

**Solution**: Always use SSR-safe default, then update after mount.

```typescript
// ✅ GOOD - SSR-safe
const useStore = create((set) => ({
  platform: 'all'  // Always start with safe default
}))

// In component, detect after hydration:
useEffect(() => {
  if (typeof window !== 'undefined' && platform === 'all') {
    setPlatform(detectPlatform())
  }
}, [])
```

### 2. Date and Time Rendering

**Problem**: `Date.now()` or `new Date()` returns different values on server vs client.

```typescript
// ❌ BAD
const timestamp = Date.now()
return <div>Generated at {timestamp}</div>
```

**Solution**: Use `suppressHydrationWarning` for time-sensitive content or render after mount.

```typescript
// ✅ GOOD
const [timestamp, setTimestamp] = useState<number | null>(null)

useEffect(() => {
  setTimestamp(Date.now())
}, [])

return <div>{timestamp ? `Generated at ${timestamp}` : 'Loading...'}</div>
```

### 3. localStorage and sessionStorage

**Problem**: Storage APIs only exist in browser, not during SSR.

```typescript
// ❌ BAD
const theme = localStorage.getItem('theme') || 'light'
```

**Solution**: Always check if `window` is defined and use `useEffect`.

```typescript
// ✅ GOOD
const [theme, setTheme] = useState('light')

useEffect(() => {
  const stored = localStorage.getItem('theme')
  if (stored) setTheme(stored)
}, [])
```

### 4. Random Values

**Problem**: `Math.random()` or `crypto.randomUUID()` produces different values on server vs client.

```typescript
// ❌ BAD
const id = Math.random().toString()
return <div key={id}>...</div>
```

**Solution**: Generate IDs after mount or use deterministic keys.

```typescript
// ✅ GOOD - use stable keys
return items.map((item, index) => (
  <div key={item.id || index}>...</div>
))
```

### 5. next-themes (Theme Provider)

The `next-themes` library requires `suppressHydrationWarning` on the `<html>` element. This is **expected and correct**.

```typescript
// ✅ CORRECT - required for next-themes
<html lang="en" suppressHydrationWarning>
```

This is the ONLY place `suppressHydrationWarning` should be used in the codebase. Do not suppress hydration warnings elsewhere without careful consideration.

### 6. Testing for Hydration Issues

**E2E Tests**: Run `pnpm test:e2e` to catch console errors including hydration issues.

```typescript
// packages/web/e2e/console-errors.spec.ts monitors for:
// - Hydration errors
// - React warnings
// - Console errors during navigation
```

**Unit Tests**: Run `pnpm test` to verify hydration-safe code.

```typescript
// packages/web/__tests__/hydration-safety.test.ts verifies:
// - Store initializes with SSR-safe values
// - No browser APIs during initialization
// - Deterministic initial state
```

### 7. Debugging Hydration Errors

When you encounter a hydration error:

1. **Check the browser console** - React will tell you exactly which element mismatched
2. **Look for**: Date/time, random values, localStorage, window/document access
3. **Verify** server HTML matches client HTML for the problematic element
4. **Use** `console.log` in both SSR and client to compare values
5. **Run** E2E tests: `pnpm --filter=@katasumi/web test:e2e` to catch regressions

### 8. Prevention Checklist

Before committing new components:

- [ ] No `Date.now()`, `new Date()`, or `Math.random()` in initial render
- [ ] No `localStorage`, `sessionStorage`, or cookies during render
- [ ] No `window`, `document`, or browser APIs without `typeof window` check
- [ ] All `useEffect` hooks that access browser APIs have empty or stable dependencies
- [ ] E2E tests pass without console errors
- [ ] Unit tests verify SSR-safe initialization

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
