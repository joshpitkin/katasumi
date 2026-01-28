/**
 * Migration runner for SQLite and PostgreSQL
 * Manages database schema versioning and migrations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Migration {
  id: string;
  name: string;
  up: (db: any, dbType?: string) => Promise<void>;
  down: (db: any, dbType?: string) => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
}

export class MigrationRunner {
  private db: any;
  private migrationsPath: string;
  private dbType: string;

  constructor(db: any, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
    this.dbType = process.env.DB_TYPE || 'sqlite';
  }

  /**
   * Ensure the migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await this.db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  /**
   * Get all applied migrations
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    
    const rows: any[] = await this.db.$queryRawUnsafe(`
      SELECT id, name, applied_at as appliedAt 
      FROM _migrations 
      ORDER BY applied_at ASC
    `);
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      appliedAt: new Date(row.appliedAt)
    }));
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(id: string, name: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.db.$executeRawUnsafe(`
        INSERT INTO _migrations (id, name, applied_at) 
        VALUES ($1, $2, $3)
      `, id, name, new Date().toISOString());
    } else {
      await this.db.$executeRawUnsafe(`
        INSERT INTO _migrations (id, name, applied_at) 
        VALUES (?, ?, ?)
      `, id, name, new Date().toISOString());
    }
  }

  /**
   * Remove a migration record
   */
  private async removeMigration(id: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.db.$executeRawUnsafe(`
        DELETE FROM _migrations WHERE id = $1
      `, id);
    } else {
      await this.db.$executeRawUnsafe(`
        DELETE FROM _migrations WHERE id = ?
      `, id);
    }
  }

  /**
   * Load all migration files
   */
  private async loadMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();

    const migrations: Migration[] = [];
    
    for (const file of files) {
      const filePath = path.join(this.migrationsPath, file);
      const module = await import(filePath);
      
      // Extract ID from filename (YYYYMMDD_HHMMSS_description.ts)
      const id = file.split('_').slice(0, 2).join('_');
      const name = file.replace(/\.(ts|js)$/, '');
      
      migrations.push({
        id,
        name,
        up: module.up,
        down: module.down
      });
    }
    
    return migrations;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('Running migrations...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    
    const allMigrations = await this.loadMigrations();
    const pendingMigrations = allMigrations.filter(m => !appliedIds.has(m.id));
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.');
      return;
    }
    
    for (const migration of pendingMigrations) {
      console.log(`Applying migration: ${migration.name}`);
      
      try {
        await migration.up(this.db, this.dbType);
        await this.recordMigration(migration.id, migration.name);
        console.log(`✓ Applied: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.name}:`, error);
        throw error;
      }
    }
    
    console.log(`Successfully applied ${pendingMigrations.length} migration(s).`);
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    console.log('Rolling back last migration...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }
    
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.id === lastMigration.id);
    
    if (!migration) {
      throw new Error(`Migration file not found for: ${lastMigration.name}`);
    }
    
    console.log(`Rolling back migration: ${migration.name}`);
    
    try {
      await migration.down(this.db, this.dbType);
      await this.removeMigration(migration.id);
      console.log(`✓ Rolled back: ${migration.name}`);
    } catch (error) {
      console.error(`✗ Failed to rollback migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    
    console.log('\nMigration Status:');
    console.log('=================\n');
    
    for (const migration of allMigrations) {
      const status = appliedIds.has(migration.id) ? '✓' : '✗';
      console.log(`${status} ${migration.name}`);
    }
    
    const pending = allMigrations.filter(m => !appliedIds.has(m.id));
    console.log(`\nPending: ${pending.length}, Applied: ${appliedMigrations.length}`);
  }
}
