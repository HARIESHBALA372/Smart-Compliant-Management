import { EventEmitter } from 'events'
import { getRedis } from '../config/redis'
import { cacheGet, cacheSet } from './redis/cache.service'
import { publishAnalyticsEvent } from './redis/pubsub.service'
import { logger } from '../utils/logger'

/**
 * Analytics-specific caching + realtime invalidation.
 *
 * Analytics payloads are cached under a versioned namespace
 * (`SmartComplaint:analytics:v<version>:<scope>:<endpoint>:<filterHash>`).
 * Whenever a complaint is created/updated/deleted the version is bumped — old
 * entries become unreachable immediately and lazily expire via their TTL. This
 * avoids scanning Redis for keys and works with a large key space.
 *
 * The analytics event bus (`analyticsBus`) is the in-process realtime signal;
 * the Redis pub/sub relay keeps multiple API instances in sync. When Redis is
 * unavailable the whole layer degrades to no-ops and analytics hit PostgreSQL
 * directly — identical, just without the cache.
 */

export const ANALYTICS_TTL = {
  overview: 45,
  complaints: 60,
  trends: 90,
  categories: 90,
  status: 90,
  priority: 90,
  resolution: 60,
  sla: 45,
  agents: 60,
  departments: 60,
  locations: 120,
  users: 60,
  ml: 120,
  insights: 45,
} as const

const VERSION_KEY = 'SmartComplaint:analytics:version'

/** In-process bus consumed by the WebSocket gateway. */
export const analyticsBus = new EventEmitter()
analyticsBus.setMaxListeners(100)

/**
 * Returns the current analytics cache namespace version. If the key is missing
 * (first run or Redis flushed) it is initialised to e.g. `v1`.
 */
export async function analyticsVersion(): Promise<number> {
  const redis = await getRedis()
  if (!redis) return 0
  try {
    const raw = await redis.get(VERSION_KEY)
    if (raw === null) {
      await redis.set(VERSION_KEY, '1', 'EX', 24 * 60 * 60)
      return 1
    }
    return Number(raw) || 1
  } catch (err) {
    logger.warn({ message: 'Analytics version read failed', error: err })
    return 0
  }
}

/** Bumps the namespace version so all cached analytics become stale. */
export async function bumpAnalyticsVersion(): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.incr(VERSION_KEY)
  } catch (err) {
    logger.warn({ message: 'Analytics version bump failed', error: err })
  }
}

function analyticsKey(scope: string, endpoint: string, version: number, hash: string): string {
  return `SmartComplaint:analytics:v${version}:${scope}:${endpoint}:${hash}`
}

/** Compact stable hash for a filter object (used in cache keys). */
export function filterKey(filters: Record<string, unknown>): string {
  const canonical = Object.keys(filters)
    .sort()
    .map((k) => `${k}=${filters[k] == null ? '' : String(filters[k])}`)
    .join('&')
  let hash = 0
  for (let i = 0; i < canonical.length; i += 1) {
    hash = (hash * 31 + canonical.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

/**
 * Reads a value from the versioned analytics cache. Returns `null` when the
 * cache is unavailable or the entry does not exist (caller falls back to DB).
 */
export async function analyticsCacheGet<T>(
  scope: string,
  endpoint: string,
  filters: object,
): Promise<T | null> {
  const version = await analyticsVersion()
  return cacheGet<T>(analyticsKey(scope, endpoint, version, filterKey(filters as Record<string, unknown>)))
}

/** Writes a value into the versioned analytics cache. Silent no-op on failure. */
export async function analyticsCacheSet<T>(
  scope: string,
  endpoint: string,
  filters: object,
  value: T,
  ttlSeconds: number,
): Promise<boolean> {
  const version = await analyticsVersion()
  if (version === 0) return false
  return cacheSet(analyticsKey(scope, endpoint, version, filterKey(filters as Record<string, unknown>)), value, ttlSeconds)
}

/**
 * Cache-aside read for analytics payloads. `loader` runs only on a miss and
 * its result is stored under the versioned namespace.
 */
export async function analyticsRemember<T>(
  scope: string,
  endpoint: string,
  filters: object,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await analyticsCacheGet<T>(scope, endpoint, filters)
  if (cached !== null && cached !== undefined) return cached
  const value = await loader()
  void analyticsCacheSet(scope, endpoint, filters, value, ttlSeconds)
  return value
}

/** Broadcasts to live dashboards and bumps the cache namespace. */
export async function invalidateAnalyticsCaches(
  reason: string,
  complaintId?: string,
): Promise<void> {
  await bumpAnalyticsVersion()
  const updatedAt = new Date().toISOString()
  analyticsBus.emit('analytics:updated', { reason, updatedAt, complaintId })
  void publishAnalyticsEvent({ reason, updatedAt, complaintId })
}