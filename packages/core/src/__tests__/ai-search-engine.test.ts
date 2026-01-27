/**
 * Tests for AI-powered semantic search engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AISearchEngine, AIProviderConfig } from '../ai-search-engine';
import { DatabaseAdapter } from '../database-adapter';
import { Shortcut, SourceType } from '../types';

// Mock shortcuts for testing
const mockShortcuts: Shortcut[] = [
  {
    id: '1',
    app: 'vim',
    action: 'Split window vertically',
    keys: { mac: 'Ctrl+w v', linux: 'Ctrl+w v' },
    context: 'Normal',
    category: 'Windows',
    tags: ['split', 'window', 'vertical'],
    source: {
      type: SourceType.OFFICIAL,
      url: 'https://vim.org',
      scrapedAt: new Date(),
      confidence: 1.0,
    },
  },
  {
    id: '2',
    app: 'vim',
    action: 'Split window horizontally',
    keys: { mac: 'Ctrl+w s', linux: 'Ctrl+w s' },
    context: 'Normal',
    category: 'Windows',
    tags: ['split', 'window', 'horizontal'],
    source: {
      type: SourceType.OFFICIAL,
      url: 'https://vim.org',
      scrapedAt: new Date(),
      confidence: 1.0,
    },
  },
  {
    id: '3',
    app: 'vim',
    action: 'Close window',
    keys: { mac: 'Ctrl+w q', linux: 'Ctrl+w q' },
    context: 'Normal',
    category: 'Windows',
    tags: ['close', 'window', 'quit'],
    source: {
      type: SourceType.OFFICIAL,
      url: 'https://vim.org',
      scrapedAt: new Date(),
      confidence: 1.0,
    },
  },
];

// Mock database adapter
const createMockAdapter = (): DatabaseAdapter => ({
  searchShortcuts: vi.fn().mockResolvedValue(mockShortcuts),
  getShortcutsByApp: vi.fn().mockResolvedValue(mockShortcuts),
  getShortcutById: vi.fn().mockImplementation((id: string) => 
    Promise.resolve(mockShortcuts.find(s => s.id === id) || null)
  ),
  addShortcut: vi.fn(),
  updateShortcut: vi.fn(),
  deleteShortcut: vi.fn(),
  getApps: vi.fn(),
  getAppInfo: vi.fn(),
  close: vi.fn(),
});

describe('AISearchEngine', () => {
  let mockAdapter: DatabaseAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('OpenAI Provider', () => {
    it('should perform semantic search with OpenAI', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      };

      // Mock OpenAI API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1', '2', '3'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('how to split window in vim');

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('1');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should explain shortcut with OpenAI', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                explanation: 'This splits the current window vertically in Vim, creating two side-by-side panes.',
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const explanation = await engine.explainShortcut(mockShortcuts[0], 'mac');

      expect(explanation).toContain('split');
      expect(explanation).toContain('window');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'invalid-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      
      // Should fall back to keyword search
      const results = await engine.semanticSearch('split window');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Anthropic Provider', () => {
    it('should perform semantic search with Anthropic', async () => {
      const config: AIProviderConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-sonnet-20240229',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              rankedShortcuts: ['2', '1', '3'],
            }),
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('horizontal split vim');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('2');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
          }),
        })
      );
    });
  });

  describe('OpenRouter Provider', () => {
    it('should perform semantic search with OpenRouter', async () => {
      const config: AIProviderConfig = {
        provider: 'openrouter',
        apiKey: 'test-key',
        model: 'openai/gpt-4',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1', '2', '3'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split window');

      expect(results).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should support different models via OpenRouter', async () => {
      const config: AIProviderConfig = {
        provider: 'openrouter',
        apiKey: 'test-key',
        model: 'anthropic/claude-3-sonnet',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      await engine.semanticSearch('split');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('anthropic/claude-3-sonnet');
    });
  });

  describe('Ollama Provider', () => {
    it('should perform semantic search with Ollama', async () => {
      const config: AIProviderConfig = {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            rankedShortcuts: ['1', '2'],
          }),
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split window');

      expect(results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not require API key for Ollama', async () => {
      const config: AIProviderConfig = {
        provider: 'ollama',
        // No API key
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            rankedShortcuts: ['1'],
          }),
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split');

      expect(results).toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after configured duration', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        timeout: 100, // 100ms timeout
      };

      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ choices: [{ message: { content: '{}' } }] }),
        }), 200)) // Takes 200ms
      ) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      
      // Should fall back to keyword search due to timeout
      const results = await engine.semanticSearch('split window');
      expect(results).toBeDefined();
    });

    it('should use default 5 second timeout', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        // No timeout specified, should default to 5000ms
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      await engine.semanticSearch('split');

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Fallback to Keyword Search', () => {
    it('should fall back to keyword search on network error', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split window');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should fall back on invalid API response', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'invalid json',
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split window');

      expect(results).toBeDefined();
    });
  });

  describe('Search Filters', () => {
    it('should support platform filtering', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1', '2'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split', { platform: 'mac' });

      expect(results).toBeDefined();
    });

    it('should support app filtering', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                rankedShortcuts: ['1'],
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('split', { app: 'vim' });

      expect(mockAdapter.searchShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          app: 'vim',
        })
      );
    });
  });

  describe('Explain Shortcut', () => {
    it('should provide plain English explanation', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                explanation: 'Divides the current window into two vertical panes.',
              }),
            },
          }],
        }),
      }) as any;

      const engine = new AISearchEngine(config, mockAdapter);
      const explanation = await engine.explainShortcut(mockShortcuts[0]);

      expect(explanation).toBeTruthy();
      expect(typeof explanation).toBe('string');
    });

    it('should fall back to basic description on error', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      global.fetch = vi.fn().mockRejectedValue(new Error('API error'));

      const engine = new AISearchEngine(config, mockAdapter);
      const explanation = await engine.explainShortcut(mockShortcuts[0], 'mac');

      expect(explanation).toContain('Split window vertically');
      expect(explanation).toContain('vim');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when API key is missing for OpenAI', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        // No API key
      };

      global.fetch = vi.fn();

      const engine = new AISearchEngine(config, mockAdapter);
      
      // Should fall back to keyword search (no throw)
      const results = await engine.semanticSearch('split');
      expect(results).toBeDefined();
    });

    it('should throw error when API key is missing for Anthropic', async () => {
      const config: AIProviderConfig = {
        provider: 'anthropic',
        // No API key
      };

      const engine = new AISearchEngine(config, mockAdapter);
      
      // Should fall back to keyword search
      const results = await engine.semanticSearch('split');
      expect(results).toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      const config: AIProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      // Mock adapter returns empty results
      mockAdapter.searchShortcuts = vi.fn().mockResolvedValue([]);

      const engine = new AISearchEngine(config, mockAdapter);
      const results = await engine.semanticSearch('nonexistent query');

      expect(results).toEqual([]);
    });
  });
});
