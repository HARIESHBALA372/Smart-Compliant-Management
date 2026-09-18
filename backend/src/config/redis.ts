import Redis from 'ioredis'
import { env } from './env'
import { logger } from '../utils/logger'

/**
 * Redis connection manager.
 *
 * Reads process.env at call-time (not import-time) so the Test suite can
 * disable Redis without re-creating the module graph, and so a dedicated
 * integration test can opt in by setting REDIS_ENABLED=true.
 *
 * The application is designed to run in "degraded mode" when Redis is
 * unavailable: caching, queues and Redis rate limiting degrade to no-ops
 * while the API continues to work against PostgreSQL alone.
 */

export function isRedisEnabled(): boolean {
  return process.env.REDIS_ENABLED !== 'false'
}

export function redisConnectionString(): string {
  return process.env.REDIS_CONNECTION_STRING ?? env.REDIS_CONNECTION_STRING
}

let client: Redis | null = null
let initPromise: Promise<Redis | null> | null = null
let lastFailureAt = 0
const RETRY_COOLDOWN_MS = 15_000

async function createClient(): Promise<Redis | null> {
  const redis = new Redis(redisConnectionString(), {
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    keepAlive: 15_000,
  })

  redis.on('error', (err) => {
    logger.warn({ message: `Redis connection error: ${err.message}` })
  })

  try {
    await redis.connect()
    await redis.ping()
    client = redis
    logger.info('Connected to Redis')
    return redis
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn({
      message: 'Redis unavailable — running in degraded mode (caching, queues and rate limits disabled)',
      reason: message,
    })
    redis.disconnect()
    lastFailureAt = Date.now()
    return null
  }
}

/**
 * Returns a connected Redis instance, or `null` when Redis is disabled or
 * unreachable. Failures are retried at most every RETRY_COOLDOWN_MS.
 */
export async function getRedis(): Promise<Redis | null> {
  if (!isRedisEnabled()) return null

  if (client && client.status === 'ready') return client
  if (client && client.status === 'connecting') return client

  if (initPromise) {
    const result = await initPromise
    return result
  }

  if (lastFailureAt > 0 && Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) {
    return null
  }

  initPromise = createClient()
  const result = await initPromise
  initPromise = null
  return result
}

/** Best-effort PING for health checks. */
export async function pingRedis(): Promise<boolean> {
  const redis = await getRedis()
  if (!redis) return false
  try {
    const pong = await redis.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined)
    client = null
  }
  initPromise = null
}