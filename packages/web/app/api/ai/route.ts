import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, isTokenInvalidated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PostgresAdapter } from '@katasumi/core/dist/postgres-adapter';
import { AISearchEngine } from '@katasumi/core/dist/ai-search-engine';
import type { Platform } from '@katasumi/core/dist/types';

/**
 * POST /api/ai
 * AI-enhanced search with natural language understanding
 * FREE users: Must provide their own API key in request body
 * PREMIUM users: Can use built-in AI with internal protected API key
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body first to check for user-provided API key
    const body = await request.json();
    const { query, platform, app, category, userApiKey, aiProvider: userProvider } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Check if user is authenticated
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    
    let userId: string | null = null;
    let isPremium = false;
    
    if (token && !isTokenInvalidated(token)) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
            tier: true,
          },
        });
        
        if (user) {
          userId = user.id;
          isPremium =
            (user.subscriptionStatus === 'premium' || user.subscriptionStatus === 'enterprise') &&
            (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());
        }
      }
    }
    
    // Determine which API key to use
    let aiConfig: any;
    
    if (userApiKey) {
      // User provided their own API key (free tier or premium user preferring their own key)
      aiConfig = {
        provider: (userProvider || 'openai') as 'openai' | 'anthropic' | 'openrouter' | 'ollama',
        apiKey: userApiKey,
        timeout: 5000,
      };
    } else if (isPremium) {
      // Premium user using built-in AI
      const aiProvider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'openrouter' | 'ollama';
      aiConfig = {
        provider: aiProvider,
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL,
        baseUrl: process.env.AI_BASE_URL,
        timeout: parseInt(process.env.AI_TIMEOUT || '5000'),
      };
    } else {
      // Free user without API key
      return NextResponse.json(
        {
          error: 'AI API key required',
          message: 'Free tier requires you to provide your own AI API key. Premium users can use built-in AI.',
          upgradeUrl: '/pricing',
          hint: 'Provide "userApiKey" and "aiProvider" (openai/anthropic/openrouter) in request body',
        },
        { status: 403 }
      );
    }
    
    // Initialize AI search engine
    const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/katasumi';
    const adapter = new PostgresAdapter(dbUrl);
    const aiEngine = new AISearchEngine(aiConfig, adapter);
    
    // Perform AI-enhanced search
    const filters: any = {};
    if (app) filters.app = app;
    if (platform) filters.platform = platform as Platform;
    if (category) filters.category = category;
    
    const results = await aiEngine.semanticSearch(query, filters, 10);
    
    // Log AI usage for rate limiting (only for authenticated users)
    if (userId) {
      await prisma.aiUsage.create({
        data: {
          userId,
          query,
        },
      });
    }
    
    return NextResponse.json({
      results,
      enhanced: true,
      provider: aiConfig.provider,
      usingBuiltInAI: !userApiKey && isPremium,
    });
  } catch (error) {
    console.error('AI search error:', error);
    
    // Check if it's an AI provider error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('API key') || errorMessage.includes('provider') || errorMessage.includes('401')) {
      return NextResponse.json(
        { error: 'AI service unavailable or invalid API key. Please check your API key or try keyword search instead.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to perform AI search' },
      { status: 500 }
    );
  }
}
