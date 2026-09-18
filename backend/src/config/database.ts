import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { isProduction } from './env'

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

prisma.$on('error', (event) => {
  logger.error({ message: `Prisma error: ${event.message}` })
})

prisma.$on('warn', (event) => {
  logger.warn({ message: event.message })
})

prisma.$on('query', (event) => {
  if (!isProduction) {
    logger.debug({ message: event.query, params: event.params, duration: `${event.duration}ms` })
  }
})

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}