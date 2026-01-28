#!/usr/bin/env node
/**
 * Migration CLI tool
 * Usage: 
 *   pnpm run migrate          - Run all pending migrations
 *   pnpm run migrate:rollback - Rollback last migration
 *   pnpm run migrate:status   - Show migration status
 */

import { PrismaClient } from '../src/generated/prisma';
import { PrismaClient as PrismaClientPostgres } from '../src/generated/prisma-postgres';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { MigrationRunner } from './migration-runner';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const command = process.argv[2] || 'up';
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  // Set up database URL
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (dbType === 'sqlite') {
      const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'katasumi.db');
      databaseUrl = `file:${dbPath}`;
      process.env.DATABASE_URL = databaseUrl;
    } else {
      console.error('DATABASE_URL environment variable is required for PostgreSQL');
      process.exit(1);
    }
  }
  
  // Normalize PostgreSQL URL scheme (postgres:// is more widely supported than postgresql://)
  if (databaseUrl.startsWith('postgresql://')) {
    databaseUrl = databaseUrl.replace('postgresql://', 'postgres://');
    process.env.DATABASE_URL = databaseUrl;
  }
  
  console.log(`Using database: ${databaseUrl}`);
  
  // Initialize Prisma client based on database type
  let prisma: any;
  
  if (dbType === 'postgres') {
    // Use PostgreSQL client with pg adapter
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClientPostgres({ adapter });
  } else {
    // Create adapter for libSQL/SQLite
    const adapter = new PrismaLibSql({
      url: databaseUrl
    });
    
    // Initialize Prisma client with adapter for Prisma 7
    prisma = new PrismaClient({
      adapter,
    });
  }
  
  try {
    // Ensure database connection
    await prisma.$connect();
    
    // Set up migration runner
    const migrationsPath = path.join(__dirname, '..', 'migrations');
    
    if (!fs.existsSync(migrationsPath)) {
      console.error(`Migrations directory not found: ${migrationsPath}`);
      process.exit(1);
    }
    
    const runner = new MigrationRunner(prisma, migrationsPath);
    
    // Execute command
    switch (command) {
      case 'up':
      case 'migrate':
        await runner.migrate();
        break;
      
      case 'down':
      case 'rollback':
        await runner.rollback();
        break;
      
      case 'status':
        await runner.status();
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: up, down, status');
        process.exit(1);
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
