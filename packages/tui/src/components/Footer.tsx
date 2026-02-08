import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { debugLog } from '../utils/debug-logger.js';
import { getLastSyncTime } from '../utils/sync.js';
import type { AppInfo } from '@katasumi/core';
import type { SyncStatus } from '../store.js';

interface FooterProps {
  mode: 'app-first' | 'full-phrase';
  selectedApp?: AppInfo | null;
  syncStatus?: SyncStatus;
  syncMessage?: string;
}

export function Footer({ mode, selectedApp, syncStatus = 'idle', syncMessage = '' }: FooterProps) {
  // Conditionally show Tab shortcut
  const tabShortcut = (mode === 'app-first' && selectedApp) ? '' : '[Tab] Switch Mode | ';
  const commonShortcuts = `[Ctrl+C] Quit | [?] Help | ${tabShortcut}[a] Toggle AI | [p] Platform | [s] Sync`;
  const modeSpecific =
    mode === 'app-first'
      ? selectedApp 
        ? ' | [/] Search | [Esc] Toggle Nav | [g] Go to App'
        : ' | [/] Search | [Esc] Exit Input'
      : '';

  // Build sync status text
  let syncStatusText = '';
  if (syncStatus === 'syncing') {
    syncStatusText = '⏳ Syncing...';
  } else if (syncStatus === 'success') {
    syncStatusText = `✓ ${syncMessage}`;
  } else if (syncStatus === 'error') {
    syncStatusText = `✗ ${syncMessage}`;
  } else {
    // Show last sync time if available
    const lastSync = getLastSyncTime();
    if (lastSync) {
      syncStatusText = `Last synced: ${lastSync}`;
    }
  }

  // Debug: Track footer rendering
  useEffect(() => {
    debugLog('👟 Footer render:');
    debugLog(`  Mode: ${mode}`);
    debugLog(`  Selected app: ${selectedApp?.name || 'none'}`);
    debugLog(`  Height: 3 rows (1 marginTop + 2 border box)`);
    debugLog(`  Mode-specific shortcuts: ${modeSpecific ? 'YES' : 'NO'}`);
  }, [mode, selectedApp, modeSpecific]);

  return (
    <Box flexDirection="column" marginTop={1}>
      {syncStatusText && (
        <Box marginBottom={0}>
          <Text 
            dimColor={syncStatus === 'idle'}
            color={syncStatus === 'success' ? 'green' : syncStatus === 'error' ? 'red' : undefined}
          >
            {syncStatusText}
          </Text>
        </Box>
      )}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {commonShortcuts}
          {modeSpecific}
        </Text>
      </Box>
    </Box>
  );
}
