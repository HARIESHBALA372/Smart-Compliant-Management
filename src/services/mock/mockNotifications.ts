/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { Notification, NotificationListResult, NotificationPreferences } from '@/types'
import { NotificationType } from '@/types'

const mockNotifications: Notification[] = [
  { id: '1', type: NotificationType.COMPLAINT_CREATED, priority: 'NORMAL', channel: 'IN_APP', title: 'Complaint Submitted', message: 'Your complaint CMP-2026-00006 has been submitted and is under review.', userId: '2', complaintId: '6', isRead: false, createdAt: '2026-09-08T06:00:00Z' },
  { id: '2', type: NotificationType.COMPLAINT_ASSIGNED_UPPER, priority: 'NORMAL', channel: 'IN_APP', title: 'Complaint Assigned', message: 'You have been assigned complaint CMP-2026-00001', userId: '2', complaintId: '1', isRead: true, completed: true, completedAt: '2026-09-07T12:00:00Z', createdAt: '2026-09-07T09:00:00Z' },
  { id: '3', type: NotificationType.STATUS_UPDATED, priority: 'NORMAL', channel: 'IN_APP', title: 'Status Updated', message: 'Complaint CMP-2026-00003 status changed to In Progress', userId: '1', complaintId: '3', isRead: false, createdAt: '2026-09-07T16:00:00Z' },
  { id: '4', type: NotificationType.SLA_WARNING, priority: 'IMPORTANT', channel: 'IN_APP', title: 'SLA Warning', message: 'SLA for complaint CMP-2026-00002 is 90% through its resolution deadline.', userId: '2', complaintId: '2', isRead: false, createdAt: '2026-09-08T10:00:00Z' },
  { id: '5', type: NotificationType.COMPLAINT_RESOLVED, priority: 'IMPORTANT', channel: 'IN_APP', title: 'Complaint Resolved', message: 'Complaint CMP-2026-00005 has been resolved. Please provide feedback.', userId: '1', complaintId: '5', isRead: true, completed: true, completedAt: '2026-09-08T09:00:00Z', createdAt: '2026-09-07T10:00:00Z' },
  { id: '6', type: NotificationType.COMMENT_ADDED, priority: 'NORMAL', channel: 'IN_APP', title: 'New Comment', message: 'A staff member added a comment to complaint CMP-2026-00004', userId: '2', complaintId: '4', isRead: false, createdAt: '2026-09-08T08:30:00Z' },
  { id: '7', type: NotificationType.COMPLAINT_CLOSED, priority: 'NORMAL', channel: 'IN_APP', title: 'Complaint Closed', message: 'Complaint CMP-2026-00007 has been closed', userId: '1', complaintId: '7', isRead: true, createdAt: '2026-09-06T15:00:00Z' },
  { id: '8', type: NotificationType.SLA_BREACHED, priority: 'CRITICAL', channel: 'IN_APP', title: 'SLA Breached', message: 'SLA has been breached for complaint CMP-2026-00001', userId: '3', complaintId: '1', isRead: false, createdAt: '2026-09-08T11:00:00Z' },
  { id: '9', type: NotificationType.ADMIN_ANNOUNCEMENT, priority: 'IMPORTANT', channel: 'IN_APP', title: 'Scheduled Maintenance', message: 'The portal will be down Saturday 2-4 AM for scheduled maintenance.', userId: '2', isRead: false, createdAt: '2026-09-09T14:00:00Z' },
  { id: '10', type: NotificationType.COMPLAINT_REOPENED, priority: 'IMPORTANT', channel: 'IN_APP', title: 'Complaint Reopened', message: 'Complaint CMP-2026-00005 was reopened for further follow-up.', userId: '1', complaintId: '5', isRead: false, createdAt: '2026-09-09T18:30:00Z' },
]

const mockPreferences: NotificationPreferences = {
  complaintStatusUpdates: true,
  complaintAssignment: true,
  complaintResolution: true,
  commentNotifications: true,
  slaAlerts: true,
  emailNotifications: false,
  inAppNotifications: true,
  announcements: true,
  feedbackRequests: true,
}

function paged(rows: Notification[], page = 1): NotificationListResult {
  const limit = 10
  const start = (page - 1) * limit
  return {
    notifications: rows.slice(start, start + limit),
    page,
    limit,
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    unreadCount: mockNotifications.filter((n) => !n.isRead).length,
  }
}

export function mockDefaultPreferences(): NotificationPreferences {
  return { ...mockPreferences }
}

export function mockGetPreferences(): NotificationPreferences | null {
  return { ...mockPreferences }
}

export function mockUpdatePreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  Object.assign(mockPreferences, prefs)
  return { ...mockPreferences }
}

export function mockGetNotifications(params?: { unreadOnly?: boolean; page?: number }): NotificationListResult {
  let filtered = [...mockNotifications]
  if (params?.unreadOnly) filtered = filtered.filter((n) => !n.isRead)
  return paged(filtered, params?.page ?? 1)
}

export function mockMarkNotificationRead(id: string): void {
  const notif = mockNotifications.find((n) => n.id === id)
  if (notif) {
    notif.isRead = true
    notif.readAt = new Date().toISOString()
  }
}

export function mockMarkNotificationComplete(id: string): void {
  const notif = mockNotifications.find((n) => n.id === id)
  if (notif) {
    notif.completed = true
    notif.completedAt = new Date().toISOString()
  }
}

export function mockMarkAllNotificationsRead(): void {
  mockNotifications.forEach((n) => (n.isRead = true))
}

export function mockDeleteNotification(id: string): void {
  const index = mockNotifications.findIndex((n) => n.id === id)
  if (index !== -1) mockNotifications.splice(index, 1)
}

export function mockSendAnnouncement(payload: { title: string; message: string }): number {
  mockNotifications.unshift({
    id: `ann-${Date.now()}`,
    type: NotificationType.ADMIN_ANNOUNCEMENT,
    priority: 'IMPORTANT',
    channel: 'IN_APP',
    title: payload.title,
    message: payload.message,
    userId: '0',
    isRead: false,
    createdAt: new Date().toISOString(),
  })
  return 1
}