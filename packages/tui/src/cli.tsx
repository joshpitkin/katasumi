#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import readline from 'readline';
import App from './App.js';
import { debugLog } from './utils/debug-logger.js';
import { loginCommand } from './commands/login.js';

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0];

// Handle commands
if (command === 'login') {
  // Run login command
  loginCommand(args.slice(1)).catch((error) => {
    console.error('Login failed:', error.message);
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
