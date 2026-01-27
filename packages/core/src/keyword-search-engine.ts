/**
 * Keyword-based fuzzy search engine for shortcuts
 */

import { DatabaseAdapter, SearchOptions } from './database-adapter';
import { Shortcut, Platform } from './types';

export interface SearchFilters {
  /** Filter by application */
  app?: string;
  /** Filter by platform */
  platform?: Platform;
  /** Filter by category */
  category?: string;
  /** Filter by context */
  context?: string;
}

export interface ScoredShortcut {
  shortcut: Shortcut;
  score: number;
}

/**
 * Keyword-based search engine with fuzzy matching and ranking
 */
export class KeywordSearchEngine {
  constructor(private adapter: DatabaseAdapter) {}

  /**
   * Perform fuzzy search on shortcuts with filtering and ranking
   * @param query Search query string
   * @param filters Optional filters for app, platform, category, context
   * @param limit Maximum number of results to return (default: 50)
   * @returns Ranked array of shortcuts sorted by relevance score
   */
  async fuzzySearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<Shortcut[]> {
    // Get all shortcuts from the database
    const searchOptions: SearchOptions = {
      app: filters?.app,
      category: filters?.category,
      limit: 10000, // Get all for now, we'll score and filter
    };

    let shortcuts = await this.adapter.searchShortcuts(searchOptions);

    // Apply platform filter if specified
    if (filters?.platform) {
      const platform = filters.platform;
      shortcuts = shortcuts.filter(s => {
        return s.keys[platform] !== undefined && s.keys[platform] !== null;
      });
    }

    // Apply context filter if specified
    if (filters?.context) {
      shortcuts = shortcuts.filter(s => s.context === filters.context);
    }

    // If query is empty, return top results by popularity (or first N)
    if (!query || query.trim() === '') {
      return shortcuts.slice(0, limit);
    }

    // Score each shortcut based on query relevance
    const scoredShortcuts = shortcuts.map(shortcut => ({
      shortcut,
      score: this.scoreShortcut(shortcut, query.toLowerCase().trim()),
    }));

    // Filter out shortcuts with score 0
    const relevantShortcuts = scoredShortcuts.filter(s => s.score > 0);

    // Sort by score descending
    relevantShortcuts.sort((a, b) => b.score - a.score);

    // Return top N results
    return relevantShortcuts.slice(0, limit).map(s => s.shortcut);
  }

  /**
   * Calculate relevance score for a shortcut based on query
   * @param shortcut Shortcut to score
   * @param query Normalized query string (lowercase)
   * @returns Score from 0.0 to 1.0
   */
  private scoreShortcut(shortcut: Shortcut, query: string): number {
    const action = shortcut.action.toLowerCase();
    const tags = shortcut.tags.map(t => t.toLowerCase());
    
    let score = 0;

    // 1. Exact action match: 1.0
    if (action === query) {
      return 1.0;
    }

    // 2. Action starts with query: 0.8
    if (action.startsWith(query)) {
      score = Math.max(score, 0.8);
    }

    // 3. Tag exact match: 0.7
    for (const tag of tags) {
      if (tag === query) {
        score = Math.max(score, 0.7);
      }
    }

    // 4. Query appears in action as substring: 0.6
    if (action.includes(query)) {
      score = Math.max(score, 0.6);
    }

    // 5. All query words appear in action: 0.5
    const queryWords = query.split(/\s+/);
    const allWordsInAction = queryWords.every(word => action.includes(word));
    if (allWordsInAction && queryWords.length > 1) {
      score = Math.max(score, 0.5);
    }

    // 6. Tag contains query as substring: 0.45
    for (const tag of tags) {
      if (tag.includes(query)) {
        score = Math.max(score, 0.45);
      }
    }

    // 7. Fuzzy match in action: 0.3-0.4 based on similarity
    const fuzzyScore = this.calculateFuzzyScore(action, query);
    if (fuzzyScore > 0.5) {
      score = Math.max(score, 0.3 + (fuzzyScore - 0.5) * 0.2);
    }

    // 8. Any query word in tags: 0.25
    for (const word of queryWords) {
      for (const tag of tags) {
        if (tag.includes(word)) {
          score = Math.max(score, 0.25);
        }
      }
    }

    return score;
  }

  /**
   * Calculate fuzzy similarity score using Levenshtein distance
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score from 0.0 to 1.0
   */
  private calculateFuzzyScore(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    
    // Fill the dp table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,      // deletion
            dp[i][j - 1] + 1,      // insertion
            dp[i - 1][j - 1] + 1   // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }
}
