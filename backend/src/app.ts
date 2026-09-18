import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { pinoHttp } from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import apiRouter from './routes'
import { env } from './config/env'
import { logger } from './utils/logger'
import { notFoundHandler, errorHandler } from './middleware/error'
import { generalLimiter, authLimiter } from './middleware/rate-limit'
import { redisRateLimiter } from './middleware/redis-rate-limit'
import { RateLimitKeys } from './services/redis/rate-limit.service'
import { swaggerSpec } from './docs/swagger'

export async function createApp(): Promise<express.Express> {
  const app = express()

  app.use(helmet())

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true, limit: '2mb' }))

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
      redact: { paths: ['req.headers.authorization'], censor: '[REDACTED]' },
    }),
  )

  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)))

  app.use(generalLimiter)
  app.use('/api/auth/login', authLimiter)

  // Redis-backed limits on top of the baseline in-memory ones. These are
  // no-ops while Redis is disabled/unreachable (degraded mode).
  app.use(
    '/api/auth/login',
    redisRateLimiter({
      keyBuilder: (req) => RateLimitKeys.byIp(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
      limit: 5,
      windowSeconds: 900,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    }),
  )
  app.use(
    '/api',
    redisRateLimiter({
      keyBuilder: (req) => RateLimitKeys.byUser(req.user?.id ?? req.ip ?? 'anonymous'),
      limit: 100,
      windowSeconds: 60,
      message: 'Too many requests, please try again later.',
    }),
  )

  app.use('/api', apiRouter)

  const spec = await swaggerSpec()
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec as never))

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Smart Complaint Management API',
      docs: `/api/docs`,
      health: `/api/health`,
    })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}