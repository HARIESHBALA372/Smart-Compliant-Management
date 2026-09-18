import type { NextFunction, Request, Response } from 'express'
import { isRedisEnabled } from '../config/redis'
import { redisRateLimit } from '../services/redis/rate-limit.service'

interface RedisRateLimiterOptions {
  keyBuilder: (req: Request) => string
  limit: number
  windowSeconds: number
  message: string
}

/**
 * Redis-backed rate limiter middleware.
 *
 * - Redis disabled / unavailable → request passes through (the in-memory
 *   express-rate-limit middleware remains the baseline guard).
 * - Limit exceeded → 429 Too Many Requests.
 */
export function redisRateLimiter(options: RedisRateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isRedisEnabled()) {
      next()
      return
    }

    const result = await redisRateLimit(options.keyBuilder(req), options.limit, options.windowSeconds)

    if (!result) {
      next()
      return
    }

    res.setHeader('ratelimit-policy', `${result.limit};w=${options.windowSeconds}`)
    res.setHeader('ratelimit', `limit=${result.limit}, remaining=${result.remaining}, reset=${result.resetInSeconds}`)

    if (!result.allowed) {
      res.status(429).json({ success: false, message: options.message })
      return
    }
    next()
  }
}