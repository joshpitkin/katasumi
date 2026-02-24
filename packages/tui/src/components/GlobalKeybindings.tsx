import React from 'react';
import { useInput } from 'ink';
import { useAppStore } from '../store.js';

interface GlobalKeybindingsProps {
  onToggleMode: () => void;
  onToggleAI: () => void;
  onShowHelp: () => void;
  onShowPlatformSelector: () => void;
  onShowFilterModal: () => void;
  onQuit: () => void;
  onSync: () => void;
  showFilterModal: boolean;
  showHelp: boolean;
  showPlatformSelector: boolean;
}

export function GlobalKeybindings({
  onToggleMode,
  onToggleAI,
  onShowHelp,
  onShowPlatformSelector,
  onShowFilterModal,
  onQuit,
  onSync,
  showFilterModal,
  showHelp,
  showPlatformSelector,
}: GlobalKeybindingsProps) {
  const isInputMode = useAppStore((state) => state.isInputMode);
  const mode = useAppStore((state) => state.mode);
  const selectedApp = useAppStore((state) => state.selectedApp);
  const focusSection = useAppStore((state) => state.focusSection);

  useInput((input, key) => {
    // Always allow Ctrl+C to quit
    if (key.ctrl && input === 'c') {
      onQuit();
      return;
    }

    // Ctrl+S syncs even in input mode
    if (key.ctrl && input === 's') {
      onSync();
      return;
    }

    // Skip Tab handling when any modal is open (let the modal handle it)
    if (key.tab && (showFilterModal || showHelp || showPlatformSelector)) {
      return;
    }

    // Tab behavior depends on context
    if (key.tab) {
      // In app-first mode with filters focused, Tab opens filter modal
      if (mode === 'app-first' && selectedApp && focusSection === 'filters') {
        onShowFilterModal();
        return;
      }
      // Otherwise, toggle mode as usual
      onToggleMode();
      return;
    }

    // Skip other global shortcuts when in input mode
    if (isInputMode) {
      return;
    }

    // Navigation mode shortcuts (only active when NOT in input mode)
    if (input === 'q') {
      onQuit();
    } else if (input === '?') {
      onShowHelp();
    } else if (input === 'a') {
      onToggleAI();
    } else if (input === 'p') {
      onShowPlatformSelector();
    } else if (input === 's') {
      onSync();
    }
  });

  return null;
}
