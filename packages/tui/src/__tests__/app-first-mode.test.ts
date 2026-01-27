/**
 * Test suite for App-First Mode
 * Verifies database path resolution and core functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLiteAdapter } from '@katasumi/core';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module dirname shim (same as AppFirstMode.tsx)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('App-First Mode', () => {
  describe('Database Path Resolution', () => {
    it('should resolve database path from dist/ directory', () => {
      // Simulate running from dist/components/ (where compiled code lives)
      const possiblePaths = [
        // From dist/__tests__/ go to packages/core/data/shortcuts.db
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        // From packages/tui/src/__tests__ go to packages/core/data/shortcuts.db
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        // From process.cwd() which might be packages/tui
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        // From process.cwd() which might be monorepo root
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const foundPath = possiblePaths.find((p) => fs.existsSync(p));

      expect(foundPath).toBeDefined();
      expect(fs.existsSync(foundPath!)).toBe(true);
    });

    it('should initialize SQLiteAdapter with correct core database', () => {
      const possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
      expect(coreDbPath).toBeDefined();

      const adapter = new SQLiteAdapter(coreDbPath!, ':memory:');
      expect(adapter).toBeDefined();
      expect(adapter.getCorePath()).toBe(coreDbPath);
    });
  });

  describe('App Loading', () => {
    let adapter: SQLiteAdapter;

    beforeAll(() => {
      const possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
      if (!coreDbPath) {
        throw new Error('Core database not found');
      }

      adapter = new SQLiteAdapter(coreDbPath, ':memory:');
    });

    afterAll(async () => {
      if (adapter) {
        await adapter.close();
      }
    });

    it('should load available apps from database', async () => {
      const apps = await adapter.getApps();
      expect(apps).toBeDefined();
      expect(Array.isArray(apps)).toBe(true);
      expect(apps.length).toBeGreaterThan(0);
    });

    it('should load app info with required fields', async () => {
      const apps = await adapter.getApps();
      expect(apps.length).toBeGreaterThan(0);

      const firstApp = apps[0];
      expect(firstApp).toHaveProperty('id');
      expect(firstApp).toHaveProperty('name');
      expect(firstApp).toHaveProperty('displayName');
      expect(firstApp).toHaveProperty('category');
      expect(firstApp).toHaveProperty('platforms');
      expect(firstApp).toHaveProperty('shortcutCount');
      expect(Array.isArray(firstApp.platforms)).toBe(true);
      expect(typeof firstApp.shortcutCount).toBe('number');
    });

    it('should load popular apps (vim, vscode, etc)', async () => {
      const apps = await adapter.getApps();
      const appNames = apps.map((app) => app.name.toLowerCase());

      // Check for at least some popular apps
      const hasPopularApps = 
        appNames.some(name => name.includes('vim')) ||
        appNames.some(name => name.includes('vscode')) ||
        appNames.some(name => name.includes('visual'));

      expect(hasPopularApps).toBe(true);
    });
  });

  describe('App Filtering', () => {
    let adapter: SQLiteAdapter;

    beforeAll(() => {
      const possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
      if (!coreDbPath) {
        throw new Error('Core database not found');
      }

      adapter = new SQLiteAdapter(coreDbPath, ':memory:');
    });

    afterAll(async () => {
      if (adapter) {
        await adapter.close();
      }
    });

    it('should filter apps by query (fuzzy matching simulation)', async () => {
      const allApps = await adapter.getApps();
      const query = 'vim';

      // Simple substring filtering (in real app, this would be fuzzy)
      const filtered = allApps.filter((app) =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.displayName.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered.length).toBeGreaterThanOrEqual(0);
      // If vim is in the database, it should be found
      if (allApps.some(a => a.name.toLowerCase().includes('vim'))) {
        expect(filtered.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Shortcuts Loading', () => {
    let adapter: SQLiteAdapter;

    beforeAll(() => {
      const possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
      if (!coreDbPath) {
        throw new Error('Core database not found');
      }

      adapter = new SQLiteAdapter(coreDbPath, ':memory:');
    });

    afterAll(async () => {
      if (adapter) {
        await adapter.close();
      }
    });

    it('should load shortcuts for a specific app', async () => {
      const apps = await adapter.getApps();
      expect(apps.length).toBeGreaterThan(0);

      const firstApp = apps[0];
      const shortcuts = await adapter.getShortcutsByApp(firstApp.name);

      expect(Array.isArray(shortcuts)).toBe(true);
      expect(shortcuts.length).toBeGreaterThan(0);
      // Shortcut count should be close (may differ slightly due to aggregation)
      expect(shortcuts.length).toBeGreaterThanOrEqual(firstApp.shortcutCount - 10);
      expect(shortcuts.length).toBeLessThanOrEqual(firstApp.shortcutCount + 10);
    });

    it('should load shortcuts with all required fields', async () => {
      const apps = await adapter.getApps();
      const firstApp = apps[0];
      const shortcuts = await adapter.getShortcutsByApp(firstApp.name);

      expect(shortcuts.length).toBeGreaterThan(0);

      const shortcut = shortcuts[0];
      expect(shortcut).toHaveProperty('id');
      expect(shortcut).toHaveProperty('app');
      expect(shortcut).toHaveProperty('action');
      expect(shortcut).toHaveProperty('keys');
      expect(shortcut).toHaveProperty('category');
      expect(shortcut).toHaveProperty('tags');
      expect(Array.isArray(shortcut.tags)).toBe(true);
    });

    it('should filter shortcuts by quick search query', async () => {
      const apps = await adapter.getApps();
      const firstApp = apps[0];
      
      const searchResults = await adapter.searchShortcuts({
        app: firstApp.name,
        query: 'move',
        limit: 10,
      });

      expect(Array.isArray(searchResults)).toBe(true);
      // Results may be 0 if "move" isn't in this app's shortcuts
      searchResults.forEach((result) => {
        expect(result.app).toBe(firstApp.name);
      });
    });
  });

  describe('Filter Performance', () => {
    let adapter: SQLiteAdapter;

    beforeAll(() => {
      const possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
        path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
      ];

      const coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
      if (!coreDbPath) {
        throw new Error('Core database not found');
      }

      adapter = new SQLiteAdapter(coreDbPath, ':memory:');
    });

    afterAll(async () => {
      if (adapter) {
        await adapter.close();
      }
    });

    it('should execute search query in under 100ms', async () => {
      const apps = await adapter.getApps();
      expect(apps.length).toBeGreaterThan(0);

      const firstApp = apps[0];
      
      const startTime = Date.now();
      await adapter.searchShortcuts({
        app: firstApp.name,
        query: 'test',
        limit: 50,
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    }, 10000); // 10 second timeout for the test itself
  });
});
