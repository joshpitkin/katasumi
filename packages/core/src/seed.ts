#!/usr/bin/env node
import { PrismaClient } from '../src/generated/prisma';
import { PrismaClient as PrismaClientPostgres } from '../src/generated/prisma-postgres';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';
import { apps, shortcuts } from './seed-data';

dotenv.config();

async function seed() {
  const dbType = process.env.DB_TYPE || 'sqlite';
  let dbUrl = process.env.DATABASE_URL || 'file:./katasumi.db';
  
  // Normalize PostgreSQL URL scheme
  if (dbUrl.startsWith('postgresql://')) {
    dbUrl = dbUrl.replace('postgresql://', 'postgres://');
  }
  
  console.log('🌱 Seeding database with shortcuts data...');
  console.log(`Database URL: ${dbUrl}`);
  
  let prisma: any;
  
  if (dbType === 'postgres') {
    // Use PostgreSQL client with pg adapter
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClientPostgres({ adapter });
  } else {
    // Use SQLite client with adapter
    const adapter = new PrismaLibSql({
      url: dbUrl
    });
    prisma = new PrismaClient({ adapter });
  }
  
  try {
    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await prisma.shortcut.deleteMany({});
    await prisma.appInfo.deleteMany({});
    console.log('  ✓ Cleared existing data');
    
    // Insert apps
    console.log('\n📱 Inserting app info...');
    for (const app of apps) {
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
      console.log(`  ✓ ${app.displayName.padEnd(25)} (${app.shortcutCount} shortcuts)`);
    }
    
    // Insert shortcuts in batches for better performance
    console.log('\n⌨️  Inserting shortcuts...');
    const batchSize = 100;
    for (let i = 0; i < shortcuts.length; i += batchSize) {
      const batch = shortcuts.slice(i, i + batchSize);
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
      console.log(`  ✓ Inserted ${Math.min(i + batchSize, shortcuts.length)}/${shortcuts.length} shortcuts`);
    }
    
    // Verify counts
    console.log('\n📊 Verifying data...');
    const appCount = await prisma.appInfo.count();
    const shortcutCount = await prisma.shortcut.count();
    console.log(`  ✓ Total apps: ${appCount}`);
    console.log(`  ✓ Total shortcuts: ${shortcutCount}`);
    
    // Show shortcuts per app
    console.log('\n🔍 Shortcuts per app:');
    for (const app of apps) {
      const count = await prisma.shortcut.count({
        where: { app: app.id }
      });
      console.log(`  ${app.displayName.padEnd(25)}: ${count} shortcuts`);
    }
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
