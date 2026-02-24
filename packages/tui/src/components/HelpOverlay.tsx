import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  const terminalSize = useTerminalSize();
  
  // Handle ESC key to close help
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });
  
  // Show warning if terminal is too small
  if (terminalSize.isTooSmall || terminalSize.isTooNarrow) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
      >
        <Text color="yellow" bold>⚠ Terminal too small to show help</Text>
        <Text color="yellow">
          {terminalSize.isTooSmall && `Resize to at least 20 rows (current: ${terminalSize.rows})`}
          {terminalSize.isTooNarrow && `Resize to at least 80 columns (current: ${terminalSize.columns})`}
        </Text>
        <Box marginTop={1}>
          <Text dimColor>[Esc] Close</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="yellow">
        Keyboard Shortcuts
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Global:</Text>
        <Text>  Ctrl+C / q       Quit</Text>
        <Text>  ?                Show this help</Text>
        <Text>  a                Toggle AI</Text>
        <Text>  p                Platform selector</Text>
        <Text>  s / Ctrl+S       Sync shortcuts (Premium)</Text>
        <Text dimColor />
        <Text bold>Navigation:</Text>
        <Text>  /                Focus search input</Text>
        <Text>  Esc              Toggle input mode / Back</Text>
        <Text>  ↑↓ / j k         Navigate results</Text>
        <Text>  Ctrl+U           Scroll up half page</Text>
        <Text>  Ctrl+D           Scroll down half page</Text>
        <Text>  Ctrl+B           Scroll up full page</Text>
        <Text>  Ctrl+F           Scroll down full page</Text>
        <Text>  Enter            Select / Show details</Text>
        <Text dimColor />
        <Text bold>Search Modes:</Text>
        <Text>  Tab              Toggle App-First ↔ Full-Phrase</Text>
        <Text dimColor />
        <Text bold>App-First Mode:</Text>
        <Text>  g                Go back to app selector</Text>
        <Text>  /                Focus quick search (from nav mode)</Text>
        <Text>  Tab              Toggle filter modal (when search focused)</Text>
        <Text>  Esc              Exit input / Back to search</Text>
        <Text>  j / k            Navigate down / up</Text>
        <Text dimColor />
        <Text bold>Detail View:</Text>
        <Text>  c                Copy keys to clipboard</Text>
        <Text>  o                Open documentation URL</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Esc] Close Help</Text>
      </Box>
    </Box>
  );
}
