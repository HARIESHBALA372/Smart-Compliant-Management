import { EventEmitter } from 'events'
import type { NotificationChannel, NotificationPriority, NotificationType } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { Keys, cacheDel, cacheRemember, CACHE_TTL, cacheSet } from './redis/cache.service'
import { QueueNames, enqueue } from './redis/queue.service'
import { publishRealtimeNotification } from './redis/pubsub.service'
import { isEmailConfigured } from './email.service'

/**
 * In-process realtime bus. The notification service emits `notification:created`
 * events after persisting a row; the WebSocket service subscribes to the bus and
 * forwards the payload to the recipient's live connections. Redis pub/sub is used
 * as a best-effort out-of-process relay (see redis/pubsub.service.ts) for
 * multi-instance deployments — the API keeps working when Redis is unavailable.
 */
export const notificationBus = new EventEmitter()
notificationBus.setMaxListeners(100)

export interface NotificationPayload {
  userId: string
  title: string
  message: string
  complaintId?: string | null
  type?: NotificationType
  channel?: NotificationChannel
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
}

/** Minimal shape consumers need to enqueue async delivery. */
export interface CreatedNotification {
  id: string
  userId: string
  channel: NotificationChannel
  type: NotificationType
}

interface NotificationPreferencesFields {
  complaintStatusUpdates: boolean
  complaintAssignment: boolean
  complaintResolution: boolean
  commentNotifications: boolean
  slaAlerts: boolean
  announcements: boolean
  feedbackRequests: boolean
}

const TYPE_PREFERENCE: Record<NotificationType, keyof NotificationPreferencesFields | null> = {
  COMPLAINT_CREATED: 'complaintStatusUpdates',
  COMPLAINT_ASSIGNED: 'complaintAssignment',
  STATUS_UPDATED: 'complaintStatusUpdates',
  COMMENT_ADDED: 'commentNotifications',
  COMPLAINT_RESOLVED: 'complaintResolution',
  COMPLAINT_CLOSED: 'complaintResolution',
  COMPLAINT_ESCALATED: 'complaintStatusUpdates',
  COMPLAINT_REJECTED: 'complaintStatusUpdates',
  COMPLAINT_REOPENED: 'complaintStatusUpdates',
  COMPLAINT_PRIORITY_CHANGED: 'complaintStatusUpdates',
  FEEDBACK_REQUEST: 'feedbackRequests',
  ADMIN_ANNOUNCEMENT: 'announcements',
  SYSTEM_NOTIFICATION: 'announcements',
  SLA_WARNING: 'slaAlerts',
  SLA_BREACHED: 'slaAlerts',
}

export async function getNotificationPreferences(userId: string) {
  const cached = await cacheRemember(
    Keys.notificationPreferences(userId),
    CACHE_TTL.notifications,
    async () => {
      const existing = await prisma.notificationPreferences.findUnique({ where: { userId } })
      return existing ?? null
    },
  )
  if (cached) return cached

  const created = await prisma.notificationPreferences.create({ data: { userId } })
  await cacheSet(Keys.notificationPreferences(userId), created, CACHE_TTL.notifications)
  return created
}

export async function getNotificationPreferencesMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return new Map<string, NonNullable<Awaited<ReturnType<typeof getNotificationPreferences>>>>()

  const rows = await prisma.notificationPreferences.findMany({ where: { userId: { in: uniqueIds } } })
  const map = new Map(rows.map((row) => [row.userId, row]))
  for (const id of uniqueIds) {
    if (!map.has(id)) {
      const created = await prisma.notificationPreferences.create({ data: { userId: id } })
      map.set(id, created)
    }
  }
  return map
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<NotificationPreferencesFields> & { emailNotifications?: boolean; inAppNotifications?: boolean },
) {
  const existing = await prisma.notificationPreferences.findUnique({ where: { userId } })
  const updated = existing
    ? await prisma.notificationPreferences.update({ where: { userId }, data })
    : await prisma.notificationPreferences.create({ data: { userId, ...data } })

  await cacheDel(Keys.notificationPreferences(userId))
  await cacheSet(Keys.notificationPreferences(userId), updated, CACHE_TTL.notifications)
  return updated
}

/** Whether a single preference is enabled for the given type. Defaults to true. */
export async function preferenceEnabledForType(userId: string, type: NotificationType): Promise<boolean> {
  const prefKey = TYPE_PREFERENCE[type]
  if (!prefKey) return true
  const prefs = await getNotificationPreferences(userId)
  return prefs[prefKey]
}

function mapPrefsToRecord(
  prefs: NonNullable<Awaited<ReturnType<typeof getNotificationPreferences>>>,
): NotificationPreferencesFields {
  return {
    complaintStatusUpdates: prefs.complaintStatusUpdates,
    complaintAssignment: prefs.complaintAssignment,
    complaintResolution: prefs.complaintResolution,
    commentNotifications: prefs.commentNotifications,
    slaAlerts: prefs.slaAlerts,
    announcements: prefs.announcements,
    feedbackRequests: prefs.feedbackRequests,
  }
}

/**
 * Creates a single notification (in-app), respecting the user's preferences.
 * Returns the created row, or `null` when the user has disabled the relevant
 * notification type / in-app delivery.
 *
 * After persisting, the notification is:
 *  1. enqueued for async delivery (email) when the user opted in and SMTP is configured,
 *  2. pushed to the in-process realtime bus so connected WebSocket clients receive it
 *     immediately without blocking the request.
 */
