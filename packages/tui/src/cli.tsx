#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import readline from 'readline';
import App from './App.js';
import { debugLog } from './utils/debug-logger.js';
import { loginCommand } from './commands/login.js';
import { syncUserShortcuts, syncAIConfig } from './utils/sync.js';
import { getDbAdapter } from './utils/db-adapter.js';
import { loadToken, loadUser, clearAuth } from './utils/config.js';

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`
Katasumi - Keyboard Shortcut Search

USAGE
  katasumi [command]

COMMANDS
  (none)        Launch the interactive TUI (default)
  login         Authenticate with your Katasumi account
  logout        Clear stored credentials
  sync          Sync shortcuts and AI config from the cloud (requires login)
  help          Show this help message

LOGIN OPTIONS
  katasumi login                  Interactive email/password login
  katasumi login --token <token>  Authenticate with an API token
  katasumi login --web            Open the browser login page

SYNC OPTIONS
  katasumi sync                   Sync shortcuts from the cloud
  katasumi sync --ai-config       Sync AI configuration only
  katasumi sync --all             Sync shortcuts and AI configuration

TUI KEYBOARD SHORTCUTS
  Global:
    Ctrl+C / q       Quit
    ?                Show help overlay
    a                Toggle AI search
    p                Platform selector
    s / Ctrl+S       Sync shortcuts (Ctrl+S works while typing)
    Tab              Toggle App-First ↔ Full-Phrase mode

  Navigation:
    /                Focus search input
    Esc              Exit input mode / go back
    ↑ ↓ / j k        Navigate results
    Ctrl+U / Ctrl+D  Scroll half page up / down
    Ctrl+B / Ctrl+F  Scroll full page up / down
    Enter            Select / show detail view

  App-First mode:
    g                Go back to app selector
    Tab              Toggle filter modal (when filters focused)

  Detail view:
    c                Copy keys to clipboard
    o                Open documentation URL

MORE INFO
  Config file:  ~/.katasumi/config.json
  Web interface: http://app.katasumi.io
`);
}

// Handle commands
if (command === 'help' || args.includes('--help') || args.includes('-h')) {
  printHelp();
} else if (command === 'login') {
  // Run login command
  loginCommand(args.slice(1)).catch((error) => {
    console.error('Login failed:', error.message);
    process.exit(1);
  });
} else if (command === 'logout') {
  clearAuth();
  console.log('Logged out successfully.');
} else if (command === 'sync') {
  const token = loadToken();
  if (!token) {
    console.error('Not logged in. Run "katasumi login" first.');
    process.exit(1);
  }

  const user = loadUser();
  const syncAll = args.includes('--all');
  const aiConfigOnly = args.includes('--ai-config');

  const syncShortcuts = !aiConfigOnly;
  const syncAI = aiConfigOnly || syncAll;

  (async () => {
    if (syncShortcuts) {
      process.stdout.write('Syncing shortcuts...');
      const adapter = getDbAdapter();
      const result = await syncUserShortcuts(adapter);
      if (result.success) {
        console.log(` ✓ ${result.message}`);
      } else {
        console.log(` ✗ ${result.message}`);
        if (!syncAI) process.exit(1);
      }
    }

    if (syncAI) {
      process.stdout.write('Syncing AI configuration...');
      const result = await syncAIConfig();
      if (result.success) {
        console.log(` ✓ ${result.message}`);
      } else {
        console.log(` ✗ ${result.message}`);
        process.exit(1);
      }
    }
  })().catch((error) => {
    console.error('Sync failed:', error.message);
    process.exit(1);
  });
} else {
  // Default: Launch TUI
  // Clear screen before starting TUI to ensure Header appears at top
  process.stdout.write('\x1b[2J\x1b[H'); // ANSI escape codes: clear screen + move cursor to home

  // Enable keypress events
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
  }

  const startTime = Date.now();

  debugLog('🚀 TUI Starting...');
  debugLog(`  Screen cleared to ensure Header at top`);

  render(<App />);

  // Log startup time for verification (to debug log, not stderr)
  const elapsedTime = Date.now() - startTime;
  debugLog(`✅ TUI rendered in ${elapsedTime}ms`);
}

