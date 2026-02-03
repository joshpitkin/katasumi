import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { debugLog } from '../utils/debug-logger.js';
import type { AppInfo } from '@katasumi/core';

interface FooterProps {
  mode: 'app-first' | 'full-phrase';
  selectedApp?: AppInfo | null;
}

export function Footer({ mode, selectedApp }: FooterProps) {
  // Conditionally show Tab shortcut
  const tabShortcut = (mode === 'app-first' && selectedApp) ? '' : '[Tab] Switch Mode | ';
  const commonShortcuts = `[Ctrl+C] Quit | [?] Help | ${tabShortcut}[a] Toggle AI | [p] Platform`;
  const modeSpecific =
    mode === 'app-first'
      ? selectedApp 
        ? ' | [/] Search | [Esc] Toggle Nav | [g] Go to App'
        : ' | [/] Search | [Esc] Exit Input'
      : '';

  // Debug: Track footer rendering
  useEffect(() => {
    debugLog('👟 Footer render:');
    debugLog(`  Mode: ${mode}`);
    debugLog(`  Selected app: ${selectedApp?.name || 'none'}`);
    debugLog(`  Height: 3 rows (1 marginTop + 2 border box)`);
    debugLog(`  Mode-specific shortcuts: ${modeSpecific ? 'YES' : 'NO'}`);
  }, [mode, selectedApp, modeSpecific]);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Text dimColor>
        {commonShortcuts}
        {modeSpecific}
      </Text>
    </Box>
  );
}
