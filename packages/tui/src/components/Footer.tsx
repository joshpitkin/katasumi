import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  mode: 'app-first' | 'full-phrase';
}

export function Footer({ mode }: FooterProps) {
  const commonShortcuts = '[Ctrl+C] Quit | [?] Help | [Tab] Switch Mode | [a] Toggle AI | [p] Platform';
  const modeSpecific =
    mode === 'app-first'
      ? ' | [g] Go to App | [f] Filters'
      : '';

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Text dimColor>
        {commonShortcuts}
        {modeSpecific}
      </Text>
    </Box>
  );
}
