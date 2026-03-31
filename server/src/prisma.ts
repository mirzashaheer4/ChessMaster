import { PrismaClient } from '@prisma/client';

// Lazy-initialized Prisma client
// The PrismaClient reads DATABASE_URL from process.env at construction time.
// We use a getter to ensure dotenv.config() has run before the client is created.
let _prisma: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = new PrismaClient();
    }
    return (_prisma as any)[prop];
  }
});
