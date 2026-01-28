/**
 * Initial migration: Create shortcuts and app_info tables
 * Created: 2026-01-26
 */

exports.up = async function up(db, dbType = 'sqlite') {
  const isPostgres = dbType === 'postgres';
  
  // Create shortcuts table
  if (isPostgres) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id TEXT PRIMARY KEY,
        app TEXT NOT NULL,
        action TEXT NOT NULL,
        keys_mac TEXT,
        keys_windows TEXT,
        keys_linux TEXT,
        context TEXT,
        category TEXT,
        tags TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL,
        source_url TEXT,
        source_scraped_at TIMESTAMP,
        source_confidence REAL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id TEXT PRIMARY KEY,
        app TEXT NOT NULL,
        action TEXT NOT NULL,
        keysMac TEXT,
        keysWindows TEXT,
        keysLinux TEXT,
        context TEXT,
        category TEXT,
        tags TEXT NOT NULL DEFAULT '',
        sourceType TEXT NOT NULL,
        sourceUrl TEXT,
        sourceScrapedAt TEXT,
        sourceConfidence REAL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Create indexes on shortcuts table
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shortcuts_app ON shortcuts(app)`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shortcuts_action ON shortcuts(action)`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shortcuts_category ON shortcuts(category)`);

  // Create app_info table
  if (isPostgres) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_info (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        category TEXT NOT NULL,
        platforms TEXT NOT NULL,
        shortcut_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_info (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        displayName TEXT NOT NULL,
        category TEXT NOT NULL,
        platforms TEXT NOT NULL,
        shortcutCount INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Create indexes on app_info table
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_app_info_name ON app_info(name)`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_app_info_category ON app_info(category)`);

  console.log('Created shortcuts and app_info tables with indexes');
};

exports.down = async function down(db, dbType = 'sqlite') {
  // Drop tables in reverse order
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS app_info`);
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS shortcuts`);
  
  console.log('Dropped shortcuts and app_info tables');
};
