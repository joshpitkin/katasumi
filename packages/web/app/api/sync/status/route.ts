import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/sync/status
 * Get sync status including last sync timestamp and pending changes count
 * PREMIUM FEATURE: Requires active premium subscription
 */
export async function GET(request: NextRequest) {
  try {
    // Verify premium access
    const authResult = await requirePremium(request, prisma);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    const { user } = authResult;
    
    // Get last successful sync log
    const lastSync = await prisma.syncLog.findFirst({
      where: {
        userId: user.id,
        status: 'success',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Count pending changes (shortcuts modified after last sync)
    const lastSyncTime = lastSync?.createdAt || new Date(0);
    const pendingChangesCount = await prisma.userShortcut.count({
      where: {
        userId: user.id,
        updatedAt: {
          gt: lastSyncTime,
        },
      },
    });
    
    // Total shortcuts count
    const totalShortcuts = await prisma.userShortcut.count({
      where: {
        userId: user.id,
      },
    });
    
    return NextResponse.json({
      lastSyncAt: lastSync?.createdAt || null,
      pendingChanges: pendingChangesCount,
      totalShortcuts,
      syncStatus: lastSync?.status || 'never',
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
