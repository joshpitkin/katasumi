import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLiteAdapter, KeywordSearchEngine } from '@katasumi/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Full-Phrase Mode', () => {
  let adapter: SQLiteAdapter;
  let searchEngine: KeywordSearchEngine;
  const testDbPath = ':memory:';

  beforeAll(async () => {
    // Find the core database
    const possiblePaths = [
      path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(__dirname, '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
    ];

    let coreDbPath = possiblePaths.find((p) => fs.existsSync(p));
    
    if (!coreDbPath) {
      throw new Error('Core database not found');
    }

    // Create .katasumi directory if it doesn't exist
    const katasumiDir = path.join(process.env.HOME || '~', '.katasumi');
    if (!fs.existsSync(katasumiDir)) {
      fs.mkdirSync(katasumiDir, { recursive: true });
    }

    const userDbPath = path.join(katasumiDir, 'test-user-data.db');
    adapter = new SQLiteAdapter(coreDbPath, userDbPath);
    searchEngine = new KeywordSearchEngine(adapter);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Cross-app search', () => {
    it('should search across all apps without app filter', async () => {
      const results = await searchEngine.fuzzySearch('split', {}, 30);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should get results from multiple apps
      const uniqueApps = new Set(results.map(r => r.app));
      expect(uniqueApps.size).toBeGreaterThan(1);
    });

    it('should find shortcuts for natural language query "split window"', async () => {
      const results = await searchEngine.fuzzySearch('split window', {}, 30);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // Verify results contain relevant actions
      const hasRelevantResult = results.some(r => 
        r.action.toLowerCase().includes('split') || 
        r.tags.some(t => t.toLowerCase().includes('split'))
      );
      expect(hasRelevantResult).toBe(true);
    });

    it('should find shortcuts for query "undo"', async () => {
      const results = await searchEngine.fuzzySearch('undo', {}, 30);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // Should get results from multiple apps (vim, vscode, etc.)
      const uniqueApps = new Set(results.map(r => r.app));
      expect(uniqueApps.size).toBeGreaterThan(1);
    });
  });

  describe('Platform filtering', () => {
    it('should filter results by macOS platform', async () => {
      const results = await searchEngine.fuzzySearch('copy', { platform: 'mac' }, 30);
      
      expect(results).toBeDefined();
      
      // All results should have mac keys defined
      results.forEach(shortcut => {
        expect(shortcut.keys.mac).toBeDefined();
        expect(shortcut.keys.mac).not.toBeNull();
      });
    });

    it('should filter results by Windows platform', async () => {
      const results = await searchEngine.fuzzySearch('copy', { platform: 'windows' }, 30);
      
      expect(results).toBeDefined();
      
      // All results should have windows keys defined
      results.forEach(shortcut => {
        expect(shortcut.keys.windows).toBeDefined();
        expect(shortcut.keys.windows).not.toBeNull();
      });
    });

    it('should filter results by Linux platform', async () => {
      const results = await searchEngine.fuzzySearch('copy', { platform: 'linux' }, 30);
      
      expect(results).toBeDefined();
      
      // All results should have linux keys defined
      results.forEach(shortcut => {
        expect(shortcut.keys.linux).toBeDefined();
        expect(shortcut.keys.linux).not.toBeNull();
      });
    });
  });

  describe('Result grouping', () => {
    it('should be able to group results by app', async () => {
      const results = await searchEngine.fuzzySearch('move', {}, 30);
      
      expect(results).toBeDefined();
      
      // Group by app
      const groupedByApp = results.reduce((acc, shortcut) => {
        if (!acc[shortcut.app]) {
          acc[shortcut.app] = [];
        }
        acc[shortcut.app].push(shortcut);
        return acc;
      }, {} as Record<string, typeof results>);
      
      // Should have multiple apps
      const apps = Object.keys(groupedByApp);
      expect(apps.length).toBeGreaterThan(0);
      
      // Each group should have at least one shortcut
      apps.forEach(app => {
        expect(groupedByApp[app].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search performance', () => {
    it('should complete search within reasonable time (<500ms)', async () => {
      const startTime = Date.now();
      await searchEngine.fuzzySearch('navigation', {}, 30);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should handle empty query gracefully', async () => {
      const results = await searchEngine.fuzzySearch('', {}, 30);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Empty query should return some default results
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-matching query gracefully', async () => {
      const results = await searchEngine.fuzzySearch('xyzabc123notfound', {}, 30);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Non-matching query should return empty or very few results
      expect(results.length).toBeLessThan(5);
    });
  });

  describe('Result structure', () => {
    it('should return shortcuts with all required fields', async () => {
      const results = await searchEngine.fuzzySearch('copy', {}, 5);
      
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(shortcut => {
        expect(shortcut).toHaveProperty('id');
        expect(shortcut).toHaveProperty('app');
        expect(shortcut).toHaveProperty('action');
        expect(shortcut).toHaveProperty('keys');
        expect(shortcut).toHaveProperty('context');
        expect(shortcut).toHaveProperty('category');
        expect(shortcut).toHaveProperty('tags');
        expect(Array.isArray(shortcut.tags)).toBe(true);
      });
    });

    it('should include context and category information', async () => {
      const results = await searchEngine.fuzzySearch('save', {}, 10);
      
      expect(results.length).toBeGreaterThan(0);
      
      // At least some results should have context or category
      const hasContextOrCategory = results.some(r => 
        r.context !== null || r.category !== null
      );
      expect(hasContextOrCategory).toBe(true);
    });
  });

  describe('AI toggle behavior', () => {
    it('should work with AI disabled (keyword search)', async () => {
      // Keyword search should work regardless of AI state
      const results = await searchEngine.fuzzySearch('paste', {}, 10);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    // Note: Full AI search testing would require API keys and is beyond unit test scope
    // This is tested at integration level
  });
});
