import { PrismaClient } from '@prisma/client';

/**
 * Singleton de PrismaClient.
 * ARQUITECTURA.md: prohibido instanciar `new PrismaClient()` dentro de un módulo.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // RF-SEG-06-07: el detalle técnico se registra internamente, nunca se expone.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
