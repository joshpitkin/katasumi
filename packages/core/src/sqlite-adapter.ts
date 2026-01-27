/**
 * SQLite database adapter for TUI
 * Manages two databases:
 * 1. shortcuts.db - Bundled, read-only database with core shortcuts
 * 2. user-data.db - User's local database for custom shortcuts
 */

import { PrismaClient } from './generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { DatabaseAdapter, SearchOptions } from './database-adapter';
import { Shortcut, AppInfo, SourceType } from './types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class SQLiteAdapter implements DatabaseAdapter {
  private coreDb: PrismaClient;
  private userDb: PrismaClient;
  private corePath: string;
  private userPath: string;
  private initialized: Promise<void>;

  constructor(coreDatabasePath: string, userDatabasePath?: string) {
    this.corePath = coreDatabasePath;
    
    // Default user database location: ~/.katasumi/user-data.db
    if (!userDatabasePath) {
      const homeDir = os.homedir();
      const katsumiDir = path.join(homeDir, '.katasumi');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(katsumiDir)) {
        fs.mkdirSync(katsumiDir, { recursive: true });
      }
      
      this.userPath = path.join(katsumiDir, 'user-data.db');
    } else {
      this.userPath = userDatabasePath;
    }

    // Initialize core database (read-only)
    const coreAdapter = new PrismaLibSql({
      url: `file:${this.corePath}`
    });
    this.coreDb = new PrismaClient({ adapter: coreAdapter });

    // Initialize user database (read-write)
    const userAdapter = new PrismaLibSql({
      url: `file:${this.userPath}`
    });
    this.userDb = new PrismaClient({ adapter: userAdapter });

    // Initialize user database schema if it doesn't exist
    this.initialized = this.initializeUserDatabase();
  }

  /**
   * Ensure the adapter is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  private async initializeUserDatabase(): Promise<void> {
    try {
      // Check if the shortcuts table exists by attempting to count records
      await this.userDb.shortcut.count();
    } catch (error) {
      // Table doesn't exist, create schema
      console.log('Initializing user database schema...');
      
      // Create shortcuts table
      await this.userDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS shortcuts (
          id TEXT PRIMARY KEY,
          app TEXT NOT NULL,
          action TEXT NOT NULL,
          keysMac TEXT,
          keysWindows TEXT,
          keysLinux TEXT,
          context TEXT,
          category TEXT,
          tags TEXT NOT NULL,
          sourceType TEXT NOT NULL,
          sourceUrl TEXT,
          sourceScrapedAt DATETIME,
          sourceConfidence REAL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.userDb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_shortcuts_app ON shortcuts(app)
      `);

      await this.userDb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_shortcuts_action ON shortcuts(action)
      `);

      await this.userDb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_shortcuts_category ON shortcuts(category)
      `);

      // Create app_info table
      await this.userDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS app_info (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          displayName TEXT NOT NULL,
          category TEXT NOT NULL,
          platforms TEXT NOT NULL,
          shortcutCount INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.userDb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_app_info_name ON app_info(name)
      `);

      await this.userDb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_app_info_category ON app_info(category)
      `);

      console.log('✅ User database schema initialized');
    }
  }

  /**
   * Convert database record to Shortcut type
   */
  private dbToShortcut(record: any): Shortcut {
    return {
      id: record.id,
      app: record.app,
      action: record.action,
      keys: {
        mac: record.keysMac || undefined,
        windows: record.keysWindows || undefined,
        linux: record.keysLinux || undefined,
      },
      context: record.context || undefined,
      category: record.category || undefined,
      tags: record.tags.split(',').filter((t: string) => t.length > 0),
      source: {
        type: record.sourceType as SourceType,
        url: record.sourceUrl || '',
        scrapedAt: record.sourceScrapedAt || new Date(),
        confidence: record.sourceConfidence || 1.0,
      },
    };
  }

  /**
   * Convert Shortcut type to database record
   */
  private shortcutToDb(shortcut: Omit<Shortcut, 'id'>) {
    return {
      app: shortcut.app,
      action: shortcut.action,
      keysMac: shortcut.keys.mac || null,
      keysWindows: shortcut.keys.windows || null,
      keysLinux: shortcut.keys.linux || null,
      context: shortcut.context || null,
      category: shortcut.category || null,
      tags: shortcut.tags.join(','),
      sourceType: shortcut.source?.type || SourceType.USER_ADDED,
      sourceUrl: shortcut.source?.url || null,
      sourceScrapedAt: shortcut.source?.scrapedAt || null,
      sourceConfidence: shortcut.source?.confidence || null,
    };
  }

  /**
   * Build where clause for search options
   */
  private buildWhereClause(options: SearchOptions) {
    const where: any = {};

    if (options.app) {
      where.app = options.app;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.query) {
      // Search in action, tags, and context fields
      where.OR = [
        { action: { contains: options.query } },
        { tags: { contains: options.query } },
        { context: { contains: options.query } },
      ];
    }

    if (options.tag) {
      where.tags = { contains: options.tag };
    }

    return where;
  }

  async searchShortcuts(options: SearchOptions = {}): Promise<Shortcut[]> {
    await this.ensureInitialized();
    const where = this.buildWhereClause(options);
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Search in both databases
    const [coreResults, userResults] = await Promise.all([
      this.coreDb.shortcut.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      this.userDb.shortcut.findMany({
        where,
        take: limit,
        skip: offset,
      }),
    ]);

    // Combine and convert results
    const combined = [...coreResults, ...userResults];
    return combined.map(record => this.dbToShortcut(record));
  }

  async getShortcutsByApp(app: string): Promise<Shortcut[]> {
    await this.ensureInitialized();
    const [coreResults, userResults] = await Promise.all([
      this.coreDb.shortcut.findMany({ where: { app } }),
      this.userDb.shortcut.findMany({ where: { app } }),
    ]);

    const combined = [...coreResults, ...userResults];
    return combined.map(record => this.dbToShortcut(record));
  }

  async getShortcutById(id: string): Promise<Shortcut | null> {
    await this.ensureInitialized();
    // Try core database first
    let record = await this.coreDb.shortcut.findUnique({ where: { id } });
    
    // If not found, try user database
    if (!record) {
      record = await this.userDb.shortcut.findUnique({ where: { id } });
    }

    return record ? this.dbToShortcut(record) : null;
  }

  async addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut> {
    await this.ensureInitialized();
    const dbRecord = this.shortcutToDb(shortcut);
    const created = await this.userDb.shortcut.create({
      data: dbRecord,
    });

    return this.dbToShortcut(created);
  }

  async updateShortcut(id: string, shortcut: Partial<Shortcut>): Promise<Shortcut | null> {
    await this.ensureInitialized();
    // Only update shortcuts in user database
    try {
      const dbRecord: any = {};
      
      if (shortcut.app !== undefined) dbRecord.app = shortcut.app;
      if (shortcut.action !== undefined) dbRecord.action = shortcut.action;
      if (shortcut.keys !== undefined) {
        dbRecord.keysMac = shortcut.keys.mac || null;
        dbRecord.keysWindows = shortcut.keys.windows || null;
        dbRecord.keysLinux = shortcut.keys.linux || null;
      }
      if (shortcut.context !== undefined) dbRecord.context = shortcut.context;
      if (shortcut.category !== undefined) dbRecord.category = shortcut.category;
      if (shortcut.tags !== undefined) dbRecord.tags = shortcut.tags.join(',');
      if (shortcut.source !== undefined) {
        dbRecord.sourceType = shortcut.source.type;
        dbRecord.sourceUrl = shortcut.source.url;
        dbRecord.sourceScrapedAt = shortcut.source.scrapedAt;
        dbRecord.sourceConfidence = shortcut.source.confidence;
      }

      const updated = await this.userDb.shortcut.update({
        where: { id },
        data: dbRecord,
      });

      return this.dbToShortcut(updated);
    } catch (error) {
      // Shortcut not found in user database
      return null;
    }
  }

  async deleteShortcut(id: string): Promise<boolean> {
    await this.ensureInitialized();
    // Only delete shortcuts from user database
    try {
      await this.userDb.shortcut.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert database record to AppInfo type
   */
  private dbToAppInfo(record: any): AppInfo {
    return {
      id: record.id,
      name: record.name,
      displayName: record.displayName,
      category: record.category,
      platforms: record.platforms.split(',').filter((p: string) => p.length > 0) as any,
      shortcutCount: record.shortcutCount,
    };
  }

  async getApps(): Promise<AppInfo[]> {
    await this.ensureInitialized();
    // Get apps from both databases
    const [coreApps, userApps] = await Promise.all([
      this.coreDb.appInfo.findMany(),
      this.userDb.appInfo.findMany(),
    ]);

    // Merge apps by name, preferring user database if duplicate
    const appsMap = new Map<string, any>();
    
    coreApps.forEach(app => appsMap.set(app.name, app));
    userApps.forEach(app => appsMap.set(app.name, app));

    return Array.from(appsMap.values()).map(record => this.dbToAppInfo(record));
  }

  async getAppInfo(app: string): Promise<AppInfo | null> {
    await this.ensureInitialized();
    // Try user database first
    let record = await this.userDb.appInfo.findUnique({ where: { name: app } });
    
    // If not found, try core database
    if (!record) {
      record = await this.coreDb.appInfo.findUnique({ where: { name: app } });
    }

    return record ? this.dbToAppInfo(record) : null;
  }

  async close(): Promise<void> {
    await Promise.all([
      this.coreDb.$disconnect(),
      this.userDb.$disconnect(),
    ]);
  }

  /**
   * Get the path to the core database
   */
  getCorePath(): string {
    return this.corePath;
  }

  /**
   * Get the path to the user database
   */
  getUserPath(): string {
    return this.userPath;
  }
}
