#!/usr/bin/env node
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const dbUrl = process.env.DATABASE_URL || 'file:./katasumi.db';
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🔍 Verifying seeded data...\n');

    // 1. Query for vim shortcuts and verify count >= 100
    const vimCount = await prisma.shortcut.count({ where: { app: 'vim' } });
    console.log(`✓ Vim shortcuts: ${vimCount} (required >= 100) ${vimCount >= 100 ? '✅' : '❌'}`);

    // 2. Verify vim shortcuts have context (Normal Mode, Insert Mode, etc.)
    const vimWithContext = await prisma.shortcut.findMany({
      where: { app: 'vim', context: { not: null } },
      take: 5
    });
    console.log(`✓ Vim shortcuts with context: ${vimWithContext.length > 0 ? '✅' : '❌'}`);
    if (vimWithContext.length > 0) {
      console.log(`  Example contexts: ${vimWithContext.map(s => s.context).join(', ')}`);
    }

    // 3. Query for tmux and verify pane management shortcuts exist
    const tmuxPaneShortcuts = await prisma.shortcut.count({
      where: { app: 'tmux', category: 'Pane' }
    });
    console.log(`✓ tmux pane management shortcuts: ${tmuxPaneShortcuts} ${tmuxPaneShortcuts > 0 ? '✅' : '❌'}`);

    // 4. Query for VSCode and verify count >= 200
    const vscodeCount = await prisma.shortcut.count({ where: { app: 'vscode' } });
    console.log(`✓ VSCode shortcuts: ${vscodeCount} (required >= 200) ${vscodeCount >= 200 ? '✅' : '❌'}`);

    // 5. Verify all shortcuts have non-empty source.url field
    const totalShortcuts = await prisma.shortcut.count();
    const shortcutsWithSource = await prisma.shortcut.count({
      where: { sourceUrl: { not: null } }
    });
    console.log(`✓ Shortcuts with source URLs: ${shortcutsWithSource}/${totalShortcuts} ${shortcutsWithSource === totalShortcuts ? '✅' : '❌'}`);

    // 6. Verify macOS shortcuts have mac keys but not windows/linux keys
    const macosShortcuts = await prisma.shortcut.findMany({
      where: { app: 'macos' },
      take: 5
    });
    const macosValid = macosShortcuts.every(s => s.keysMac && !s.keysWindows && !s.keysLinux);
    console.log(`✓ macOS shortcuts platform-specific: ${macosValid ? '✅' : '❌'}`);

    // 7. Search for 'copy' and verify results from multiple apps
    const copyShortcuts = await prisma.shortcut.findMany({
      where: {
        OR: [
          { action: { contains: 'copy' } },
          { action: { contains: 'Copy' } }
        ]
      }
    });
    const appsWithCopy = new Set(copyShortcuts.map(s => s.app));
    console.log(`✓ Apps with 'copy' shortcuts: ${appsWithCopy.size} apps ${appsWithCopy.size > 1 ? '✅' : '❌'}`);
    console.log(`  Apps: ${Array.from(appsWithCopy).join(', ')}`);

    // 8. Verify each app has appropriate category
    const apps = await prisma.appInfo.findMany();
    console.log(`✓ App categories:`);
    apps.forEach(app => {
      console.log(`  ${app.displayName.padEnd(25)}: ${app.category}`);
    });

    // Additional verification: verify minimum counts for all apps
    console.log(`\n📊 Minimum counts verification:`);
    const requirements = [
      { app: 'vim', min: 100 },
      { app: 'tmux', min: 50 },
      { app: 'vscode', min: 200 },
      { app: 'git', min: 40 },
      { app: 'bash', min: 30 },
      { app: 'macos', min: 100 },
      { app: 'windows', min: 100 },
      { app: 'gnome', min: 50 }
    ];

    let allPassed = true;
    for (const req of requirements) {
      const count = await prisma.shortcut.count({ where: { app: req.app } });
      const passed = count >= req.min;
      console.log(`  ${req.app.padEnd(10)}: ${count.toString().padStart(3)} / ${req.min.toString().padStart(3)} ${passed ? '✅' : '❌'}`);
      if (!passed) allPassed = false;
    }

    console.log(`\n${allPassed ? '✅ All verification tests passed!' : '❌ Some tests failed'}`);

  } catch (error) {
    console.error('❌ Error verifying data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
