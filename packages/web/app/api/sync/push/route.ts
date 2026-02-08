import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface ShortcutInput {
  id?: string;
  app: string;
  action: string;
  keys: {
    mac?: string;
    windows?: string;
    linux?: string;
  };
  context?: string;
  category?: string;
  tags: string[];
  source?: {
    type: string;
    url?: string;
    scrapedAt?: string;
    confidence?: number;
  };
}

/**
 * POST /api/sync/push
 * Push shortcuts to server
 * PREMIUM FEATURE: Requires active premium subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Verify premium access
    const authResult = await requirePremium(request, prisma);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    const { user } = authResult;
    
    // Parse request body
    const body = await request.json();
    const { shortcuts } = body;
    
    if (!Array.isArray(shortcuts)) {
      return NextResponse.json(
        { error: 'shortcuts must be an array' },
        { status: 400 }
      );
    }
    
    // Validate and insert/update shortcuts
    const results = await Promise.allSettled(
      shortcuts.map(async (shortcut: ShortcutInput) => {
        // Validate required fields
        if (!shortcut.app || !shortcut.action) {
          throw new Error('app and action are required');
        }
        
        const data = {
          userId: user.id,
          app: shortcut.app,
          action: shortcut.action,
          keysMac: shortcut.keys.mac || null,
          keysWindows: shortcut.keys.windows || null,
          keysLinux: shortcut.keys.linux || null,
          context: shortcut.context || null,
          category: shortcut.category || null,
          tags: (shortcut.tags || []).join(','),
          sourceType: shortcut.source?.type || 'user-added',
          sourceUrl: shortcut.source?.url || null,
          sourceScrapedAt: shortcut.source?.scrapedAt
            ? new Date(shortcut.source.scrapedAt)
            : null,
          sourceConfidence: shortcut.source?.confidence || null,
        };
        
        // Upsert shortcut
        if (shortcut.id) {
          // Verify user owns this shortcut
          const existing = await prisma.userShortcut.findUnique({
            where: { id: shortcut.id },
          });
          
          if (existing && existing.userId !== user.id) {
            throw new Error('User does not own this shortcut');
          }
          
          return await prisma.userShortcut.upsert({
            where: { id: shortcut.id },
            update: data,
            create: { ...data, id: shortcut.id },
          });
        } else {
          return await prisma.userShortcut.create({ data });
        }
      })
    );
    
    // Count successful and failed operations
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // Log sync operation
    await prisma.syncLog.create({
      data: {
        userId: user.id,
        operation: 'push',
        status: failed === 0 ? 'success' : failed === results.length ? 'failed' : 'partial',
        details: JSON.stringify({
          total: shortcuts.length,
          successful,
          failed,
          errors: results
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason.message),
        }),
      },
    });
    
    return NextResponse.json({
      message: 'Push completed',
      successful,
      failed,
      total: shortcuts.length,
    });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
