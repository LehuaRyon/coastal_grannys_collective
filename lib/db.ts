import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { level: 'warn', emit: 'stdout' },
      { level: 'error', emit: 'event' },
    ],
  });

  // Suppress Neon serverless connection lifecycle noise.
  // These fire when Neon's free-tier compute suspends and drops idle
  // connections — Prisma reconnects automatically on the next query.
  client.$on('error', (e) => {
    if (e.message.includes('kind: Closed') || e.message.includes('E57P01')) return;
    console.error('[prisma:error]', e.message);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
