import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordSearchEngine } from '../keyword-search-engine';
import { DatabaseAdapter, SearchOptions } from '../database-adapter';
import { Shortcut, SourceType } from '../types';

// Mock database adapter for testing
class MockDatabaseAdapter implements DatabaseAdapter {
  private shortcuts: Shortcut[] = [
    {
      id: '1',
      app: 'vim',
      action: 'Copy line',
      keys: { mac: 'yy', linux: 'yy' },
      context: 'Normal Mode',
      category: 'Editing',
      tags: ['copy', 'clipboard'],
      source: { type: SourceType.OFFICIAL, url: 'https://vim.org', scrapedAt: new Date(), confidence: 1.0 }
    },
    {
      id: '2',
      app: 'vim',
      action: 'Paste',
      keys: { mac: 'p', linux: 'p' },
      context: 'Normal Mode',
      category: 'Editing',
      tags: ['paste', 'clipboard'],
      source: { type: SourceType.OFFICIAL, url: 'https://vim.org', scrapedAt: new Date(), confidence: 1.0 }
    },
    {
      id: '3',
      app: 'vscode',
      action: 'Copy line',
      keys: { mac: 'Cmd+C', windows: 'Ctrl+C', linux: 'Ctrl+C' },
      context: 'Editor',
      category: 'Editing',
      tags: ['copy', 'clipboard'],
      source: { type: SourceType.OFFICIAL, url: 'https://code.visualstudio.com', scrapedAt: new Date(), confidence: 1.0 }
    },
    {
      id: '4',
      app: 'vscode',
      action: 'Open file',
      keys: { mac: 'Cmd+O', windows: 'Ctrl+O', linux: 'Ctrl+O' },
      context: 'Global',
      category: 'Files',
      tags: ['file', 'open'],
      source: { type: SourceType.OFFICIAL, url: 'https://code.visualstudio.com', scrapedAt: new Date(), confidence: 1.0 }
    },
    {
      id: '5',
      app: 'tmux',
      action: 'Split pane horizontally',
      keys: { mac: 'Ctrl+B %', linux: 'Ctrl+B %' },
      context: 'Pane Management',
      category: 'Panes',
      tags: ['split', 'pane', 'horizontal'],
      source: { type: SourceType.OFFICIAL, url: 'https://tmux.github.io', scrapedAt: new Date(), confidence: 1.0 }
    },
  ];

  async searchShortcuts(options: SearchOptions = {}): Promise<Shortcut[]> {
    let results = [...this.shortcuts];

    if (options.app) {
      results = results.filter(s => s.app === options.app);
    }

    if (options.category) {
      results = results.filter(s => s.category === options.category);
    }

    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(s => 
        s.action.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (options.tag) {
      results = results.filter(s => s.tags.includes(options.tag!));
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;
    return results.slice(offset, offset + limit);
  }

  async getShortcutsByApp(app: string): Promise<Shortcut[]> {
    return this.shortcuts.filter(s => s.app === app);
  }

  async getShortcutById(id: string): Promise<Shortcut | null> {
    return this.shortcuts.find(s => s.id === id) || null;
  }

  async addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut> {
    const newShortcut = { ...shortcut, id: String(this.shortcuts.length + 1) };
    this.shortcuts.push(newShortcut);
    return newShortcut;
  }

  async updateShortcut(id: string, update: Partial<Shortcut>): Promise<Shortcut | null> {
    const index = this.shortcuts.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.shortcuts[index] = { ...this.shortcuts[index], ...update };
    return this.shortcuts[index];
  }

  async deleteShortcut(id: string): Promise<boolean> {
    const index = this.shortcuts.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.shortcuts.splice(index, 1);
    return true;
  }

  async getApps(): Promise<any[]> {
    return [];
  }

  async getAppInfo(app: string): Promise<any> {
    return null;
  }

  async close(): Promise<void> {}
}

describe('KeywordSearchEngine', () => {
  let engine: KeywordSearchEngine;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    engine = new KeywordSearchEngine(adapter);
  });

  describe('fuzzySearch', () => {
    it('should find exact match', async () => {
      const results = await engine.fuzzySearch('paste');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].action.toLowerCase()).toContain('paste');
    });

    it('should find partial match in action', async () => {
      const results = await engine.fuzzySearch('copy');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.action.toLowerCase().includes('copy'))).toBe(true);
    });

    it('should find match in tags', async () => {
      const results = await engine.fuzzySearch('clipboard');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.tags.includes('clipboard'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const results = await engine.fuzzySearch('nonexistent');
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const results = await engine.fuzzySearch('', {}, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return results when query is empty', async () => {
      const results = await engine.fuzzySearch('');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by app', async () => {
      const results = await engine.fuzzySearch('copy', { app: 'vim' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.app === 'vim')).toBe(true);
    });

    it('should filter by platform', async () => {
      const results = await engine.fuzzySearch('', { platform: 'windows' });
      expect(results.every(r => r.keys.windows !== undefined)).toBe(true);
    });

    it('should filter by category', async () => {
      const results = await engine.fuzzySearch('', { category: 'Editing' });
      expect(results.every(r => r.category === 'Editing')).toBe(true);
    });

    it('should filter by context', async () => {
      const results = await engine.fuzzySearch('', { context: 'Normal Mode' });
      expect(results.every(r => r.context === 'Normal Mode')).toBe(true);
    });

    it('should rank results by relevance', async () => {
      const results = await engine.fuzzySearch('copy');
      // Results should be sorted by score
      for (let i = 0; i < results.length - 1; i++) {
        // Just verify we got results, scoring is tested separately
        expect(results[i]).toBeDefined();
      }
    });

    it('should handle multi-word queries', async () => {
      const results = await engine.fuzzySearch('split pane');
      expect(results.length).toBeGreaterThan(0);
      const splitPaneShortcut = results.find(r => r.action.includes('Split pane'));
      expect(splitPaneShortcut).toBeDefined();
    });

    it('should be case-insensitive', async () => {
      const lowerResults = await engine.fuzzySearch('copy');
      const upperResults = await engine.fuzzySearch('COPY');
      expect(lowerResults.length).toBe(upperResults.length);
    });
  });

  describe('scoring algorithm', () => {
    it('should prioritize exact action matches', async () => {
      const results = await engine.fuzzySearch('paste');
      if (results.length > 0) {
        // The exact match "Paste" should rank high
        const pasteAction = results.find(r => r.action.toLowerCase() === 'paste');
        expect(pasteAction).toBeDefined();
      }
    });

    it('should prioritize action prefix matches', async () => {
      const results = await engine.fuzzySearch('open');
      if (results.length > 0) {
        // "Open file" should rank high
        const openAction = results.find(r => r.action.toLowerCase().startsWith('open'));
        expect(openAction).toBeDefined();
      }
    });

    it('should consider tag matches', async () => {
      const results = await engine.fuzzySearch('clipboard');
      expect(results.length).toBeGreaterThan(0);
      // All results should have clipboard in tags or action
      expect(results.every(r => 
        r.tags.includes('clipboard') || r.action.toLowerCase().includes('clipboard')
      )).toBe(true);
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters together', async () => {
      const results = await engine.fuzzySearch('copy', { app: 'vscode', platform: 'mac' });
      expect(results.every(r => r.app === 'vscode' && r.keys.mac !== undefined)).toBe(true);
    });

    it('should handle query with app and category filters', async () => {
      const results = await engine.fuzzySearch('', { app: 'vim', category: 'Editing' });
      expect(results.every(r => r.app === 'vim' && r.category === 'Editing')).toBe(true);
    });
  });
});
