import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/sync/pull
 * Pull shortcuts modified since provided timestamp
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
    
    // Get since parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    
    let since: Date | undefined;
    if (sinceParam) {
      since = new Date(sinceParam);
      if (isNaN(since.getTime())) {
        return NextResponse.json(
          { error: 'Invalid since timestamp' },
          { status: 400 }
        );
      }
    }
    
    // Pull shortcuts for this user
    const shortcuts = await prisma.userShortcut.findMany({
      where: {
        userId: user.id,
        ...(since && { updatedAt: { gte: since } }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Transform to API format
    const result = shortcuts.map((s) => ({
      id: s.id,
      app: s.app,
      action: s.action,
      keys: {
        mac: s.keysMac || undefined,
        windows: s.keysWindows || undefined,
        linux: s.keysLinux || undefined,
      },
      context: s.context || undefined,
      category: s.category || undefined,
      tags: s.tags.split(',').filter(t => t.trim()),
      source: {
        type: s.sourceType,
        url: s.sourceUrl || '',
        scrapedAt: s.sourceScrapedAt || new Date(),
        confidence: s.sourceConfidence || 1.0,
      },
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    
    return NextResponse.json({
      shortcuts: result,
      count: result.length,
      pulledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pull error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
