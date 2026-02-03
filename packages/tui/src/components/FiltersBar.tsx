import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store.js';
import { debugLog } from '../utils/debug-logger.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import type { AppInfo } from '@katasumi/core';

interface FiltersBarProps {
  onQuickSearchChange: (query: string) => void;
  selectedApp?: AppInfo | null;
}

export function FiltersBar({ onQuickSearchChange, selectedApp }: FiltersBarProps) {
  const focusSection = useAppStore((state) => state.focusSection);
  const setInputMode = useAppStore((state) => state.setInputMode);
  const setFocusSection = useAppStore((state) => state.setFocusSection);
  const quickSearchQuery = useAppStore((state) => state.quickSearchQuery);
  const filters = useAppStore((state) => state.filters);
  const results = useAppStore((state) => state.results);
  const terminalSize = useTerminalSize();
  
  const isFocused = focusSection === 'filters';

  // Update input mode when focus changes
  React.useEffect(() => {
    setInputMode(isFocused);
  }, [isFocused, setInputMode]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.escape) {
        // Exit input mode and allow navigation
        setFocusSection('results');
      } else if (key.return) {
        // Execute search and exit input mode
        setFocusSection('results');
      } else if (key.backspace || key.delete) {
        onQuickSearchChange(quickSearchQuery.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        onQuickSearchChange(quickSearchQuery + input);
      }
    },
    { isActive: isFocused }
  );

  const searchLabel = selectedApp 
    ? `Search shortcuts for ${selectedApp.displayName}`
    : 'Quick Search';
  
  const placeholderText = selectedApp 
    ? `Search shortcuts for ${selectedApp.displayName}...`
    : 'Type to search...';

  // Debug: Log filter bar state
  React.useEffect(() => {
    debugLog('🔧 FiltersBar render:');
    debugLog(`  Focused: ${isFocused}`);
    debugLog(`  Query: "${quickSearchQuery}"`);
    debugLog(`  Results: ${results.length}`);
    debugLog(`  Compact height: 2 rows (border + single inline row)`);
  }, [isFocused, quickSearchQuery, results.length]);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={isFocused ? 'cyan' : 'white'} paddingX={1} width="100%">
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text bold color={isFocused ? 'cyan' : 'white'}>
            '🔍 Search'
          </Text>
          <Text dimColor>: </Text>
          <Text color={isFocused ? 'yellow' : 'white'}>
            {quickSearchQuery || (isFocused ? '...' : '_')}
          </Text>
          {isFocused && (
            <Text dimColor> (type to filter, Tab: toggle filters, Esc/Enter: navigate)</Text>
          )}
        </Box>
        <Box gap={1}>
          <Text dimColor>{terminalSize.columns > 120 ? 'Context' : 'Ctx'}:</Text>
          <Text>{filters.context || 'All'}</Text>
          <Text dimColor>|</Text>
          <Text dimColor>{terminalSize.columns > 120 ? 'Category' : 'Cat'}:</Text>
          <Text>{filters.category || 'All'}</Text>
          <Text dimColor>|</Text>
          <Text dimColor>{terminalSize.columns > 120 ? 'Tags' : 'T'}:</Text>
          <Text>{filters.tags.length > 0 ? filters.tags.join(',') : 'None'}</Text>
          <Text dimColor>|</Text>
          <Text dimColor>{terminalSize.columns > 120 ? 'Results' : 'R'}:</Text>
          <Text>{results.length}</Text>
        </Box>
      </Box>
    </Box>
  );
}
