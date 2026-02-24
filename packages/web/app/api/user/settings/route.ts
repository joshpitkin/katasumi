import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, isTokenInvalidated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';

/**
 * GET /api/user/settings
 * Get current user settings including AI configuration
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
        tier: true,
        aiProvider: true,
        aiApiKeyEncrypted: true,
        aiModel: true,
        aiBaseUrl: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get today's AI usage count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usageCount = await prisma.aiUsage.count({
      where: {
        userId: user.id,
        timestamp: { gte: today },
      },
    });
    
    const isPremium =
      (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'enterprise') &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());
    const isEnterprise = user.subscriptionStatus === 'enterprise';
    
    // Mask API key for security
    const maskedApiKey = user.aiApiKeyEncrypted 
      ? maskApiKey(decrypt(user.aiApiKeyEncrypted))
      : undefined;
    
    return NextResponse.json({
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      aiKeyMode: user.aiKeyMode,
      tier: user.tier,
      isPremium,
      isEnterprise,
      aiConfig: {
        provider: user.aiProvider,
        apiKey: maskedApiKey,
        model: user.aiModel,
        baseUrl: user.aiBaseUrl,
      },
      aiUsage: {
        usedToday: usageCount,
        dailyLimit: isEnterprise ? null : 100,
        unlimited: isEnterprise,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/settings
 * Update user settings
 */
export async function PATCH(request: NextRequest) {
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
    
    const body = await request.json();
    const { aiKeyMode, aiProvider, aiApiKey, aiModel, aiBaseUrl } = body;
    
    if (aiKeyMode && !['personal', 'builtin'].includes(aiKeyMode)) {
      return NextResponse.json(
        { error: 'Invalid aiKeyMode. Must be "personal" or "builtin"' },
        { status: 400 }
      );
    }
    
    // Validate AI provider if provided
    const validProviders = ['openai', 'anthropic', 'openrouter', 'gemini', 'custom'];
    if (aiProvider && !validProviders.includes(aiProvider)) {
      return NextResponse.json(
        { error: `Invalid aiProvider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if user is premium when trying to enable builtin
    if (aiKeyMode === 'builtin') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
        },
      });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const isPremium =
        (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'enterprise') &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());
      
      if (!isPremium) {
        return NextResponse.json(
          { 
            error: 'Built-in AI requires premium subscription',
            upgradeUrl: '/pricing',
          },
          { status: 403 }
        );
      }
    }
    
    // Prepare update data
    const updateData: Record<string, string | null> = {};
    if (aiKeyMode !== undefined) updateData.aiKeyMode = aiKeyMode;
    if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    if (aiModel !== undefined) updateData.aiModel = aiModel;
    if (aiBaseUrl !== undefined) updateData.aiBaseUrl = aiBaseUrl;
    
    // Encrypt API key if provided
    if (aiApiKey !== undefined) {
      updateData.aiApiKeyEncrypted = aiApiKey ? encrypt(aiApiKey) : null;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        aiKeyMode: true,
        aiProvider: true,
        aiModel: true,
        aiBaseUrl: true,
      },
    });
    
    return NextResponse.json({
      message: 'Settings updated successfully',
      aiKeyMode: updatedUser.aiKeyMode,
      aiProvider: updatedUser.aiProvider,
      aiModel: updatedUser.aiModel,
      aiBaseUrl: updatedUser.aiBaseUrl,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
