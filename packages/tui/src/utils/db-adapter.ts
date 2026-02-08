import { DatabaseAdapter, SQLiteAdapter } from '@katasumi/core';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Singleton database adapter
let dbAdapter: DatabaseAdapter | null = null;

export function getDbAdapter(): DatabaseAdapter {
  if (!dbAdapter) {
    // Resolve path from the monorepo root
    // When running from dist/cli.js, we need to go up to the packages directory
    const possiblePaths = [
      // From dist/utils/ go to packages/core/data/shortcuts.db
      path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
      // From packages/tui go to packages/core/data/shortcuts.db
      path.resolve(__dirname, '..', 'core', 'data', 'shortcuts.db'),
      // From process.cwd() which might be packages/tui
      path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
      // From process.cwd() which might be monorepo root
      path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
    ];

    let coreDbPath = possiblePaths.find((p) => {
      const exists = fs.existsSync(p);
      if (exists) {
        console.log(`✓ Found core database at: ${p}`);
      }
      return exists;
    });

    if (!coreDbPath) {
      console.error('❌ Core database not found. Searched paths:');
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      console.error('Using empty in-memory database.');
      coreDbPath = ':memory:';
    }

    const userDbPath = path.join(process.env.HOME || '~', '.katasumi', 'user-data.db');
    dbAdapter = new SQLiteAdapter(coreDbPath, userDbPath);
  }
  return dbAdapter;
}
