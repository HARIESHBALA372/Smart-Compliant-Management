/**
 * Redis integration tests.
 *
 * These tests are OPT-IN: they require a running Redis on
 * REDIS_CONNECTION_STRING (default redis://localhost:6379) and are skipped
 * unless the suite is started with REDIS_ENABLED=true:
 *
 *   $env:REDIS_ENABLED='true'; npm test -- redis          (PowerShell)
 *   REDIS_ENABLED=true npm test redis                     (bash / WSL)
 *
 * Use `docker compose up redis` (or `docker run -p 6379:6379 redis:7-alpine`)
 * to start a local Redis for these tests.
 */
import { pingRedis, disconnectRedis } from '../src/config/redis'
import {
  CACHE_TTL,
  Keys,
  cacheSet,
  cacheGet,
  cacheDel,
  cacheRemember,
  invalidateComplaintCaches,
} from '../src/services/redis/cache.service'
import { QueueNames, enqueue, dequeue } from '../src/services/redis/queue.service'
import { redisRateLimit, RateLimitKeys } from '../src/services/redis/rate-limit.service'

const REDIS_AVAILABLE = process.env.REDIS_ENABLED === 'true'
const describeRedis = REDIS_AVAILABLE ? describe : describe.skip
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describeRedis('Redis integration', () => {
  afterAll(async () => {
    await disconnectRedis()
  })

  it('reports a healthy PING', async () => {
    expect(await pingRedis()).toBe(true)
  })

  it('round-trips JSON through the cache and honours TTLs', async () => {
    const key = `SmartComplaint:test:cache:${suffix}`
    const payload = { hello: 'world', n: 42, nested: { ok: true } }

    await cacheSet(key, payload, CACHE_TTL.complaint)
    expect(await cacheGet<typeof payload>(key)).toEqual(payload)

    await cacheDel(key)
    expect(await cacheGet(key)).toBeNull()
  })

  it('cacheRemember loads once and reuses the cached value', async () => {
    const key = `SmartComplaint:test:remember:${suffix}`
    let calls = 0
    const loader = async () => {
      calls += 1
      return { value: calls }
    }

    const first = await cacheRemember(key, CACHE_TTL.complaint, loader)
    const second = await cacheRemember(key, CACHE_TTL.complaint, loader)

    expect(first).toEqual({ value: 1 })
    expect(second).toEqual({ value: 1 })
    expect(calls).toBe(1)
  })

  it('invalidates complaint, number, dashboard and department keys', async () => {
    const id = `test-complaint-${suffix}`
    const departmentId = `test-dept-${suffix}`
    const complaint = { id, complaintNumber: `SCM-2026-TEST${suffix}`, departmentId }

    await cacheSet(Keys.complaint(id), complaint, CACHE_TTL.complaint)
    await cacheSet(Keys.complaintByNumber(complaint.complaintNumber), complaint, CACHE_TTL.complaint)
    await cacheSet(Keys.dashboardStats(), { counts: {} }, CACHE_TTL.dashboardStats)
    await cacheSet(Keys.departmentStats(departmentId), { total: 1 }, CACHE_TTL.departmentStats)

    await invalidateComplaintCaches(complaint)

    expect(await cacheGet(Keys.complaint(id))).toBeNull()
    expect(await cacheGet(Keys.complaintByNumber(complaint.complaintNumber))).toBeNull()
    expect(await cacheGet(Keys.dashboardStats())).toBeNull()
    expect(await cacheGet(Keys.departmentStats(departmentId))).toBeNull()
  })

  it('enqueues and dequeues jobs on the complaint queue', async () => {
    const job = { complaintId: `test-${suffix}` }
    const pushed = await enqueue(QueueNames.complaints, job)
    expect(pushed).toBe(true)

    const popped = await dequeue<typeof job>(QueueNames.complaints, 2)
    expect(popped).toEqual(job)
  })

  it('rate-limits and resets counters', async () => {
    const key = RateLimitKeys.byIp(`test-ip-${suffix}`)
    await cacheDel(key)
    const limit = 3

    for (let i = 1; i <= limit; i += 1) {
      const result = await redisRateLimit(key, limit, 60)
      expect(result?.allowed).toBe(true)
      expect(result?.remaining).toBe(limit - i)
    }

    const blocked = await redisRateLimit(key, limit, 60)
    expect(blocked?.allowed).toBe(false)
    expect(blocked?.remaining).toBe(0)
  })
})