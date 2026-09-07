import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import config from './index';

/**
 * Singleton Prisma client instance.
 *
 * Prisma 7 requires an explicit driver adapter for database connections.
 * We use @prisma/adapter-pg for PostgreSQL.
 *
 * In development, we store the client on `globalThis` to prevent
 * hot-reload from creating multiple database connections.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: config.db.url,
  });

  return new PrismaClient({
    adapter,
    log: config.isDevelopment() ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.isDevelopment()) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
