#!/usr/bin/env node
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';
import { apps, shortcuts } from './seed-data';

dotenv.config();

async function seed() {
  const dbUrl = process.env.DATABASE_URL || 'file:./katasumi.db';
  
  console.log('Seeding database with shortcuts data...');
  console.log(`Database URL: ${dbUrl}`);
  
  const adapter = new PrismaLibSql({
    url: dbUrl
  });
  const prisma = new PrismaClient({ adapter });
  
  try {
    // Clear existing data
    console.log('\nClearing existing data...');
    await prisma.shortcut.deleteMany({});
    await prisma.appInfo.deleteMany({});
    console.log('✓ Cleared existing data');
    
    // Insert apps
    console.log('\nInserting app info...');
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
      console.log(`  ✓ ${app.displayName} (${app.shortcutCount} shortcuts)`);
    }
    
    // Insert shortcuts in batches for better performance
    console.log('\nInserting shortcuts...');
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
              sourceScrapedAt: shortcut.source?.scrapedAt,
              sourceConfidence: shortcut.source?.confidence
            }
          })
        )
      );
      console.log(`  ✓ Inserted ${Math.min(i + batchSize, shortcuts.length)}/${shortcuts.length} shortcuts`);
    }
    
    // Verify counts
    console.log('\nVerifying data...');
    const appCount = await prisma.appInfo.count();
    const shortcutCount = await prisma.shortcut.count();
    console.log(`  ✓ Total apps: ${appCount}`);
    console.log(`  ✓ Total shortcuts: ${shortcutCount}`);
    
    // Show shortcuts per app
    console.log('\nShortcuts per app:');
    for (const app of apps) {
      const count = await prisma.shortcut.count({
        where: { app: app.id }
      });
      console.log(`  ${app.displayName.padEnd(25)}: ${count} shortcuts`);
    }
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
