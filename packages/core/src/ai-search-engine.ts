/**
 * AI-powered semantic search engine for shortcuts
 */

import { DatabaseAdapter } from './database-adapter';
import { Shortcut, Platform } from './types';
import { KeywordSearchEngine, SearchFilters } from './keyword-search-engine';

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama';

export interface AIProviderConfig {
  /** AI provider to use */
  provider: AIProvider;
  /** API key (required for OpenAI, Anthropic, OpenRouter) */
  apiKey?: string;
  /** Model to use (provider-specific) */
  model?: string;
  /** Base URL for API (used by Ollama, can override for other providers) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
}

interface AISearchRequest {
  query: string;
  shortcuts: Shortcut[];
  maxResults?: number;
}

interface AISearchResponse {
  rankedShortcuts: string[]; // Array of shortcut IDs in ranked order
  reasoning?: string;
}

interface AIExplainRequest {
  shortcut: Shortcut;
  platform?: Platform;
}

interface AIExplainResponse {
  explanation: string;
}

/**
 * AI-powered search engine with semantic understanding and natural language processing
 */
export class AISearchEngine {
  private keywordEngine: KeywordSearchEngine;
  private timeout: number;

  constructor(
    private config: AIProviderConfig,
    private adapter: DatabaseAdapter
  ) {
    this.keywordEngine = new KeywordSearchEngine(adapter);
    this.timeout = config.timeout || 5000;
  }

  /**
   * Perform semantic search using AI to understand intent and rank results
   * Falls back to keyword search if AI provider fails
   * 
   * @param query Natural language search query
   * @param filters Optional filters for app, platform, category, context
   * @param limit Maximum number of results to return (default: 10)
   * @returns Ranked array of shortcuts sorted by AI-determined relevance
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 10
  ): Promise<Shortcut[]> {
    try {
      // First get candidate shortcuts using keyword search
      const candidates = await this.keywordEngine.fuzzySearch(query, filters, 50);

      if (candidates.length === 0) {
        return [];
      }

      // Use AI to re-rank the candidates based on semantic understanding
      const rankedIds = await this.rankWithAI(query, candidates, limit);

      // Return shortcuts in AI-determined order
      const idToShortcut = new Map(candidates.map(s => [s.id, s]));
      return rankedIds
        .map(id => idToShortcut.get(id))
        .filter((s): s is Shortcut => s !== undefined)
        .slice(0, limit);
    } catch (error) {
      console.warn('AI search failed, falling back to keyword search:', error);
      // Fallback to keyword search
      return this.keywordEngine.fuzzySearch(query, filters, limit);
    }
  }

  /**
   * Get plain English explanation of what a shortcut does
   * 
   * @param shortcut Shortcut to explain
   * @param platform Platform to explain for (uses first available if not specified)
   * @returns Plain English description of the shortcut's function
   */
  async explainShortcut(shortcut: Shortcut, platform?: Platform): Promise<string> {
    try {
      const response = await this.callAI<AIExplainRequest, AIExplainResponse>({
        shortcut,
        platform,
      }, 'explain');

      return response.explanation;
    } catch (error) {
      // Fallback to basic description
      const keyCombo = platform ? shortcut.keys[platform] : 
        shortcut.keys.mac || shortcut.keys.windows || shortcut.keys.linux;
      
      return `${shortcut.action} in ${shortcut.app}${keyCombo ? ` (${keyCombo})` : ''}`;
    }
  }

  /**
   * Use AI to rank shortcuts by relevance to the query
   */
  private async rankWithAI(
    query: string,
    shortcuts: Shortcut[],
    maxResults: number
  ): Promise<string[]> {
    const request: AISearchRequest = {
      query,
      shortcuts,
      maxResults,
    };

    const response = await this.callAI<AISearchRequest, AISearchResponse>(request, 'search');
    return response.rankedShortcuts;
  }

