/**
 * PostgreSQL Database Adapter for Katasumi Web App
 * Implements DatabaseAdapter interface for PostgreSQL with user account support
 */

import { PrismaClient as PrismaClientPostgres } from './generated/prisma-postgres';
import { DatabaseAdapter, SearchOptions } from './database-adapter';
import { Shortcut, AppInfo, SourceType } from './types';

export class PostgresAdapter implements DatabaseAdapter {
  private coreClient: PrismaClientPostgres;
  private userClient: PrismaClientPostgres;
  private userId?: string;

  /**
   * Create a new PostgresAdapter
   * @param coreDbUrl - Connection string for core shortcuts database
   * @param userDbUrl - Connection string for user data database (optional, defaults to coreDbUrl)
   * @param userId - Optional user ID for user-specific operations
   */
  constructor(coreDbUrl: string, userDbUrl?: string, userId?: string) {
    if (!coreDbUrl || coreDbUrl.trim() === '') {
      throw new Error('Core database URL is required');
    }
    
    // Normalize PostgreSQL URL scheme
    if (coreDbUrl.startsWith('postgresql://')) {
      coreDbUrl = coreDbUrl.replace('postgresql://', 'postgres://');
    }
    
    try {
      // Use pg adapter for PostgreSQL
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      
      const corePool = new Pool({ connectionString: coreDbUrl });
      const coreAdapter = new PrismaPg(corePool);
      
      this.coreClient = new PrismaClientPostgres({ adapter: coreAdapter });
    } catch (error) {
      throw new Error(`Failed to connect to core PostgreSQL database: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // If userDbUrl not provided, use the same connection
    if (userDbUrl) {
      // Normalize PostgreSQL URL scheme
      if (userDbUrl.startsWith('postgresql://')) {
        userDbUrl = userDbUrl.replace('postgresql://', 'postgres://');
      }
      
      try {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        
        const userPool = new Pool({ connectionString: userDbUrl });
        const userAdapter = new PrismaPg(userPool);
        
        this.userClient = new PrismaClientPostgres({ adapter: userAdapter });
      } catch (error) {
        throw new Error(`Failed to connect to user PostgreSQL database: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      this.userClient = this.coreClient;
    }
    
    this.userId = userId;
  }

  /**
   * Search for shortcuts across core and user databases
   */
  async searchShortcuts(options: SearchOptions): Promise<Shortcut[]> {
    const { query, app, category, tag, limit = 50, offset = 0 } = options;

    try {
      // Build where clause
      const where: any = {};
    if (app) where.app = app;
    if (category) where.category = category;
    if (query) {
      where.OR = [
        { action: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (tag) {
      where.tags = { contains: tag, mode: 'insensitive' };
    }

    // Query core database
    const coreShortcuts = await this.coreClient.shortcut.findMany({
      where,
      take: limit,
      skip: offset,
    });

    // Query user database if userId is set
    let userShortcuts: any[] = [];
    if (this.userId) {
      userShortcuts = await this.userClient.userShortcut.findMany({
        where: { ...where, userId: this.userId },
        take: limit,
        skip: offset,
      });
    }

    // Convert to Shortcut type
    const results = [
      ...coreShortcuts.map(this.convertToShortcut),
      ...userShortcuts.map(this.convertUserShortcutToShortcut),
    ];

    return results.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to search PostgreSQL shortcuts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all shortcuts for a specific app
   */
  async getShortcutsByApp(app: string): Promise<Shortcut[]> {
    return this.searchShortcuts({ app });
  }

  /**
   * Get a specific shortcut by ID
   */
  async getShortcutById(id: string): Promise<Shortcut | null> {
    // Try core database first
    const coreShortcut = await this.coreClient.shortcut.findUnique({
      where: { id },
    });
    
    if (coreShortcut) {
      return this.convertToShortcut(coreShortcut);
    }

    // Try user database if userId is set
    if (this.userId) {
      const userShortcut = await this.userClient.userShortcut.findFirst({
        where: { id, userId: this.userId },
      });
      
      if (userShortcut) {
        return this.convertUserShortcutToShortcut(userShortcut);
      }
    }

    return null;
  }

  /**
   * Add a new shortcut (user database only)
   */
  async addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut> {
    if (!this.userId) {
      throw new Error('User ID required to add shortcuts');
    }

    const created = await this.userClient.userShortcut.create({
      data: {
        userId: this.userId,
        app: shortcut.app,
        action: shortcut.action,
        keysMac: shortcut.keys?.mac,
        keysWindows: shortcut.keys?.windows,
        keysLinux: shortcut.keys?.linux,
        context: shortcut.context,
        category: shortcut.category,
        tags: shortcut.tags.join(','),
        sourceType: this.convertSourceTypeToString(shortcut.source?.type || SourceType.USER_ADDED),
        sourceUrl: shortcut.source?.url,
        sourceScrapedAt: shortcut.source?.scrapedAt,
        sourceConfidence: shortcut.source?.confidence,
      },
    });

    return this.convertUserShortcutToShortcut(created);
  }

  /**
   * Update an existing shortcut (user database only)
   */
  async updateShortcut(id: string, shortcut: Partial<Shortcut>): Promise<Shortcut | null> {
    if (!this.userId) {
      throw new Error('User ID required to update shortcuts');
    }

    // Build update data
    const data: any = {};
    if (shortcut.app !== undefined) data.app = shortcut.app;
    if (shortcut.action !== undefined) data.action = shortcut.action;
    if (shortcut.keys?.mac !== undefined) data.keysMac = shortcut.keys.mac;
    if (shortcut.keys?.windows !== undefined) data.keysWindows = shortcut.keys.windows;
    if (shortcut.keys?.linux !== undefined) data.keysLinux = shortcut.keys.linux;
    if (shortcut.context !== undefined) data.context = shortcut.context;
    if (shortcut.category !== undefined) data.category = shortcut.category;
    if (shortcut.tags !== undefined) data.tags = shortcut.tags.join(',');
    if (shortcut.source?.type !== undefined) data.sourceType = this.convertSourceTypeToString(shortcut.source.type);
    if (shortcut.source?.url !== undefined) data.sourceUrl = shortcut.source.url;
    if (shortcut.source?.scrapedAt !== undefined) data.sourceScrapedAt = shortcut.source.scrapedAt;
    if (shortcut.source?.confidence !== undefined) data.sourceConfidence = shortcut.source.confidence;

    try {
      const updated = await this.userClient.userShortcut.updateMany({
        where: { id, userId: this.userId },
        data,
      });

      if (updated.count === 0) {
        return null;
      }

      return await this.getShortcutById(id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a shortcut (user database only)
   */
  async deleteShortcut(id: string): Promise<boolean> {
    if (!this.userId) {
      throw new Error('User ID required to delete shortcuts');
    }

    try {
      const deleted = await this.userClient.userShortcut.deleteMany({
        where: { id, userId: this.userId },
      });
      return deleted.count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available apps
   */
  async getApps(): Promise<AppInfo[]> {
    try {
      const apps = await this.coreClient.appInfo.findMany({
        orderBy: { displayName: 'asc' },
      });

      return apps.map(app => ({
        id: app.id,
        name: app.name,
        displayName: app.displayName,
        category: app.category,
        platforms: app.platforms.split(',') as ('mac' | 'windows' | 'linux')[],
        shortcutCount: app.shortcutCount,
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve apps from PostgreSQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get information about a specific app
   */
  async getAppInfo(app: string): Promise<AppInfo | null> {
    const appInfo = await this.coreClient.appInfo.findUnique({
      where: { name: app },
    });

    if (!appInfo) {
      return null;
    }

    return {
      id: appInfo.id,
      name: appInfo.name,
      displayName: appInfo.displayName,
      category: appInfo.category,
      platforms: appInfo.platforms.split(',') as ('mac' | 'windows' | 'linux')[],
      shortcutCount: appInfo.shortcutCount,
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.coreClient.$disconnect();
    if (this.userClient !== this.coreClient) {
      await this.userClient.$disconnect();
    }
  }

  /**
   * Convert Prisma Shortcut to Shortcut type
   */
  private convertToShortcut(prismaShortcut: any): Shortcut {
    return {
      id: prismaShortcut.id,
      app: prismaShortcut.app,
      action: prismaShortcut.action,
      keys: {
        mac: prismaShortcut.keysMac || undefined,
        windows: prismaShortcut.keysWindows || undefined,
        linux: prismaShortcut.keysLinux || undefined,
      },
      context: prismaShortcut.context || undefined,
      category: prismaShortcut.category || undefined,
      tags: prismaShortcut.tags ? prismaShortcut.tags.split(',') : [],
      source: {
        type: this.convertSourceType(prismaShortcut.sourceType),
        url: prismaShortcut.sourceUrl || undefined,
        scrapedAt: prismaShortcut.sourceScrapedAt || undefined,
        confidence: prismaShortcut.sourceConfidence || undefined,
      },
    };
  }

  /**
   * Convert Prisma UserShortcut to Shortcut type
   */
  private convertUserShortcutToShortcut(prismaShortcut: any): Shortcut {
    return {
      id: prismaShortcut.id,
      app: prismaShortcut.app,
      action: prismaShortcut.action,
      keys: {
        mac: prismaShortcut.keysMac || undefined,
        windows: prismaShortcut.keysWindows || undefined,
        linux: prismaShortcut.keysLinux || undefined,
      },
      context: prismaShortcut.context || undefined,
      category: prismaShortcut.category || undefined,
      tags: prismaShortcut.tags ? prismaShortcut.tags.split(',') : [],
      source: {
        type: this.convertSourceType(prismaShortcut.sourceType),
        url: prismaShortcut.sourceUrl || undefined,
        scrapedAt: prismaShortcut.sourceScrapedAt || undefined,
        confidence: prismaShortcut.sourceConfidence || undefined,
      },
    };
  }

  /**
   * Convert string to SourceType enum
   */
  private convertSourceType(type: string): SourceType {
    switch (type) {
      case 'official':
        return SourceType.OFFICIAL;
      case 'community':
        return SourceType.COMMUNITY;
      case 'ai-scraped':
        return SourceType.AI_SCRAPED;
      case 'user-added':
        return SourceType.USER_ADDED;
      default:
        return SourceType.USER_ADDED;
    }
  }

  /**
   * Convert SourceType enum to string
   */
  private convertSourceTypeToString(type: SourceType): string {
    switch (type) {
      case SourceType.OFFICIAL:
        return 'official';
      case SourceType.COMMUNITY:
        return 'community';
      case SourceType.AI_SCRAPED:
        return 'ai-scraped';
      case SourceType.USER_ADDED:
        return 'user-added';
      default:
        return 'user-added';
    }
  }
}
