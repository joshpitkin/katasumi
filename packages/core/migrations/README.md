# Database Migrations

This directory contains database migration files for Katasumi.

## Migration File Format

Migration files should follow this naming convention:
```
YYYYMMDD_HHMMSS_description.js
```

Example: `20260126_221245_initial_schema.js`

## Migration Structure

Each migration file must export two functions:

```javascript
exports.up = async function up(db) {
  // Migration code to apply changes
  await db.$executeRawUnsafe(`CREATE TABLE ...`);
};

exports.down = async function down(db) {
  // Migration code to revert changes
  await db.$executeRawUnsafe(`DROP TABLE ...`);
};
```

## Running Migrations

From the monorepo root:

```bash
# Run all pending migrations
npm run migrate

# Rollback the last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

From the core package:

```bash
cd packages/core

# Run migrations
DATABASE_URL="file:./database.db" npm run migrate

# For PostgreSQL
DATABASE_URL="postgres://user:password@localhost:5432/db" DB_TYPE=postgres npm run migrate
```

## Supported Databases

- SQLite (default)
- PostgreSQL

Both databases use the same migration files, which are written to be compatible with both systems.
