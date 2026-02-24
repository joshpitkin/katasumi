import React from 'react';
import { Box, Text } from 'ink';
import type { PlatformOption } from '../store.js';
import { isAIConfigured, loadToken } from '../utils/config.js';
import { debugLog } from '../utils/debug-logger.js';

interface HeaderProps {
  mode: 'app-first' | 'full-phrase';
  platform: PlatformOption;
  aiEnabled: boolean;
}

function getPlatformDisplay(platform: PlatformOption): string {
  switch (platform) {
    case 'mac':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    case 'all':
      return 'All Platforms';
    default:
      return 'Unknown';
  }
}

export function Header({ mode, platform, aiEnabled }: HeaderProps) {
  const modeDisplay = mode === 'app-first' ? 'App-First' : 'Full-Phrase';
  const aiConfigured = isAIConfigured();
  const isLoggedIn = !!loadToken();
  const aiStatus = aiEnabled
    ? 'ON'
    : aiConfigured
    ? 'OFF'
    : isLoggedIn
    ? 'OFF - Configure AI Settings'
    : 'OFF - Login Required';
  const platformDisplay = getPlatformDisplay(platform);

  // Debug: Header should always be at the top
  React.useEffect(() => {
    debugLog('📦 Header render:');
    debugLog(`  Mode: ${mode}`);
    debugLog(`  Height: 3 rows (1 border + 1 status + 1 marginBottom)`);
    debugLog(`  ⚠️ If you see terminal text ABOVE this, root Box position is wrong`);
  }, [mode]);

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          Katasumi v1.0
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text>
          Mode: <Text bold color="green">[{modeDisplay}]</Text>
          {' | '}
          Platform: <Text bold>{platformDisplay}</Text>
          {' | '}
          AI: <Text bold color={aiEnabled ? 'green' : 'gray'}>{aiStatus}</Text>
        </Text>
      </Box>
    </Box>
  );
}
