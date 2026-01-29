import React from 'react';
import { useInput } from 'ink';

interface GlobalKeybindingsProps {
  onToggleMode: () => void;
  onToggleAI: () => void;
  onShowHelp: () => void;
  onShowPlatformSelector: () => void;
  onQuit: () => void;
}

export function GlobalKeybindings({
  onToggleMode,
  onToggleAI,
  onShowHelp,
  onShowPlatformSelector,
  onQuit,
}: GlobalKeybindingsProps) {
  useInput((input, key) => {
    // Quit on Ctrl+C or q
    if (key.ctrl && input === 'c') {
      onQuit();
    } else if (input === 'q') {
      onQuit();
    }
    // Help on ?
    else if (input === '?') {
      onShowHelp();
    }
    // Toggle mode on Tab
    else if (key.tab) {
      onToggleMode();
    }
    // Vi-style shortcuts (home row keys)
    // a - Toggle AI
    else if (input === 'a') {
      onToggleAI();
    }
    // p - Platform selector
    else if (input === 'p') {
      onShowPlatformSelector();
    }
  });

  return null;
}
