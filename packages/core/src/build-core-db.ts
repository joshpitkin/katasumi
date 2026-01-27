/**
 * Build the core shortcuts.db database for bundling with TUI
 * This database is read-only and contains curated shortcuts
 */

import { PrismaClient } from './generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as path from 'path';
import { seedData } from './seed-data';

const CORE_DB_PATH = path.join(__dirname, '..', 'data', 'shortcuts.db');

async function buildCoreDatabase() {
  console.log('🏗️  Building core shortcuts database...');

  // Create data directory if it doesn't exist
  const dataDir = path.dirname(CORE_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Remove existing database if it exists
  if (fs.existsSync(CORE_DB_PATH)) {
    fs.unlinkSync(CORE_DB_PATH);
    console.log('🗑️  Removed existing database');
  }

  // Create new database
  const adapter = new PrismaLibSql({
    url: `file:${CORE_DB_PATH}`
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // Create tables using raw SQL since we can't run migrations on a file that doesn't exist yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id TEXT PRIMARY KEY,
        app TEXT NOT NULL,
        action TEXT NOT NULL,
        keysMac TEXT,
        keysWindows TEXT,
        keysLinux TEXT,
        context TEXT,
        category TEXT,
        tags TEXT NOT NULL,
        sourceType TEXT NOT NULL,
        sourceUrl TEXT,
        sourceScrapedAt DATETIME,
        sourceConfidence REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_shortcuts_app ON shortcuts(app)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_shortcuts_action ON shortcuts(action)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_shortcuts_category ON shortcuts(category)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_info (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        displayName TEXT NOT NULL,
        category TEXT NOT NULL,
        platforms TEXT NOT NULL,
        shortcutCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_app_info_name ON app_info(name)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_app_info_category ON app_info(category)
    `);

    console.log('✅ Tables created');

    // Insert seed data
    console.log('📦 Inserting seed data...');
    
    // Insert apps
    for (const app of seedData.apps) {
      await prisma.appInfo.create({
        data: {
          id: app.id,
          name: app.name,
          displayName: app.displayName,
          category: app.category,
          platforms: app.platforms.join(','),
          shortcutCount: app.shortcutCount
        }
      });
    }
    console.log(`✅ Inserted ${seedData.apps.length} apps`);

    // Insert shortcuts in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < seedData.shortcuts.length; i += batchSize) {
      const batch = seedData.shortcuts.slice(i, i + batchSize);
      await Promise.all(
        batch.map(shortcut =>
          prisma.shortcut.create({
            data: {
              id: shortcut.id,
              app: shortcut.app,
              action: shortcut.action,
              keysMac: shortcut.keys.mac,
              keysWindows: shortcut.keys.windows,
              keysLinux: shortcut.keys.linux,
              context: shortcut.context,
              category: shortcut.category,
              tags: shortcut.tags.join(','),
              sourceType: shortcut.source?.type || 'official',
              sourceUrl: shortcut.source?.url,
              sourceScrapedAt: shortcut.source?.scrapedAt ? new Date(shortcut.source.scrapedAt) : null,
              sourceConfidence: shortcut.source?.confidence
            }
          })
        )
      );
      console.log(`   Inserted ${Math.min(i + batchSize, seedData.shortcuts.length)}/${seedData.shortcuts.length} shortcuts`);
    }

    console.log('✅ Core database built successfully');
    console.log(`📍 Location: ${CORE_DB_PATH}`);
    console.log(`📊 Total shortcuts: ${seedData.shortcuts.length}`);
    console.log(`📱 Total apps: ${seedData.apps.length}`);

  } catch (error) {
    console.error('❌ Error building core database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  buildCoreDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { buildCoreDatabase };
