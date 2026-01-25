/**
 * Prisma Client Singleton
 * Ensures single database connection in development
 */

import { PrismaClient } from '@prisma/client';

// CRITICAL: Log DATABASE_URL for debugging
console.log('========================================');
console.log('[PRISMA INIT] Module loading...');
console.log('[PRISMA INIT] DATABASE_URL length:', (process.env.DATABASE_URL || '').length);
console.log('[PRISMA INIT] DATABASE_URL starts with:', (process.env.DATABASE_URL || 'EMPTY').substring(0, 30));
console.log('[PRISMA INIT] DIRECT_URL length:', (process.env.DIRECT_URL || '').length);
console.log('[PRISMA INIT] All DATABASE vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
console.log('========================================');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[PRISMA FATAL] DATABASE_URL is not set!');
  console.error('[PRISMA FATAL] Environment has', Object.keys(process.env).length, 'variables');
  throw new Error('DATABASE_URL environment variable is required');
}

if (databaseUrl.includes('localhost')) {
  console.error('[PRISMA WARNING] DATABASE_URL contains localhost!');
  console.error('[PRISMA WARNING] Value:', databaseUrl);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log('[PRISMA INIT] Creating PrismaClient with datasources override...');

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

console.log('[PRISMA INIT] PrismaClient created successfully');

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