export async function createNotification(payload: NotificationPayload): Promise<CreatedNotification | null> {
  const type = payload.type ?? 'COMPLAINT_CREATED'

  const prefs = await getNotificationPreferences(payload.userId)
  if (!prefs.inAppNotifications) return null

  const prefKey = TYPE_PREFERENCE[type]
  if (prefKey && !mapPrefsToRecord(prefs)[prefKey]) return null

  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      complaintId: payload.complaintId ?? null,
      type,
      channel: payload.channel ?? 'IN_APP',
      priority: payload.priority ?? 'NORMAL',
      metadata: (payload.metadata as object | undefined) ?? undefined,
    },
  })

  await invalidateNotificationsCache(payload.userId)
  await dispatchNotification(notification)
  return notification
}

/**
 * Bulk notification helper. Preference checks run per user; users who have
 * disabled the type are simply skipped. Returns the count of created rows.
 */
export async function notifyMany(payloads: NotificationPayload[]): Promise<number> {
  if (payloads.length === 0) return 0

  const prefsMap = await getNotificationPreferencesMap(payloads.map((p) => p.userId))
  const allowed = payloads.filter((p) => {
    const prefs = prefsMap.get(p.userId)
    if (!prefs || !prefs.inAppNotifications) return false
    const prefKey = TYPE_PREFERENCE[p.type ?? 'COMPLAINT_CREATED']
    if (!prefKey) return true
    return mapPrefsToRecord(prefs)[prefKey]
  })
  if (allowed.length === 0) return 0

  const result = await prisma.notification.createMany({
    data: allowed.map((p) => ({
      userId: p.userId,
      title: p.title,
      message: p.message,
      complaintId: p.complaintId ?? null,
      type: p.type ?? 'COMPLAINT_CREATED',
      channel: p.channel ?? 'IN_APP',
      priority: p.priority ?? 'NORMAL',
      metadata: (p.metadata as object | undefined) ?? undefined,
    })),
  })

  const created = await prisma.notification.findMany({
    where: {
      userId: { in: [...new Set(allowed.map((p) => p.userId))] },
      createdAt: { gte: new Date(Date.now() - 5_000) },
      type: { in: [...new Set(allowed.map((p) => p.type ?? 'COMPLAINT_CREATED'))] },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(allowed.length * 2, 1),
  })

  for (const userId of new Set(allowed.map((p) => p.userId))) {
    await invalidateNotificationsCache(userId)
  }
  for (const notification of created) {
    await dispatchNotification(notification)
  }
  return result.count
}

async function dispatchNotification(notification: {
  id: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
}): Promise<void> {
  notificationBus.emit('notification:created', { userId: notification.userId, notification })

  if (notification.channel === 'IN_APP' && isEmailConfigured()) {
    void enqueueNotificationJob(notification)
  }

  // Out-of-process realtime relay (best-effort; no-op when Redis is down).
  await publishRealtimeNotification(notification.userId, notification)
}

export async function enqueueNotificationJob(notification: {
  id: string
  userId: string
}): Promise<boolean> {
  return enqueue(QueueNames.notifications, { notificationId: notification.id, userId: notification.userId, attempts: 0 })
}

export async function getAdminAndStaffIds(departmentId?: string | null): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ role: 'ADMIN' }, departmentId ? { role: 'STAFF', departmentId } : { role: 'STAFF' }],
    },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

export async function listUserNotifications(
  userId: string,
  page: number,
  limit: number,
  unreadOnly = false,
  type?: string,
) {
  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(type ? { type: type as NotificationType } : {}),
  }
  const total = await prisma.notification.count({ where })
  const data = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    unreadCount: await getUnreadCount(userId),
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const cached = await cacheRemember(Keys.unreadNotifications(userId), CACHE_TTL.notifications, async () =>
    prisma.notification.count({ where: { userId, isRead: false } }),
  )
  return cached
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) throw new ApiError(404, 'Notification not found')

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  })
  await invalidateNotificationsCache(userId)
  return updated
}

export async function markAsCompleted(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) throw new ApiError(404, 'Notification not found')

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { completed: true, completedAt: new Date() },
  })
  await invalidateNotificationsCache(userId)
  return updated
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
  await invalidateNotificationsCache(userId)
  return result
}

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) throw new ApiError(404, 'Notification not found')

  await prisma.notification.delete({ where: { id: notificationId } })
  await invalidateNotificationsCache(userId)
}

/**
 * Broadcasts an announcement (or system message) to every active user.
 * Used by `POST /notifications/announce` (ADMIN).
 */
export async function sendAnnouncement(input: {
  title: string
  message: string
  type?: 'ADMIN_ANNOUNCEMENT' | 'SYSTEM_NOTIFICATION'
  complaintId?: string
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
}): Promise<number> {
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } })
  const prefsMap = await getNotificationPreferencesMap(users.map((u) => u.id))
  const type = input.type ?? 'ADMIN_ANNOUNCEMENT'
  const prefKey = TYPE_PREFERENCE[type]

  const targets = users.filter((u) => {
    const prefs = prefsMap.get(u.id)
    if (!prefs || !prefs.inAppNotifications) return false
    return prefKey ? mapPrefsToRecord(prefs)[prefKey] : true
  })
  if (targets.length === 0) return 0

  return notifyMany(
    targets.map((u) => ({
      userId: u.id,
      title: input.title,
      message: input.message,
      complaintId: input.complaintId,
      type,
      priority: input.priority ?? 'IMPORTANT',
      metadata: input.metadata,
    })),
  )
}

async function invalidateNotificationsCache(userId: string): Promise<void> {
  await cacheDel(Keys.notifications(userId), Keys.unreadNotifications(userId), Keys.notificationPreferences(userId))
}