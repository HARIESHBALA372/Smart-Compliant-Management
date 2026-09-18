import { getRedis } from '../../config/redis'
import { logger } from '../../utils/logger'

/**
 * Redis pub/sub relay for realtime notification fan-out across processes.
 *
 * Primary realtime delivery stays in-process (event bus in notification.service),
 * but every created notification is ALSO published to this channel so that any
 * external process (a dedicated realtime gateway, another API instance, a
 * monitoring service) can subscribe and broadcast to connected clients. When
 * Redis is unavailable the publish is a silent no-op.
 */

export const REALTIME_NOTIFICATION_CHANNEL = 'SmartComplaint:realtime:notifications'

export interface RealtimeMessage {
  userId: string
  type: string
  payload: Record<string, unknown>
}

/**
 * Publishes an analytics-refresh signal (used right after complaint data has
 * changed) so live dashboards can invalidate their data without a page reload.
 * A no-op when Redis is disabled or unreachable.
 */
export async function publishAnalyticsEvent(
  payload: { reason: string; updatedAt: string; complaintId?: string },
): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.publish(
      REALTIME_NOTIFICATION_CHANNEL,
      JSON.stringify({
        userId: '*',
        type: 'analytics',
        payload,
      } satisfies RealtimeMessage),
    )
  } catch (err) {
    logger.warn({ message: 'Redis analytics publish failed', error: err })
  }
}

export async function publishRealtimeNotification(
  userId: string,
  notification: { id: string; [key: string]: unknown },
): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.publish(
      REALTIME_NOTIFICATION_CHANNEL,
      JSON.stringify({
        userId,
        type: 'notification',
        payload: { ...notification },
      } satisfies RealtimeMessage),
    )
  } catch (err) {
    logger.warn({ message: 'Redis realtime publish failed', error: err })
  }
}

/**
 * Subscribes the provided `onMessage` handler to the realtime channel.
 * Returns an unsubscribe/disconnect function. Best-effort: when Redis is
 * unavailable the handler is simply never subscribed.
 */
export async function subscribeRealtime(
  onMessage: (message: RealtimeMessage) => void,
): Promise<() => Promise<void>> {
  const redis = await getRedis()
  if (!redis) {
    return async () => undefined
  }

  const subscriber = redis.duplicate()
  let closed = false

  subscriber.on('message', (_channel: string, raw: string) => {
    try {
      onMessage(JSON.parse(raw) as RealtimeMessage)
    } catch {
      // ignore malformed frames
    }
  })

  return new Promise((resolve) => {
    subscriber.on('ready', () => {
      void subscriber.subscribe(REALTIME_NOTIFICATION_CHANNEL)
      resolve(async () => {
        if (closed) return
        closed = true
        await subscriber.quit().catch(() => undefined)
      })
    })
    subscriber.on('error', () => {
      resolve(async () => undefined)
    })
  })
}