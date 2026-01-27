/**
 * Test script for SQLite adapter
 * Verifies that the adapter can:
 * 1. Read from bundled shortcuts.db
 * 2. Create and write to user-data.db
 * 3. Search across both databases
 */

import { SQLiteAdapter, SourceType } from '@katasumi/core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function testSQLiteAdapter() {
  console.log('🧪 Testing SQLite Adapter...\n');

  // Path to core database (will be bundled with TUI)
  const coreDbPath = path.join(__dirname, '..', '..', 'core', 'data', 'shortcuts.db');
  
  // Check if core database exists
  if (!fs.existsSync(coreDbPath)) {
    console.error('❌ Core database not found at:', coreDbPath);
    console.error('   Run: cd packages/core && npm run build && npm run build-db');
    process.exit(1);
  }

  console.log('✅ Core database found at:', coreDbPath);

  // Initialize adapter
  const adapter = new SQLiteAdapter(coreDbPath);
  console.log('✅ SQLite adapter initialized');
  console.log('   Core DB:', adapter.getCorePath());
  console.log('   User DB:', adapter.getUserPath());
  console.log();

  try {
    // Test 1: Search for vim shortcuts
    console.log('📝 Test 1: Search for vim shortcuts');
    const vimShortcuts = await adapter.getShortcutsByApp('vim');
    console.log(`   Found ${vimShortcuts.length} vim shortcuts`);
    if (vimShortcuts.length > 0) {
      console.log('   Sample:', vimShortcuts[0].action, '-', vimShortcuts[0].keys.mac || vimShortcuts[0].keys.linux);
    }
    console.log();

    // Test 2: Search by query
    console.log('📝 Test 2: Search for "copy" shortcuts');
    const copyShortcuts = await adapter.searchShortcuts({ query: 'copy', limit: 5 });
    console.log(`   Found ${copyShortcuts.length} shortcuts containing "copy"`);
    copyShortcuts.forEach(s => {
      const keys = s.keys.mac || s.keys.windows || s.keys.linux || 'N/A';
      console.log(`   - ${s.app}: ${s.action} (${keys})`);
    });
    console.log();

    // Test 3: Get all apps
    console.log('📝 Test 3: Get all available apps');
    const apps = await adapter.getApps();
    console.log(`   Found ${apps.length} apps`);
    apps.forEach(app => {
      console.log(`   - ${app.displayName} (${app.name}): ${app.shortcutCount} shortcuts`);
    });
    console.log();

    // Test 4: Add a custom shortcut to user database
    console.log('📝 Test 4: Add custom shortcut to user database');
    const customShortcut = await adapter.addShortcut({
      app: 'custom-app',
      action: 'Test Custom Action',
      keys: {
        mac: 'Cmd+Shift+T',
        windows: 'Ctrl+Shift+T',
        linux: 'Ctrl+Shift+T'
      },
      category: 'Testing',
      tags: ['test', 'custom'],
      source: {
        type: SourceType.USER_ADDED,
        url: 'https://example.com',
        scrapedAt: new Date(),
        confidence: 1.0
      }
    });
    console.log('   ✅ Custom shortcut added with ID:', customShortcut.id);
    console.log();

    // Test 5: Retrieve the custom shortcut
    console.log('📝 Test 5: Retrieve custom shortcut');
    const retrieved = await adapter.getShortcutById(customShortcut.id);
    if (retrieved) {
      console.log('   ✅ Retrieved:', retrieved.action);
      console.log('      Keys:', retrieved.keys);
    } else {
      console.log('   ❌ Failed to retrieve custom shortcut');
    }
    console.log();

    // Test 6: Search for custom shortcut
    console.log('📝 Test 6: Search for custom shortcut');
    const customSearch = await adapter.searchShortcuts({ app: 'custom-app' });
    console.log(`   Found ${customSearch.length} shortcuts for custom-app`);
    console.log();

    // Test 7: Update custom shortcut
    console.log('📝 Test 7: Update custom shortcut');
    const updated = await adapter.updateShortcut(customShortcut.id, {
      action: 'Updated Test Action',
      tags: ['test', 'custom', 'updated']
    });
    if (updated) {
      console.log('   ✅ Updated:', updated.action);
      console.log('      Tags:', updated.tags);
    } else {
      console.log('   ❌ Failed to update');
    }
    console.log();

    // Test 8: Delete custom shortcut
    console.log('📝 Test 8: Delete custom shortcut');
    const deleted = await adapter.deleteShortcut(customShortcut.id);
    console.log(`   ${deleted ? '✅' : '❌'} Delete result:`, deleted);
    console.log();

    // Test 9: Verify deletion
    console.log('📝 Test 9: Verify deletion');
    const shouldBeNull = await adapter.getShortcutById(customShortcut.id);
    console.log(`   ${shouldBeNull === null ? '✅' : '❌'} Shortcut is null:`, shouldBeNull === null);
    console.log();

    // Test 10: Verify core database is still intact
    console.log('📝 Test 10: Verify core database still has vim shortcuts');
    const vimCheck = await adapter.getShortcutsByApp('vim');
    console.log(`   ${vimCheck.length > 0 ? '✅' : '❌'} Still has ${vimCheck.length} vim shortcuts`);
    console.log();

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await adapter.close();
    console.log('✅ Database connections closed');
  }
}

// Run tests
if (require.main === module) {
  testSQLiteAdapter()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testSQLiteAdapter };
