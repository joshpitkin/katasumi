import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, isTokenInvalidated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PostgresAdapter } from '@katasumi/core/dist/postgres-adapter';
import { AISearchEngine } from '@katasumi/core/dist/ai-search-engine';
import type { Platform } from '@katasumi/core/dist/types';

/**
 * POST /api/ai
 * AI-enhanced search with natural language understanding
 * Rate limited to 5 queries per day for free users
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required for AI search' },
        { status: 401 }
      );
    }
    
    if (isTokenInvalidated(token)) {
      return NextResponse.json(
        { error: 'Token has been invalidated' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get user to check tier
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check rate limit for free users
    if (user.tier === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const usageCount = await prisma.aiUsage.count({
        where: {
          userId: payload.userId,
          timestamp: {
            gte: today,
          },
        },
      });
      
      if (usageCount >= 5) {
        return NextResponse.json(
          { 
            error: 'Daily AI query limit reached. Free users are limited to 5 AI queries per day. Upgrade to Pro for unlimited queries.',
            limit: 5,
            used: usageCount,
          },
          { status: 429 }
        );
      }
    }
    
    // Parse request body
    const body = await request.json();
    const { query, platform, app, category } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Initialize AI search engine
    const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/katasumi';
    const adapter = new PostgresAdapter(dbUrl);
    
    // Get AI provider config from environment
    const aiProvider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    const aiConfig = {
      provider: aiProvider,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
      baseUrl: process.env.AI_BASE_URL,
      timeout: parseInt(process.env.AI_TIMEOUT || '5000'),
    };
    
    const aiEngine = new AISearchEngine(aiConfig, adapter);
    
    // Perform AI-enhanced search
    const filters: any = {};
    if (app) filters.app = app;
    if (platform) filters.platform = platform as Platform;
    if (category) filters.category = category;
    
    const results = await aiEngine.semanticSearch(query, filters, 10);
    
    // Log AI usage for rate limiting
    await prisma.aiUsage.create({
      data: {
        userId: payload.userId,
        query,
      },
    });
    
    return NextResponse.json({
      results,
      enhanced: true,
      provider: aiProvider,
    });
  } catch (error) {
    console.error('AI search error:', error);
    
    // Check if it's an AI provider error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('API key') || errorMessage.includes('provider')) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try keyword search instead.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to perform AI search' },
      { status: 500 }
    );
  }
}
