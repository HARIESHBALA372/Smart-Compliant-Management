import { getRedis } from '../../config/redis'

/**
 * Redis fixed-window rate limiter. Counters are atomic (Lua), expire with the
 * window, and follow the key convention SmartComplaint:rate-limit:*.
 *
 * Returns `null` when Redis is disabled/unreachable so callers can degrade to
 * either passing the request or an in-memory limiter.
 */

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetInSeconds: number
}

const INCR_EXPIRE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`

export async function redisRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  const redis = await getRedis()
  if (!redis) return null

  try {
    const result = (await redis.eval(INCR_EXPIRE_SCRIPT, 1, key, String(windowSeconds))) as [number, number]
    const count = result[0]
    const ttl = result[1]

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(limit - count, 0),
      resetInSeconds: ttl,
    }
  } catch (err) {
    return null
  }
}

export const RateLimitKeys = {
  byIp: (ip: string): string => `SmartComplaint:rate-limit:ip:${ip}`,
  byUser: (userId: string): string => `SmartComplaint:rate-limit:user:${userId}`,
  complaintSubmission: (userId: string): string => `SmartComplaint:rate-limit:complaints:user:${userId}`,
}