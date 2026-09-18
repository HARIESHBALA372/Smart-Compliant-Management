import { getRedis } from '../../config/redis'
import { logger } from '../../utils/logger'

/**
 * Minimal Redis list-based queue used for background work such as complaint
 * processing and notification delivery. Producers `lpush`, a single consumer
 * `brpop`s jobs. When Redis is unavailable the enqueue helpers return `false`
 * and callers simply continue without background work.
 */

export const QueueNames = {
  complaints: 'SmartComplaint:queue:complaints',
  notifications: 'SmartComplaint:queue:notifications',
} as const

export async function enqueue<T>(queue: string, job: T): Promise<boolean> {
  const redis = await getRedis()
  if (!redis) return false
  try {
    await redis.lpush(queue, JSON.stringify(job))
    return true
  } catch (err) {
    logger.warn({ message: 'Redis queue enqueue failed', queue, error: err })
    return false
  }
}

/**
 * Blocking pop with a timeout. Returns `null` on timeout or when Redis is
 * unavailable or disabled.
 */
export async function dequeue<T>(queue: string, timeoutSeconds = 5): Promise<T | null> {
  const redis = await getRedis()
  if (!redis) return null
  try {
    const result = await redis.brpop(queue, timeoutSeconds)
    if (!result) return null
    return JSON.parse(result[1]) as T
  } catch (err) {
    logger.warn({ message: 'Redis queue dequeue failed', queue, error: err })
    return null
  }
}

export async function queueLength(queue: string): Promise<number> {
  const redis = await getRedis()
  if (!redis) return 0
  try {
    return await redis.llen(queue)
  } catch {
    return 0
  }
}

export async function peek<T>(queue: string, index = 0): Promise<T | null> {
  const redis = await getRedis()
  if (!redis) return null
  try {
    const raw = await redis.lindex(queue, index)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}