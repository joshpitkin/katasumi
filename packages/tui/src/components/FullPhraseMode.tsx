import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Shortcut, Platform } from '@katasumi/core';
import { KeywordSearchEngine } from '@katasumi/core';
import { useAppStore } from '../store.js';
import type { PlatformOption } from '../store.js';
import { DetailView } from './DetailView.js';
import { logError, getUserFriendlyMessage } from '../utils/error-logger.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { getDbAdapter } from '../utils/db-adapter.js';
import { loadConfig } from '../utils/config.js';

const API_BASE_URL = process.env.KATASUMI_API_URL || 'https://www.katasumi.dev';

interface FullPhraseModeProps {
  aiEnabled: boolean;
  view: 'search' | 'results' | 'detail';
}

interface GroupedResult {
  app: string;
  shortcuts: Shortcut[];
}

export function FullPhraseMode({ aiEnabled, view }: FullPhraseModeProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Shortcut[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(true); // Track if input is focused
  const [atBoundary, setAtBoundary] = useState<'top' | 'bottom' | null>(null);
  const platform = useAppStore((state) => state.platform);
  const selectedShortcut = useAppStore((state) => state.selectedShortcut);
  const selectShortcut = useAppStore((state) => state.selectShortcut);
  const setInputMode = useAppStore((state) => state.setInputMode);
  
  const terminalSize = useTerminalSize();

  // Set input mode based on whether input is focused
  useEffect(() => {
    setInputMode(isInputFocused && view !== 'detail');
  }, [isInputFocused, view, setInputMode]);

  // Handle keyboard input for the search field
  useInput((input, key) => {
    if (view === 'detail') {
      // Let DetailView handle input when in detail view
      return;
    }

    const maxVisibleResults = terminalSize.availableRows;
    const halfPage = Math.floor(maxVisibleResults / 2);
    const fullPage = maxVisibleResults;

    // Clear boundary feedback after a short delay
    const clearBoundary = () => {
      setTimeout(() => setAtBoundary(null), 1000);
    };

    // Escape key: unfocus input (exit input mode) without clearing query
    if (key.escape) {
      setIsInputFocused(false);
      return;
    }

    // Slash key: focus input (enter input mode) when NOT in input mode
    if (input === '/' && !isInputFocused) {
      setIsInputFocused(true);
      return;
    }

    // Only handle input when in input mode
    if (!isInputFocused) {
      // In navigation mode, handle page navigation and arrow keys
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(results.length - 1, prev + 1));
      } else if (key.ctrl && input === 'u') {
        // Ctrl+U: Scroll up half page
        const newIndex = Math.max(0, selectedIndex - halfPage);
        if (newIndex === 0 && selectedIndex === 0) {
          setAtBoundary('top');
          clearBoundary();
        }
        setSelectedIndex(newIndex);
      } else if (key.ctrl && input === 'd') {
        // Ctrl+D: Scroll down half page
        const newIndex = Math.min(results.length - 1, selectedIndex + halfPage);
        if (newIndex === results.length - 1 && selectedIndex === results.length - 1) {
          setAtBoundary('bottom');
          clearBoundary();
        }
        setSelectedIndex(newIndex);
      } else if (key.ctrl && input === 'b') {
        // Ctrl+B: Scroll up full page
        const newIndex = Math.max(0, selectedIndex - fullPage);
        if (newIndex === 0 && selectedIndex === 0) {
          setAtBoundary('top');
          clearBoundary();
        }
        setSelectedIndex(newIndex);
      } else if (key.ctrl && input === 'f') {
        // Ctrl+F: Scroll down full page
        const newIndex = Math.min(results.length - 1, selectedIndex + fullPage);
        if (newIndex === results.length - 1 && selectedIndex === results.length - 1) {
          setAtBoundary('bottom');
          clearBoundary();
        }
        setSelectedIndex(newIndex);
      } else if (key.return) {
        // Enter key: select shortcut if in navigation mode
        if (results.length > 0 && selectedIndex < results.length) {
          selectShortcut(results[selectedIndex]);
        }
      }
      return;
    }

    // Input mode: handle search input
    if (key.return) {
      // Enter key: execute search and exit input mode
      if (results.length > 0 && selectedIndex < results.length) {
        selectShortcut(results[selectedIndex]);
        setIsInputFocused(false);
      } else if (query.trim().length > 0) {
        performSearch(query);
        setIsInputFocused(false);
      }
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(results.length - 1, prev + 1));
    } else if (key.backspace || key.delete) {
      // Handle backspace
      setQuery(prev => prev.slice(0, -1));
      setSelectedIndex(0);
    } else if (!key.ctrl && !key.meta && input.length === 1) {
      // Handle regular character input
      setQuery(prev => prev + input);
      setSelectedIndex(0);
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
    setError(null);
    try {
      const platformFilter: Platform | undefined = platform === 'all' ? undefined : platform;

      const config = loadConfig();
      const isPremium =
        config.user?.isPremium ||
        config.user?.subscriptionStatus === 'active' ||
        config.user?.subscriptionStatus === 'enterprise';

      if (aiEnabled && config.aiKeyMode === 'builtin' && isPremium && config.token) {
        // Route through the web AI endpoint using the user's bearer token
        const body: Record<string, unknown> = { query: searchQuery };
        if (platformFilter) body.platform = platformFilter;

        const response = await fetch(`${API_BASE_URL}/api/ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json() as { results: Shortcut[] };
          setResults(data.results || []);
          return;
        }
        // Fall through to keyword search on API failure
      }

      // Keyword search (default / fallback)
      const adapter = getDbAdapter();
      const searchEngine = new KeywordSearchEngine(adapter);
      const searchResults = await searchEngine.fuzzySearch(
        searchQuery,
        { platform: platformFilter },
        30
      );
      setResults(searchResults);
    } catch (error) {
      const friendlyMessage = getUserFriendlyMessage(error);
      setError(friendlyMessage);
      logError(`Error performing search for query: ${searchQuery}`, error);
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

  // Show detail view if a shortcut is selected
  if (view === 'detail' && selectedShortcut) {
    return (
      <DetailView
        shortcut={selectedShortcut}
        platform={platform}
        onBack={() => selectShortcut(null)}
        dbAdapter={getDbAdapter()}
      />
    );
  }

  if (view === 'search' || view === 'results') {
    const groupedResults = groupResultsByApp(results);
    const maxVisibleResults = terminalSize.availableRows;
    
    // Calculate visible range with centering
    const startIndex = Math.max(0, selectedIndex - Math.floor(maxVisibleResults / 2));
    const endIndex = Math.min(results.length, startIndex + maxVisibleResults);
    const visibleResults = results.slice(startIndex, endIndex);
    const positionText = results.length > 0 
      ? `${selectedIndex + 1} of ${results.length}` 
      : '0 of 0';

    // Show terminal size warnings
    if (terminalSize.isTooSmall) {
      return (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="yellow"
          paddingX={2}
          paddingY={1}
          marginY={1}
        >
          <Text color="yellow" bold>⚠ Terminal too small</Text>
          <Text color="yellow">Please resize your terminal to at least 20 rows (current: {terminalSize.rows})</Text>
        </Box>
      );
    }

    if (terminalSize.isTooNarrow) {
      return (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="yellow"
          paddingX={2}
          paddingY={1}
          marginY={1}
        >
          <Text color="yellow" bold>⚠ Terminal too narrow</Text>
          <Text color="yellow">Please resize your terminal to at least 80 columns (current: {terminalSize.columns})</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" height="100%">
        {/* Search Input Box - Always visible at top */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={isInputFocused ? 'cyan' : 'white'}
          paddingX={2}
          flexShrink={0}
        >
          <Text bold color={isInputFocused ? 'cyan' : 'white'}>
            Search across all apps {isInputFocused ? '(Input Mode)' : '(Navigation Mode)'}
          </Text>
          <Box>
            <Text dimColor>
              {isInputFocused
                ? 'Type to search, Esc to exit input mode'
                : 'Press / to enter input mode, ↑↓ to navigate'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>Query: </Text>
            <Text bold color={isInputFocused ? 'cyan' : 'yellow'}>{query || '_'}</Text>
          </Box>
        </Box>

        {/* AI Status Indicator - Always visible */}
        <Box paddingX={2} flexShrink={0} flexDirection="column">
          {aiEnabled ? (
            <Box flexDirection="column">
              <Text color="green">
                💡 AI ranking enabled — results are re-ranked by relevance using NLP
              </Text>
              <Text dimColor>
                Note: AI ranking searches shortcuts already in this device&apos;s database.
                To find shortcuts for a new app, switch to App-First Mode (Tab) and press Ctrl+A.
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              <Text color="yellow">
                ⚡ Keyword search only — exact matches and fuzzy search
              </Text>
              <Text dimColor>
                Enable AI (press A) to re-rank results. To find new app shortcuts, use App-First Mode (Tab) → Ctrl+A.
              </Text>
            </Box>
          )}
        </Box>

        {/* Visual Divider */}
        <Box paddingX={2} flexShrink={0}>
          <Text dimColor>{'─'.repeat(terminalSize.columns - 6)}</Text>
        </Box>

        {/* Scrollable Results Area */}
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {error ? (
            <Box paddingX={2} borderStyle="single" borderColor="red">
              <Text color="red" bold>Error: </Text>
              <Text color="red">{error}</Text>
              <Box marginTop={1}>
                <Text dimColor>Check ~/.katasumi/error.log for details</Text>
              </Box>
            </Box>
          ) : isSearching ? (
            <Box paddingX={2}>
              <Text dimColor>Searching...</Text>
            </Box>
          ) : results.length > 0 ? (
            <Box flexDirection="column">
              <Box paddingX={2} marginBottom={1} justifyContent="space-between" flexShrink={0}>
                <Text dimColor>Use ↑↓ Ctrl+U/D/F/B, / to search, Enter for details</Text>
                {results.length > 0 && (
                  <Text dimColor>[{positionText}]</Text>
                )}
              </Box>
              {atBoundary && (
                <Box paddingX={2} marginBottom={1} flexShrink={0}>
                  <Text color="yellow">
                    {atBoundary === 'top' ? '▲ At top of results' : '▼ At bottom of results'}
                  </Text>
                </Box>
              )}
              {visibleResults.map((shortcut, index) => {
                const keys = getKeysForPlatform(shortcut);
                const context = shortcut.context ? `[${shortcut.context}]` : '';
                const actualIndex = startIndex + index;
                const isSelected = actualIndex === selectedIndex;
                
                return (
                  <Box key={shortcut.id} paddingX={2} flexShrink={0}>
                    <Text inverse={isSelected}>
                      {isSelected ? '▶ ' : '  '}
                    </Text>
                    <Box width={15}>
                      <Text color="cyan" bold inverse={isSelected}>{shortcut.app}</Text>
                    </Box>
                    <Box width={25}>
                      <Text color="yellow" inverse={isSelected}>{keys}</Text>
                    </Box>
                    <Box width={35}>
                      <Text inverse={isSelected}>{shortcut.action}</Text>
                    </Box>
                    {context && (
                      <Box>
                        <Text dimColor={!isSelected} inverse={isSelected}>{context}</Text>
                      </Box>
                    )}
                  </Box>
                );
              })}
              {results.length > maxVisibleResults && (
                <Box paddingX={2} marginTop={1} flexShrink={0}>
                  <Text dimColor>
                    Showing {startIndex + 1}-{endIndex} of {results.length} results
                  </Text>
                </Box>
              )}
            </Box>
          ) : query.trim().length > 0 ? (
            <Box paddingX={2}>
              <Text dimColor>No results found for "{query}". Try a different search query.</Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    );
  }

  return null;
}
