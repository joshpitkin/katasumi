import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Shortcut, Platform, DatabaseAdapter } from '@katasumi/core';
import { SQLiteAdapter, KeywordSearchEngine } from '@katasumi/core';
import { useAppStore } from '../store.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FullPhraseModeProps {
  aiEnabled: boolean;
  view: 'search' | 'results' | 'detail';
}

interface GroupedResult {
  app: string;
  shortcuts: Shortcut[];
}

// Singleton database adapter
let dbAdapter: DatabaseAdapter | null = null;

function getDbAdapter(): DatabaseAdapter {
  if (!dbAdapter) {
    // Resolve path from the monorepo root
    const possiblePaths = [
      path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(__dirname, '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
      path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
    ];

    let coreDbPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!coreDbPath) {
      console.error('❌ Core database not found.');
      coreDbPath = ':memory:';
    }

    const userDbPath = path.join(process.env.HOME || '~', '.katasumi', 'user-data.db');
    dbAdapter = new SQLiteAdapter(coreDbPath, userDbPath);
  }
  return dbAdapter;
}

export function FullPhraseMode({ aiEnabled, view }: FullPhraseModeProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Shortcut[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const platform = useAppStore((state) => state.platform);

  // Handle keyboard input for the search field
  useInput((input, key) => {
    if (key.return) {
      // Trigger search on Enter
      if (query.trim().length > 0) {
        performSearch(query);
      }
    } else if (key.backspace || key.delete) {
      // Handle backspace
      setQuery(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input.length === 1) {
      // Handle regular character input
      setQuery(prev => prev + input);
    }
  });

  // Auto-search with debounce
  useEffect(() => {
    if (query.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        performSearch(query);
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query, aiEnabled, platform]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const adapter = getDbAdapter();
      const searchEngine = new KeywordSearchEngine(adapter);
      
      // Use keyword search for now (AI search would go here if aiEnabled)
      const searchResults = await searchEngine.fuzzySearch(
        searchQuery,
        { platform },
        30 // Get top 30 results across all apps
      );
      
      setResults(searchResults);
    } catch (error) {
      console.error('Error performing search:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Group results by app
  const groupResultsByApp = (shortcuts: Shortcut[]): GroupedResult[] => {
    const grouped = shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.app]) {
        acc[shortcut.app] = [];
      }
      acc[shortcut.app].push(shortcut);
      return acc;
    }, {} as Record<string, Shortcut[]>);

    return Object.entries(grouped).map(([app, shortcuts]) => ({
      app,
      shortcuts,
    }));
  };

  const getKeysForPlatform = (shortcut: Shortcut): string => {
    switch (platform) {
      case 'mac':
        return shortcut.keys.mac || shortcut.keys.linux || shortcut.keys.windows || 'N/A';
      case 'windows':
        return shortcut.keys.windows || shortcut.keys.linux || 'N/A';
      case 'linux':
        return shortcut.keys.linux || shortcut.keys.windows || 'N/A';
      default:
        return 'N/A';
    }
  };

  if (view === 'search' || view === 'results') {
    const groupedResults = groupResultsByApp(results);

    return (
      <Box flexDirection="column" marginY={1}>
        {/* Search Input Box */}
        <Box
          flexDirection="column"
          borderStyle="single"
          paddingX={2}
          paddingY={1}
        >
          <Text bold>Search across all apps</Text>
          <Box marginTop={1}>
            <Text dimColor>Type to search, press Enter to trigger search manually</Text>
          </Box>
          <Box marginTop={1}>
            <Text>Query: </Text>
            <Text bold color="cyan">{query || '_'}</Text>
          </Box>
        </Box>

        {/* AI Status Indicator */}
        <Box marginTop={1} paddingX={2}>
          {aiEnabled ? (
            <Text color="green">
              💡 AI Insight: Results are ranked by AI for better relevance
            </Text>
          ) : (
            <Text color="yellow">
              ⚡ Keyword search only - exact matches and fuzzy search
            </Text>
          )}
        </Box>

        {/* Results */}
        {isSearching ? (
          <Box marginTop={1} paddingX={2}>
            <Text dimColor>Searching...</Text>
          </Box>
        ) : results.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            {groupedResults.map((group) => (
              <Box key={group.app} flexDirection="column" marginBottom={1}>
                <Box borderStyle="single" paddingX={1}>
                  <Text bold color="cyan">
                    {group.app}
                  </Text>
                </Box>
                <Box flexDirection="column" paddingX={2}>
                  {group.shortcuts.slice(0, 3).map((shortcut) => {
                    const keys = getKeysForPlatform(shortcut);
                    const context = shortcut.context ? `[${shortcut.context}]` : '';
                    
                    return (
                      <Box key={shortcut.id}>
                        <Box width={25}>
                          <Text color="yellow">{keys}</Text>
                        </Box>
                        <Box width={40}>
                          <Text>{shortcut.action}</Text>
                        </Box>
                        {context && (
                          <Box>
                            <Text dimColor>{context}</Text>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                  {group.shortcuts.length > 3 && (
                    <Text dimColor>
                      ... and {group.shortcuts.length - 3} more from {group.app}
                    </Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : query.trim().length > 0 ? (
          <Box marginTop={1} paddingX={2}>
            <Text dimColor>No results found for "{query}"</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  return null;
}
