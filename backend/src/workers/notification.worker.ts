import { prisma } from '../config/database'
import { QueueNames, enqueue, dequeue } from '../services/redis/queue.service'
import { logger } from '../utils/logger'
import { sendEmail } from '../services/email.service'
import { renderEmail } from '../utils/notification-template'

const MAX_ATTEMPTS = 3

export interface NotificationJob {
  notificationId: string
  userId: string
  attempts?: number
}

interface NotificationRow {
  id: string
  userId: string
  title: string
  message: string
  type: string
  complaintId: string | null
  channel: string
  metadata: unknown
}

/**
 * Delivers queued notifications asynchronously over the EMAIL channel.
 *
 * The in-app row is already persisted (by the complaint flow or notification
 * service); this worker sends the email copy. Delivery is best-effort: when
 * SMTP is not configured the job is skipped, and transient failures are
 * re-enqueued up to `MAX_ATTEMPTS` before being dead-lettered (logged).
 * Email problems never affect the originating complaint request.
 */
export async function processNotificationJob(job: NotificationJob): Promise<void> {
  const notification = (await prisma.notification.findUnique({
    where: { id: job.notificationId },
  })) as NotificationRow | null

  if (!notification) {
    logger.warn({ message: 'Notification job skipped — not found', notificationId: job.notificationId })
    return
  }

  const attempts = job.attempts ?? 0

  // Duplicate-suppression: a successful delivery stamps metadata.emailSentAt.
  if (notification.metadata && typeof notification.metadata === 'object') {
    const meta = notification.metadata as Record<string, unknown>
    if (meta.emailSentAt) {
      logger.info({ message: 'Notification email already sent', notificationId: notification.id })
      return
    }
  }

  const user = await prisma.user.findUnique({ where: { id: notification.userId } })
  if (!user || !user.email) {
    logger.warn({ message: 'Notification job skipped — user missing', notificationId: notification.id })
    return
  }

  const prefs = await prisma.notificationPreferences.findUnique({ where: { userId: user.id } })
  if (prefs && prefs.emailNotifications === false && notification.channel === 'IN_APP') {
    logger.info({ message: 'Notification email skipped — user opted out', userId: user.id })
    return
  }

  const { subject, html, text } = renderEmail({
    type: notification.type as never,
    title: notification.title,
    message: notification.message,
    complaintId: notification.complaintId,
    userName: user.name,
  })

  const result = await sendEmail({ to: user.email, subject, html, text })

  if (result.ok && !result.skipped) {
    await prisma.notification
      .update({
        where: { id: notification.id },
        data: {
          metadata: {
            ...(typeof notification.metadata === 'object' && notification.metadata !== null
              ? (notification.metadata as Record<string, unknown>)
              : {}),
            emailSentAt: new Date().toISOString(),
          },
        },
      })
      .catch(() => undefined)
    return
  }

  // Skipped (no SMTP) is not a failure; a wrong result.ok means a real error.
  if (result.skipped) {
    logger.info({ message: 'Notification email skipped — SMTP not configured', notificationId: notification.id })
    return
  }

  if (attempts < MAX_ATTEMPTS) {
    logger.warn({
      message: 'Notification email failed, re-enqueuing',
      notificationId: notification.id,
      attempts: attempts + 1,
      error: result.error,
    })
    await enqueue(QueueNames.notifications, {
      notificationId: notification.id,
      userId: notification.userId,
      attempts: attempts + 1,
    })
  } else {
    logger.error({
      message: 'Notification email dead-lettered after retries',
      notificationId: notification.id,
      error: result.error,
    })
  }
}

export async function runNotificationWorker(abortSignal?: AbortSignal): Promise<void> {
  while (!abortSignal?.aborted) {
    try {
      const job = await dequeue<NotificationJob>(QueueNames.notifications, 5)
      if (job) {
        await processNotificationJob(job)
      } else {
        await sleepMs(250)
      }
    } catch (err) {
      logger.error({ message: 'Notification worker error', error: err })
      await sleepMs(1_000)
    }
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}