  /**
   * Make API call to configured AI provider
   */
  private async callAI<TRequest, TResponse>(
    request: TRequest,
    mode: 'search' | 'explain'
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(request, mode, controller.signal);
        case 'anthropic':
          return await this.callAnthropic(request, mode, controller.signal);
        case 'openrouter':
          return await this.callOpenRouter(request, mode, controller.signal);
        case 'ollama':
          return await this.callOllama(request, mode, controller.signal);
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI<TRequest, TResponse>(
    request: TRequest,
    mode: 'search' | 'explain',
    signal: AbortSignal
  ): Promise<TResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const model = this.config.model || 'gpt-4-turbo';

    const prompt = mode === 'search' 
      ? this.buildSearchPrompt(request as any)
      : this.buildExplainPrompt(request as any);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that understands keyboard shortcuts.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return this.parseAIResponse(content, mode);
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic<TRequest, TResponse>(
    request: TRequest,
    mode: 'search' | 'explain',
    signal: AbortSignal
  ): Promise<TResponse> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const model = this.config.model || 'claude-3-sonnet-20240229';

    const prompt = mode === 'search' 
      ? this.buildSearchPrompt(request as any)
      : this.buildExplainPrompt(request as any);

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.content[0]?.text;

    if (!content) {
      throw new Error('No response from Anthropic');
    }

    return this.parseAIResponse(content, mode);
  }

  /**
   * Call OpenRouter API (unified interface for multiple providers)
   */
  private async callOpenRouter<TRequest, TResponse>(
    request: TRequest,
    mode: 'search' | 'explain',
    signal: AbortSignal
  ): Promise<TResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    const baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';
    const model = this.config.model || 'openai/gpt-4-turbo';

    const prompt = mode === 'search' 
      ? this.buildSearchPrompt(request as any)
      : this.buildExplainPrompt(request as any);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://katasumi.dev',
        'X-Title': 'Katasumi',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that understands keyboard shortcuts.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    return this.parseAIResponse(content, mode);
  }

  /**
   * Call Ollama API (local LLM)
   */
  private async callOllama<TRequest, TResponse>(
    request: TRequest,
    mode: 'search' | 'explain',
    signal: AbortSignal
  ): Promise<TResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const model = this.config.model || 'llama2';

    const prompt = mode === 'search' 
      ? this.buildSearchPrompt(request as any)
      : this.buildExplainPrompt(request as any);

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.response;

    if (!content) {
      throw new Error('No response from Ollama');
    }

    return this.parseAIResponse(content, mode);
  }

  /**
   * Build prompt for search ranking
   */
  private buildSearchPrompt(request: AISearchRequest): string {
    const shortcutsDesc = request.shortcuts.map((s, idx) => 
      `${idx}. ID: ${s.id}, Action: ${s.action}, App: ${s.app}, Keys: ${JSON.stringify(s.keys)}, Tags: ${s.tags.join(', ')}`
    ).join('\n');

    return `Given the search query "${request.query}", rank the following keyboard shortcuts by relevance.
Return ONLY a JSON object with a "rankedShortcuts" array containing the shortcut IDs in order of relevance (most relevant first).
Limit to ${request.maxResults || 10} results.

Shortcuts:
${shortcutsDesc}

Response format:
{
  "rankedShortcuts": ["id1", "id2", "id3", ...]
}`;
  }

  /**
   * Build prompt for shortcut explanation
   */
  private buildExplainPrompt(request: AIExplainRequest): string {
    const keyCombo = request.platform 
      ? request.shortcut.keys[request.platform]
      : request.shortcut.keys.mac || request.shortcut.keys.windows || request.shortcut.keys.linux;

    return `Explain what this keyboard shortcut does in plain, simple English (one sentence):

App: ${request.shortcut.app}
Action: ${request.shortcut.action}
Keys: ${keyCombo || 'N/A'}
Context: ${request.shortcut.context || 'Any'}
Tags: ${request.shortcut.tags.join(', ')}

Return ONLY a JSON object with an "explanation" field containing the plain English description.

Response format:
{
  "explanation": "Your explanation here"
}`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse<TResponse>(content: string, mode: 'search' | 'explain'): TResponse {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (mode === 'search') {
        if (!parsed.rankedShortcuts || !Array.isArray(parsed.rankedShortcuts)) {
          throw new Error('Invalid search response format');
        }
      } else if (mode === 'explain') {
        if (!parsed.explanation || typeof parsed.explanation !== 'string') {
          throw new Error('Invalid explain response format');
        }
      }

      return parsed as TResponse;
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }
}
