import { describe, it, expect } from 'vitest';
import { Shortcut, AppInfo, Keys, Source, Platform, SourceType } from '../types';

describe('Types', () => {
  describe('SourceType enum', () => {
    it('should have correct values', () => {
      expect(SourceType.OFFICIAL).toBe('official');
      expect(SourceType.COMMUNITY).toBe('community');
      expect(SourceType.AI_SCRAPED).toBe('ai-scraped');
      expect(SourceType.USER_ADDED).toBe('user-added');
    });
  });

  describe('Keys interface', () => {
    it('should allow optional platform keys', () => {
      const keys1: Keys = { mac: 'Cmd+C' };
      const keys2: Keys = { windows: 'Ctrl+C' };
      const keys3: Keys = { linux: 'Ctrl+C' };
      const keys4: Keys = { mac: 'Cmd+C', windows: 'Ctrl+C', linux: 'Ctrl+C' };
      
      expect(keys1.mac).toBe('Cmd+C');
      expect(keys2.windows).toBe('Ctrl+C');
      expect(keys3.linux).toBe('Ctrl+C');
      expect(keys4.mac).toBe('Cmd+C');
    });

    it('should allow empty keys object', () => {
      const keys: Keys = {};
      expect(keys).toBeDefined();
    });
  });

  describe('Source interface', () => {
    it('should contain all required fields', () => {
      const source: Source = {
        type: SourceType.OFFICIAL,
        url: 'https://example.com',
        scrapedAt: new Date(),
        confidence: 1.0,
      };

      expect(source.type).toBe(SourceType.OFFICIAL);
      expect(source.url).toBe('https://example.com');
      expect(source.scrapedAt).toBeInstanceOf(Date);
      expect(source.confidence).toBe(1.0);
    });

    it('should accept different source types', () => {
      const official: Source = {
        type: SourceType.OFFICIAL,
        url: 'https://example.com',
        scrapedAt: new Date(),
        confidence: 1.0,
      };

      const community: Source = {
        type: SourceType.COMMUNITY,
        url: 'https://example.com',
        scrapedAt: new Date(),
        confidence: 0.9,
      };

      const aiScraped: Source = {
        type: SourceType.AI_SCRAPED,
        url: 'https://example.com',
        scrapedAt: new Date(),
        confidence: 0.7,
      };

      const userAdded: Source = {
        type: SourceType.USER_ADDED,
        url: '',
        scrapedAt: new Date(),
        confidence: 1.0,
      };

      expect(official.type).toBe(SourceType.OFFICIAL);
      expect(community.type).toBe(SourceType.COMMUNITY);
      expect(aiScraped.type).toBe(SourceType.AI_SCRAPED);
      expect(userAdded.type).toBe(SourceType.USER_ADDED);
    });
  });

  describe('Shortcut interface', () => {
    it('should contain all required fields', () => {
      const shortcut: Shortcut = {
        id: '1',
        app: 'vscode',
        action: 'Copy line',
        keys: { mac: 'Cmd+C', windows: 'Ctrl+C' },
        tags: ['copy', 'clipboard'],
        source: {
          type: SourceType.OFFICIAL,
          url: 'https://code.visualstudio.com',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      expect(shortcut.id).toBe('1');
      expect(shortcut.app).toBe('vscode');
      expect(shortcut.action).toBe('Copy line');
      expect(shortcut.keys.mac).toBe('Cmd+C');
      expect(shortcut.tags).toEqual(['copy', 'clipboard']);
    });

    it('should allow optional fields', () => {
      const shortcut: Shortcut = {
        id: '1',
        app: 'vim',
        action: 'Copy line',
        keys: { mac: 'yy' },
        context: 'Normal Mode',
        category: 'Editing',
        tags: ['copy'],
      };

      expect(shortcut.context).toBe('Normal Mode');
      expect(shortcut.category).toBe('Editing');
      expect(shortcut.source).toBeUndefined();
    });

    it('should handle shortcuts without optional fields', () => {
      const shortcut: Shortcut = {
        id: '1',
        app: 'test',
        action: 'Test action',
        keys: { mac: 'Cmd+T' },
        tags: [],
      };

      expect(shortcut.context).toBeUndefined();
      expect(shortcut.category).toBeUndefined();
      expect(shortcut.source).toBeUndefined();
    });

    it('should allow empty tags array', () => {
      const shortcut: Shortcut = {
        id: '1',
        app: 'test',
        action: 'Test',
        keys: {},
        tags: [],
      };

      expect(Array.isArray(shortcut.tags)).toBe(true);
      expect(shortcut.tags.length).toBe(0);
    });
  });

  describe('AppInfo interface', () => {
    it('should contain all required fields', () => {
      const app: AppInfo = {
        id: '1',
        name: 'vscode',
        displayName: 'Visual Studio Code',
        category: 'Code Editor',
        platforms: ['mac', 'windows', 'linux'],
        shortcutCount: 223,
      };

      expect(app.id).toBe('1');
      expect(app.name).toBe('vscode');
      expect(app.displayName).toBe('Visual Studio Code');
      expect(app.category).toBe('Code Editor');
      expect(app.platforms).toEqual(['mac', 'windows', 'linux']);
      expect(app.shortcutCount).toBe(223);
    });

    it('should accept different platform combinations', () => {
      const macOnly: AppInfo = {
        id: '1',
        name: 'safari',
        displayName: 'Safari',
        category: 'Browser',
        platforms: ['mac'],
        shortcutCount: 50,
      };

      const windowsLinux: AppInfo = {
        id: '2',
        name: 'app',
        displayName: 'App',
        category: 'Tool',
        platforms: ['windows', 'linux'],
        shortcutCount: 30,
      };

      expect(macOnly.platforms).toEqual(['mac']);
      expect(windowsLinux.platforms).toEqual(['windows', 'linux']);
    });

    it('should allow empty platforms array', () => {
      const app: AppInfo = {
        id: '1',
        name: 'test',
        displayName: 'Test',
        category: 'Test',
        platforms: [],
        shortcutCount: 0,
      };

      expect(app.platforms).toEqual([]);
    });
  });

  describe('Platform type', () => {
    it('should accept valid platform values', () => {
      const mac: Platform = 'mac';
      const windows: Platform = 'windows';
      const linux: Platform = 'linux';

      expect(mac).toBe('mac');
      expect(windows).toBe('windows');
      expect(linux).toBe('linux');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize Shortcut to JSON', () => {
      const shortcut: Shortcut = {
        id: '1',
        app: 'test',
        action: 'Test action',
        keys: { mac: 'Cmd+T' },
        category: 'Test',
        tags: ['test'],
        source: {
          type: SourceType.OFFICIAL,
          url: 'https://example.com',
          scrapedAt: new Date('2026-01-01'),
          confidence: 1.0,
        },
      };

      const json = JSON.stringify(shortcut);
      expect(json).toContain('"id":"1"');
      expect(json).toContain('"app":"test"');
      expect(json).toContain('"action":"Test action"');
    });

    it('should deserialize JSON to Shortcut', () => {
      const json = JSON.stringify({
        id: '1',
        app: 'test',
        action: 'Test',
        keys: { mac: 'Cmd+T' },
        tags: ['test'],
      });

      const shortcut = JSON.parse(json) as Shortcut;
      expect(shortcut.id).toBe('1');
      expect(shortcut.app).toBe('test');
      expect(shortcut.keys.mac).toBe('Cmd+T');
      expect(shortcut.tags).toEqual(['test']);
    });
  });

  describe('Type validation', () => {
    it('should validate Shortcut structure', () => {
      const shortcut: Shortcut = {
        id: '123',
        app: 'vim',
        action: 'Delete line',
        keys: { mac: 'dd', linux: 'dd' },
        context: 'Normal Mode',
        category: 'Editing',
        tags: ['delete', 'line'],
        source: {
          type: SourceType.OFFICIAL,
          url: 'https://vim.org',
          scrapedAt: new Date(),
          confidence: 1.0,
        },
      };

      // Verify all fields are accessible and have correct types
      expect(typeof shortcut.id).toBe('string');
      expect(typeof shortcut.app).toBe('string');
      expect(typeof shortcut.action).toBe('string');
      expect(typeof shortcut.keys).toBe('object');
      expect(typeof shortcut.context).toBe('string');
      expect(typeof shortcut.category).toBe('string');
      expect(Array.isArray(shortcut.tags)).toBe(true);
      expect(typeof shortcut.source).toBe('object');
    });

    it('should validate AppInfo structure', () => {
      const app: AppInfo = {
        id: 'vim-id',
        name: 'vim',
        displayName: 'Vim',
        category: 'Text Editor',
        platforms: ['mac', 'linux', 'windows'],
        shortcutCount: 125,
      };

      expect(typeof app.id).toBe('string');
      expect(typeof app.name).toBe('string');
      expect(typeof app.displayName).toBe('string');
      expect(typeof app.category).toBe('string');
      expect(Array.isArray(app.platforms)).toBe(true);
      expect(typeof app.shortcutCount).toBe('number');
    });
  });
});
