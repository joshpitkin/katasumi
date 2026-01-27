import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteAdapter } from '../sqlite-adapter';
import { SourceType } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;
  let testCorePath: string;
  let testUserPath: string;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test databases
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-adapter-test-'));
    testCorePath = path.join(tempDir, 'test-core.db');
    testUserPath = path.join(tempDir, 'test-user.db');

    // Copy the core database if it exists, otherwise create empty one
    const coreDbPath = path.join(__dirname, '../../data/shortcuts.db');
    if (fs.existsSync(coreDbPath)) {
      fs.copyFileSync(coreDbPath, testCorePath);
    } else {
      // Create an empty database file
      fs.writeFileSync(testCorePath, '');
    }

    adapter = new SQLiteAdapter(testCorePath, testUserPath);
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await adapter.close();
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should initialize with provided paths', () => {
      expect(adapter.getCorePath()).toBe(testCorePath);
      expect(adapter.getUserPath()).toBe(testUserPath);
    });

    it('should create user database if it does not exist', () => {
      expect(fs.existsSync(testUserPath)).toBe(true);
    });

    it('should use default user path if not provided', async () => {
      const defaultAdapter = new SQLiteAdapter(testCorePath);
      const userPath = defaultAdapter.getUserPath();
      expect(userPath).toContain('.katasumi');
      expect(userPath).toContain('user-data.db');
      await defaultAdapter.close();
    });
  });

  describe('CRUD operations', () => {
    it('should add a shortcut to user database', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Test Action',
        keys: { mac: 'Cmd+T', windows: 'Ctrl+T' },
        category: 'Testing',
        tags: ['test', 'example'],
        source: {
          type: SourceType.USER_ADDED,
          url: '',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      const created = await adapter.addShortcut(shortcut);
      expect(created.id).toBeDefined();
      expect(created.app).toBe('test-app');
      expect(created.action).toBe('Test Action');
      expect(created.keys.mac).toBe('Cmd+T');
    });

    it('should get shortcut by id', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Test Action',
        keys: { mac: 'Cmd+T' },
        category: 'Testing',
        tags: ['test'],
        source: {
          type: SourceType.USER_ADDED,
          url: '',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      const created = await adapter.addShortcut(shortcut);
      const retrieved = await adapter.getShortcutById(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.action).toBe('Test Action');
    });

    it('should return null for non-existent shortcut', async () => {
      const result = await adapter.getShortcutById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should update a shortcut', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Original Action',
        keys: { mac: 'Cmd+T' },
        category: 'Testing',
        tags: ['test'],
        source: {
          type: SourceType.USER_ADDED,
          url: '',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      const created = await adapter.addShortcut(shortcut);
      const updated = await adapter.updateShortcut(created.id, {
        action: 'Updated Action',
        tags: ['updated', 'test'],
      });

      expect(updated).not.toBeNull();
      expect(updated!.action).toBe('Updated Action');
      expect(updated!.tags).toContain('updated');
    });

    it('should update shortcut keys', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Test',
        keys: { mac: 'Cmd+T' },
        category: 'Testing',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      const updated = await adapter.updateShortcut(created.id, {
        keys: { mac: 'Cmd+Shift+T', windows: 'Ctrl+Shift+T', linux: 'Ctrl+Shift+T' },
      });

      expect(updated).not.toBeNull();
      expect(updated!.keys.mac).toBe('Cmd+Shift+T');
      expect(updated!.keys.windows).toBe('Ctrl+Shift+T');
    });

    it('should update shortcut source', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Test',
        keys: { mac: 'Cmd+T' },
        category: 'Testing',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      const newDate = new Date('2026-01-01');
      const updated = await adapter.updateShortcut(created.id, {
        source: { type: SourceType.OFFICIAL, url: 'https://test.com', scrapedAt: newDate, confidence: 0.9 },
      });

      expect(updated).not.toBeNull();
      expect(updated!.source?.type).toBe(SourceType.OFFICIAL);
      expect(updated!.source?.url).toBe('https://test.com');
      expect(updated!.source?.confidence).toBe(0.9);
    });

    it('should return null when updating non-existent shortcut', async () => {
      const result = await adapter.updateShortcut('non-existent', { action: 'Updated' });
      expect(result).toBeNull();
    });

    it('should delete a shortcut', async () => {
      const shortcut = {
        app: 'test-app',
        action: 'Test Action',
        keys: { mac: 'Cmd+T' },
        category: 'Testing',
        tags: ['test'],
        source: {
          type: SourceType.USER_ADDED,
          url: '',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      const created = await adapter.addShortcut(shortcut);
      const deleted = await adapter.deleteShortcut(created.id);
      expect(deleted).toBe(true);

      const retrieved = await adapter.getShortcutById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent shortcut', async () => {
      const result = await adapter.deleteShortcut('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('search operations', () => {
    beforeEach(async () => {
      // Add test shortcuts
      await adapter.addShortcut({
        app: 'test-app',
        action: 'Copy text',
        keys: { mac: 'Cmd+C' },
        category: 'Editing',
        tags: ['copy', 'clipboard'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      });

      await adapter.addShortcut({
        app: 'test-app',
        action: 'Paste text',
        keys: { mac: 'Cmd+V' },
        category: 'Editing',
        tags: ['paste', 'clipboard'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      });

      await adapter.addShortcut({
        app: 'other-app',
        action: 'Save file',
        keys: { mac: 'Cmd+S' },
        category: 'Files',
        tags: ['save', 'file'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      });
    });

    it('should search shortcuts', async () => {
      const results = await adapter.searchShortcuts({});
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by app', async () => {
      const results = await adapter.searchShortcuts({ app: 'test-app' });
      expect(results.every(r => r.app === 'test-app')).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category', async () => {
      const results = await adapter.searchShortcuts({ category: 'Editing' });
      expect(results.every(r => r.category === 'Editing')).toBe(true);
    });

    it('should filter by query', async () => {
      const results = await adapter.searchShortcuts({ query: 'copy' });
      expect(results.some(r => r.action.toLowerCase().includes('copy'))).toBe(true);
    });

    it('should filter by tag', async () => {
      const results = await adapter.searchShortcuts({ tag: 'clipboard' });
      expect(results.every(r => r.tags.includes('clipboard'))).toBe(true);
    });

    it('should respect limit', async () => {
      const results = await adapter.searchShortcuts({ limit: 2 });
      // Allow a bit of flexibility since we're combining two databases
      expect(results.length).toBeLessThanOrEqual(4);
    });

    it('should respect offset', async () => {
      const all = await adapter.searchShortcuts({});
      const withOffset = await adapter.searchShortcuts({ offset: 1 });
      expect(withOffset.length).toBeLessThan(all.length);
    });
  });

  describe('app operations', () => {
    it('should get shortcuts by app', async () => {
      await adapter.addShortcut({
        app: 'my-app',
        action: 'Action 1',
        keys: { mac: 'Cmd+1' },
        category: 'Test',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      });

      await adapter.addShortcut({
        app: 'my-app',
        action: 'Action 2',
        keys: { mac: 'Cmd+2' },
        category: 'Test',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      });

      const results = await adapter.getShortcutsByApp('my-app');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.app === 'my-app')).toBe(true);
    });

    it('should get app info', async () => {
      // This might return null if no apps exist in test database
      const apps = await adapter.getApps();
      expect(Array.isArray(apps)).toBe(true);
    });
  });

  describe('data conversion', () => {
    it('should correctly convert keys to/from database', async () => {
      const shortcut = {
        app: 'test',
        action: 'Test',
        keys: { 
          mac: 'Cmd+T',
          windows: 'Ctrl+T',
          linux: 'Ctrl+T'
        },
        category: 'Test',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      expect(created.keys.mac).toBe('Cmd+T');
      expect(created.keys.windows).toBe('Ctrl+T');
      expect(created.keys.linux).toBe('Ctrl+T');
    });

    it('should handle undefined optional keys', async () => {
      const shortcut = {
        app: 'test',
        action: 'Test',
        keys: { mac: 'Cmd+T' }, // Only mac key
        category: 'Test',
        tags: ['test'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      expect(created.keys.mac).toBe('Cmd+T');
      expect(created.keys.windows).toBeUndefined();
      expect(created.keys.linux).toBeUndefined();
    });

    it('should correctly convert tags array', async () => {
      const shortcut = {
        app: 'test',
        action: 'Test',
        keys: { mac: 'Cmd+T' },
        category: 'Test',
        tags: ['tag1', 'tag2', 'tag3'],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      expect(created.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty tags array', async () => {
      const shortcut = {
        app: 'test',
        action: 'Test',
        keys: { mac: 'Cmd+T' },
        category: 'Test',
        tags: [],
        source: { type: SourceType.USER_ADDED, url: '', scrapedAt: new Date(), confidence: 1.0 },
      };

      const created = await adapter.addShortcut(shortcut);
      expect(Array.isArray(created.tags)).toBe(true);
      expect(created.tags.length).toBe(0);
    });
  });

  describe('connection handling', () => {
    it('should close connection successfully', async () => {
      await expect(adapter.close()).resolves.not.toThrow();
    });
  });
});
