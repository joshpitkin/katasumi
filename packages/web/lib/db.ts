import { PrismaClient } from '@katasumi/core/dist/generated/prisma-postgres';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create a singleton instance of Prisma Client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/katasumi';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * User with password field (not in Prisma schema, stored in auth table)
 */
export interface UserWithPassword {
  id: string;
  email: string;
  passwordHash: string;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory user store for demo (in production, add password field to User model)
const userPasswordStore = new Map<string, string>();

export async function createUser(email: string, password: string): Promise<UserWithPassword> {
  const { hashPassword } = await import('./auth');
  const passwordHash = await hashPassword(password);
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  const user = await prisma.user.create({
    data: {
      email,
      tier: 'free',
    },
  });
  
  // Store password hash (in production, add this to User model)
  userPasswordStore.set(user.id, passwordHash);
  
  return {
    id: user.id,
    email: user.email,
    passwordHash,
    tier: user.tier,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  
  const passwordHash = userPasswordStore.get(user.id);
  if (!passwordHash) return null;
  
  return {
    id: user.id,
    email: user.email,
    passwordHash,
    tier: user.tier,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserById(id: string): Promise<UserWithPassword | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  
  const passwordHash = userPasswordStore.get(user.id);
  if (!passwordHash) return null;
  
  return {
    id: user.id,
    email: user.email,
    passwordHash,
    tier: user.tier,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
