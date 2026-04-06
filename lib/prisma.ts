import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  // Per il runtime usiamo DIRECT_URL (senza pgbouncer) se disponibile,
  // altrimenti puliamo DATABASE_URL dai parametri pgbouncer
  let connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
  // Rimuove ?pgbouncer=true che non è supportato dal driver pg nativo
  connectionString = connectionString.replace(/[?&]pgbouncer=true/gi, '').replace(/\?$/, '')

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
