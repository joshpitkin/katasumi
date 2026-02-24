import { PrismaClientPostgres } from '@katasumi/core';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create a singleton instance of Prisma Client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientPostgres | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || 'postgres://katasumi:dev_password@localhost:5432/katasumi_dev';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClientPostgres({ adapter });
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * User with password field
 */
export interface UserWithPassword {
  id: string;
  email: string;
  passwordHash: string;
  tier: string;
  subscriptionStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createUser(
  email: string,
  password: string,
  tier: string = 'pending',
  subscriptionStatus: string = 'pending'
): Promise<UserWithPassword> {
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
      passwordHash,
      tier,
      subscriptionStatus,
    },
  });
  
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    tier: user.tier,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    tier: user.tier,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserById(id: string): Promise<UserWithPassword | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    tier: user.tier,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
