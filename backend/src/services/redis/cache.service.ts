import { getRedis } from '../../config/redis'
import { logger } from '../../utils/logger'

/**
 * Redis JSON cache with a stable key convention and TTLs.
 *
 * Every call degrades gracefully: when Redis is disabled or unreachable the
 * cache helpers return `null`/`false` and callers fall back to PostgreSQL.
 */

export const CACHE_TTL = {
  user: 5 * 60,
  complaint: 5 * 60,
  complaintByNumber: 5 * 60,
  department: 2 * 60,
  dashboardStats: 1 * 60,
  departmentStats: 2 * 60,
  aiClassification: 30 * 60,
  notifications: 2 * 60,
} as const

export const Keys = {
  user: (id: string): string => `SmartComplaint:user:${id}`,
  complaint: (id: string): string => `SmartComplaint:complaint:${id}`,
  complaintByNumber: (number: string): string => `SmartComplaint:complaint:number:${number}`,
  department: (id: string): string => `SmartComplaint:department:${id}`,
  dashboardStats: (): string => 'SmartComplaint:stats:dashboard',
  departmentStats: (id: string): string => `SmartComplaint:stats:department:${id}`,
  aiClassification: (id: string): string => `SmartComplaint:ai:classification:${id}`,
  notifications: (userId: string): string => `SmartComplaint:notification:${userId}`,
  unreadNotifications: (userId: string): string => `SmartComplaint:notification:unread:${userId}`,
  notificationPreferences: (userId: string): string => `SmartComplaint:notification:prefs:${userId}`,
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (err) {
    logger.warn({ message: 'Redis cache GET failed', key, error: err })
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const redis = await getRedis()
  if (!redis) return false
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  } catch (err) {
    logger.warn({ message: 'Redis cache SET failed', key, error: err })
    return false
  }
}

export async function cacheDel(...keys: string[]): Promise<number> {
  const redis = await getRedis()
  if (!redis || keys.length === 0) return 0
  try {
    return await redis.del(...keys)
  } catch (err) {
    logger.warn({ message: 'Redis cache DEL failed', error: err })
    return 0
  }
}

/**
 * Cache-aside read helper: returns the cached value or loads it via
 * `loader`, stores the result and returns it.
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const value = await loader()
  await cacheSet(key, value, ttlSeconds)
  return value
}

/**
 * Invalidates all cache entries that depend on a single complaint, including
 * dashboard and department statistics. Any complaint mutation also bumps the
 * analytics namespace so live dashboards refresh (see analytics-cache.service).
 */
export async function invalidateComplaintCaches(complaint: {
  id: string
  complaintNumber: string
  departmentId?: string | null
}): Promise<void> {
  const keys = [
    Keys.complaint(complaint.id),
    Keys.complaintByNumber(complaint.complaintNumber),
    Keys.aiClassification(complaint.id),
    Keys.dashboardStats(),
  ]
  if (complaint.departmentId) {
    keys.push(Keys.departmentStats(complaint.departmentId))
  }
  await cacheDel(...keys)
  // Lazy import avoids a load-order cycle with analytics-cache.service.
  const { invalidateAnalyticsCaches } = await import('../analytics-cache.service')
  void invalidateAnalyticsCaches(`complaint:${complaint.id}`)
}