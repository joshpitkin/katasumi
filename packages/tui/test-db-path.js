#!/usr/bin/env node

// Test database path resolution
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Database Path Resolution Test ===\n');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('process.env.HOME:', process.env.HOME);
console.log('\nTrying possible paths:\n');

const possiblePaths = [
  // From dist/components/ go to packages/core/data/shortcuts.db
  path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
  // From packages/tui go to packages/core/data/shortcuts.db
  path.resolve(__dirname, '..', 'core', 'data', 'shortcuts.db'),
  // From process.cwd() which might be packages/tui
  path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
  // From process.cwd() which might be monorepo root
  path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
];

possiblePaths.forEach((p, i) => {
  const exists = fs.existsSync(p);
  console.log(`${i + 1}. ${exists ? '✓' : '✗'} ${p}`);
});

const foundPath = possiblePaths.find((p) => fs.existsSync(p));
if (foundPath) {
  console.log(`\n✅ Selected: ${foundPath}`);
  
  // Try loading with SQLite adapter
  const { SQLiteAdapter } = await import('@katasumi/core');
  const userDbPath = path.join(process.env.HOME || '~', '.katasumi', 'user-data.db');
  const adapter = new SQLiteAdapter(foundPath, userDbPath);
  
  console.log('\nTesting adapter.getApps()...');
  const apps = await adapter.getApps();
  console.log(`Found ${apps.length} apps:`);
  apps.forEach(app => console.log(`  - ${app.name} (${app.shortcutCount} shortcuts)`));
} else {
  console.log('\n❌ No valid database path found!');
}
