#!/usr/bin/env node

/**
 * Test error handling in database adapters
 */

import { SQLiteAdapter, PostgresAdapter } from './dist/index.js';

console.log('🧪 Testing Database Error Handling\n');

// Test 1: SQLite with non-existent database
console.log('Test 1: SQLite with non-existent database file');
try {
  const adapter = new SQLiteAdapter('/path/that/does/not/exist.db');
  console.log('  ❌ FAIL: Should have thrown error');
} catch (error) {
  if (error.message.includes('Core database not found at path')) {
    console.log('  ✅ PASS: Got expected error');
    console.log(`     Message: "${error.message}"`);
  } else {
    console.log('  ❌ FAIL: Wrong error message');
    console.log(`     Got: "${error.message}"`);
  }
}

// Test 2: PostgreSQL with empty URL
console.log('\nTest 2: PostgreSQL with empty connection URL');
try {
  const adapter = new PostgresAdapter('');
  console.log('  ❌ FAIL: Should have thrown error');
} catch (error) {
  if (error.message.includes('Core database URL is required')) {
    console.log('  ✅ PASS: Got expected error');
    console.log(`     Message: "${error.message}"`);
  } else {
    console.log('  ❌ FAIL: Wrong error message');
    console.log(`     Got: "${error.message}"`);
  }
}

// Test 3: SQLite with valid database - getApps should work
console.log('\nTest 3: SQLite with valid database');
try {
  const adapter = new SQLiteAdapter('./packages/core/data/shortcuts.db');
  const apps = await adapter.getApps();
  if (apps.length > 0) {
    console.log(`  ✅ PASS: Successfully loaded ${apps.length} apps`);
  } else {
    console.log('  ❌ FAIL: No apps returned');
  }
} catch (error) {
  console.log('  ❌ FAIL: Unexpected error');
  console.log(`     Error: "${error.message}"`);
}

// Test 4: SQLite with in-memory database (no file check)
console.log('\nTest 4: SQLite with in-memory database');
try {
  const adapter = new SQLiteAdapter(':memory:');
  const apps = await adapter.getApps();
  console.log(`  ✅ PASS: In-memory database created, got ${apps.length} apps`);
} catch (error) {
  console.log(`  ⚠️  Expected behavior: ${error.message}`);
}

console.log('\n✅ Error handling tests completed!\n');
