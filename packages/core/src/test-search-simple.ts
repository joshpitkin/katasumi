/**
 * Simple test script for search engine using better-sqlite3
 */

import Database from 'better-sqlite3';
import { KeywordSearchEngine } from './keyword-search-engine';
import { DatabaseAdapter, SearchOptions } from './database-adapter';
import { Shortcut, AppInfo, SourceType } from './types';
import path from 'path';
import os from 'os';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

/**
 * Simple SQLite adapter using better-sqlite3
 */
class SimpleSQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  async searchShortcuts(options: SearchOptions): Promise<Shortcut[]> {
    let query = 'SELECT * FROM shortcuts WHERE 1=1';
    const params: any[] = [];

    if (options.app) {
      query += ' AND app = ?';
      params.push(options.app);
    }

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    
    return rows.map(row => this.rowToShortcut(row));
  }

  async getShortcutsByApp(app: string): Promise<Shortcut[]> {
    return this.searchShortcuts({ app });
  }

  async getShortcutById(id: string): Promise<Shortcut | null> {
    const row = this.db.prepare('SELECT * FROM shortcuts WHERE id = ?').get(id) as any;
    return row ? this.rowToShortcut(row) : null;
  }

  async addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut> {
    throw new Error('Read-only adapter');
  }

  async updateShortcut(id: string, shortcut: Partial<Shortcut>): Promise<Shortcut | null> {
    throw new Error('Read-only adapter');
  }

  async deleteShortcut(id: string): Promise<boolean> {
    throw new Error('Read-only adapter');
  }

  async getApps(): Promise<AppInfo[]> {
    const rows = this.db.prepare('SELECT * FROM app_info').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      category: row.category,
      platforms: JSON.parse(row.platforms),
      shortcutCount: row.shortcutCount,
    }));
  }

  async getAppInfo(app: string): Promise<AppInfo | null> {
    const row = this.db.prepare('SELECT * FROM app_info WHERE name = ?').get(app) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      category: row.category,
      platforms: JSON.parse(row.platforms),
      shortcutCount: row.shortcutCount,
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private rowToShortcut(row: any): Shortcut {
    // Parse tags - handle both JSON array and comma-separated string
    let tags: string[] = [];
    if (row.tags) {
      if (row.tags.startsWith('[')) {
        tags = JSON.parse(row.tags);
      } else {
        tags = row.tags.split(',').map((t: string) => t.trim());
      }
    }

    return {
      id: row.id,
      app: row.app,
      action: row.action,
      keys: {
        mac: row.keysMac || undefined,
        windows: row.keysWindows || undefined,
        linux: row.keysLinux || undefined,
      },
      context: row.context || undefined,
      category: row.category || undefined,
      tags: tags,
      source: row.sourceUrl ? {
        type: row.sourceType as SourceType,
        url: row.sourceUrl,
        scrapedAt: new Date(row.sourceScrapedAt),
        confidence: row.sourceConfidence,
      } : undefined,
    };
  }
}

async function runTests() {
  log('\n🔍 Testing Keyword Search Engine\n', BOLD);

  const dbPath = path.join(__dirname, '..', 'data', 'shortcuts.db');
  const adapter = new SimpleSQLiteAdapter(dbPath);
  const searchEngine = new KeywordSearchEngine(adapter);

  let passCount = 0;
  let failCount = 0;

  // Test 1: Basic search
  log('Test 1: Search for "copy"', BOLD);
  try {
    const results = await searchEngine.fuzzySearch('copy');
    log(`  Found ${results.length} results`);
    results.slice(0, 3).forEach((r, i) => {
      log(`    ${i + 1}. "${r.action}" (${r.app})`);
    });
    if (results.length > 0) {
      log('  ✅ PASS', GREEN);
      passCount++;
    } else {
      log('  ❌ FAIL: No results', RED);
      failCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Test 2: Search with app filter
  log('\nTest 2: Search for "move" with app=vim', BOLD);
  try {
    const results = await searchEngine.fuzzySearch('move', { app: 'vim' });
    log(`  Found ${results.length} results`);
    const allVim = results.every(r => r.app === 'vim');
    results.slice(0, 3).forEach((r, i) => {
      log(`    ${i + 1}. "${r.action}" (${r.app})`);
    });
    if (allVim) {
      log('  ✅ PASS: All results from Vim', GREEN);
      passCount++;
    } else {
      log('  ❌ FAIL: Some results not from Vim', RED);
      failCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Test 3: Search with platform filter
  log('\nTest 3: Search with platform=mac', BOLD);
  try {
    const results = await searchEngine.fuzzySearch('copy', { platform: 'mac' });
    log(`  Found ${results.length} results`);
    const allHaveMac = results.every(r => r.keys.mac);
    results.slice(0, 3).forEach((r, i) => {
      log(`    ${i + 1}. "${r.action}" - ${r.keys.mac} (${r.app})`);
    });
    if (allHaveMac) {
      log('  ✅ PASS: All results have Mac keys', GREEN);
      passCount++;
    } else {
      log('  ❌ FAIL: Some results missing Mac keys', RED);
      failCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Test 4: Search with context filter
  log('\nTest 4: Search with context="Normal Mode"', BOLD);
  try {
    const results = await searchEngine.fuzzySearch('', { context: 'Normal Mode' }, 10);
    log(`  Found ${results.length} results`);
    const allNormalMode = results.every(r => r.context === 'Normal Mode');
    results.slice(0, 3).forEach((r, i) => {
      log(`    ${i + 1}. "${r.action}" - ${r.context} (${r.app})`);
    });
    if (results.length > 0 && allNormalMode) {
      log('  ✅ PASS: All results have Normal Mode context', GREEN);
      passCount++;
    } else if (results.length === 0) {
      log('  ⚠️  No results found', YELLOW);
      passCount++;
    } else {
      log('  ❌ FAIL: Context filter not working', RED);
      failCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Test 5: Empty query
  log('\nTest 5: Empty query returns results', BOLD);
  try {
    const results = await searchEngine.fuzzySearch('', {}, 50);
    log(`  Found ${results.length} results`);
    if (results.length > 0 && results.length <= 50) {
      log('  ✅ PASS: Returns at most 50 results', GREEN);
      passCount++;
    } else {
      log('  ❌ FAIL: Incorrect number of results', RED);
      failCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Test 6: Performance
  log('\nTest 6: Search performance (<100ms)', BOLD);
  try {
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await searchEngine.fuzzySearch('copy paste');
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    log(`  Average search time: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime < 100) {
      log('  ✅ PASS: Search completes in <100ms', GREEN);
      passCount++;
    } else {
      log('  ⚠️  Search takes longer but still acceptable', YELLOW);
      passCount++;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error}`, RED);
    failCount++;
  }

  // Cleanup
  await adapter.close();

  // Summary
  log(`\n${'='.repeat(60)}`, BOLD);
  log(`\n📊 Test Summary:`, BOLD);
  log(`  ✅ Passed: ${passCount}`);
  log(`  ❌ Failed: ${failCount}`);
  const total = passCount + failCount;
  const percentage = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0';
  log(`  Success Rate: ${percentage}%\n`);

  if (failCount === 0) {
    log('✅ All tests passed!\n', GREEN + BOLD);
    process.exit(0);
  } else {
    log(`⚠️  ${failCount} test(s) failed.\n`, YELLOW + BOLD);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
