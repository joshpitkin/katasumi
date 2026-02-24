import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, isTokenInvalidated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/sync/config
 * Sync AI configuration from web to TUI (premium feature)
 * Returns decrypted AI configuration for authenticated premium users
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    
    if (!token || isTokenInvalidated(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        aiKeyMode: true,
        aiProvider: true,
        aiApiKeyEncrypted: true,
        aiModel: true,
        aiBaseUrl: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has an active subscription
    const isPremium =
      (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'enterprise') &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());
    
    if (!isPremium) {
      return NextResponse.json(
        { 
          error: 'AI config sync requires premium subscription',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }
    
    // Decrypt API key if present
    const aiApiKey = user.aiApiKeyEncrypted 
      ? decrypt(user.aiApiKeyEncrypted)
      : undefined;
    
    return NextResponse.json({
      aiKeyMode: user.aiKeyMode,
      aiConfig: user.aiKeyMode === 'personal' && user.aiProvider ? {
        provider: user.aiProvider,
        apiKey: aiApiKey,
        model: user.aiModel,
        baseUrl: user.aiBaseUrl,
      } : null,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync config error:', error);
    return NextResponse.json(
      { error: 'Failed to sync configuration' },
      { status: 500 }
    );
  }
}
