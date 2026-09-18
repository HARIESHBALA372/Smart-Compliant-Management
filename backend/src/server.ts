import { createApp } from './app'
import { env } from './config/env'
import { prisma, disconnectDatabase } from './config/database'
import { disconnectRedis } from './config/redis'
import { logger } from './utils/logger'
import { startWorkers } from './workers'
import { attachWebSocketServer } from './services/websocket.service'

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Connected to PostgreSQL database')

    // Background workers consume the Redis queues (degraded to no-ops when
    // Redis is unavailable).
    const workers = startWorkers()

    const app = await createApp()

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 API ready — http://localhost:${env.PORT}/api`)
      logger.info(`📚 Swagger docs — http://localhost:${env.PORT}/api/docs`)
    })

    const closeWebSocket = attachWebSocketServer(server)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`)
      workers.stop()
      closeWebSocket()
      server.close(async () => {
        await disconnectDatabase()
        await disconnectRedis()
        process.exit(0)
      })

      setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
      }, 10_000).unref()
    }

    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (error) {
    logger.error({ message: 'Failed to start server', error })
    process.exit(1)
  }
}

void bootstrap()