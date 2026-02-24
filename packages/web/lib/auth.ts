import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClientPostgres } from '@katasumi/core';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  subscriptionStatus?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

/**
 * Invalidated tokens store (in-memory, for production use Redis)
 */
const invalidatedTokens = new Set<string>();

/**
 * Invalidate a token
 */
export function invalidateToken(token: string): void {
  invalidatedTokens.add(token);
}

/**
 * Check if token is invalidated
 */
export function isTokenInvalidated(token: string): boolean {
  return invalidatedTokens.has(token);
}

/**
 * Verify user has premium subscription
 * Returns user object if premium, null otherwise
 */
export async function verifyPremiumAccess(
  prisma: PrismaClientPostgres,
  userId: string
): Promise<{ user: any; isPremium: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) {
    return { user: null, isPremium: false };
  }

  const isPremium =
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'enterprise') &&
    (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());

  return { user, isPremium };
}

/**
 * Middleware to require premium subscription
 * Returns user if premium, or error response
 */
export async function requirePremium(
  request: NextRequest,
  prisma: PrismaClientPostgres
): Promise<{ user: any } | NextResponse> {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required. Premium feature requires login.' },
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

  // Verify premium access
  const { user, isPremium } = await verifyPremiumAccess(prisma, payload.userId);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  if (!isPremium) {
    return NextResponse.json(
      {
        error: 'Premium subscription required',
        message: 'This feature requires a premium subscription. Please upgrade to access sync and built-in AI features.',
        upgradeUrl: '/pricing',
      },
      { status: 403 }
    );
  }

  return { user };
}
