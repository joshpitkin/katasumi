/**
 * Database adapter interface for Katasumi
 * Provides a unified interface for querying shortcuts across different database backends
 */

import { Shortcut, AppInfo } from './types';

export interface SearchOptions {
  /** Search query string */
  query?: string;
  /** Filter by application */
  app?: string;
  /** Filter by category */
  category?: string;
  /** Filter by tag */
  tag?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Database adapter interface
 * Implementations should support both read-only and read-write operations
 */
export interface DatabaseAdapter {
  /**
   * Search for shortcuts across all sources
   */
  searchShortcuts(options: SearchOptions): Promise<Shortcut[]>;

  /**
   * Get all shortcuts for a specific app
   */
  getShortcutsByApp(app: string): Promise<Shortcut[]>;

  /**
   * Get a specific shortcut by ID
   */
  getShortcutById(id: string): Promise<Shortcut | null>;

  /**
   * Add a new shortcut (user-added only)
   */
  addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut>;

  /**
   * Update an existing shortcut (user-added only)
   */
  updateShortcut(id: string, shortcut: Partial<Shortcut>): Promise<Shortcut | null>;

  /**
   * Delete a shortcut (user-added only)
   */
  deleteShortcut(id: string): Promise<boolean>;

  /**
   * Get all available apps
   */
  getApps(): Promise<AppInfo[]>;

  /**
   * Get information about a specific app
   */
  getAppInfo(app: string): Promise<AppInfo | null>;

  /**
   * Close database connections
   */
  close(): Promise<void>;
}
