/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import { isMockMode } from './mock/mockData'
import type { Notification, NotificationListResult, NotificationPreferences } from '@/types'

function mapPaged(response: {
  data?: unknown
  pagination?: { page: number; limit: number; total: number; totalPages: number; unreadCount?: number }
}): NotificationListResult {
  const rows = (response.data as Notification[]) || []
  return {
    notifications: rows,
    page: response.pagination?.page ?? 1,
    limit: response.pagination?.limit ?? rows.length,
    total: response.pagination?.total ?? rows.length,
    totalPages: response.pagination?.totalPages ?? Math.max(1, Math.ceil(rows.length / 10)),
    unreadCount: response.pagination?.unreadCount ?? 0,
  }
}

export const notificationApi = {
  async getAll(params?: { unreadOnly?: boolean; type?: string; page?: number; limit?: number }) {
    const query: Record<string, unknown> = {}
    if (params?.unreadOnly) query.unread = true
    if (params?.type) query.type = params.type
    if (params?.page) query.page = params.page
    if (params?.limit) query.limit = params.limit

    if (isMockMode()) {
      const { mockGetNotifications } = await import('./mock/mockNotifications')
      return mockGetNotifications({ unreadOnly: params?.unreadOnly, page: params?.page })
    }
    const response = await api.get('/notifications', { params: query })
    return mapPaged(response.data)
  },

  async getUnreadCount() {
    if (isMockMode()) {
      const { mockGetNotifications } = await import('./mock/mockNotifications')
      const all = mockGetNotifications({ page: 1 })
      return all.notifications.filter((n) => !n.isRead).length
    }
    const response = await api.get('/notifications/unread-count')
    return (response.data.data as { unreadCount: number })?.unreadCount ?? 0
  },

  async getPreferences(): Promise<NotificationPreferences> {
    if (isMockMode()) {
      const { mockGetPreferences, mockDefaultPreferences } = await import('./mock/mockNotifications')
      return mockGetPreferences() ?? mockDefaultPreferences()
    }
    const response = await api.get('/notifications/preferences')
    return response.data.data as NotificationPreferences
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    if (isMockMode()) {
      const { mockUpdatePreferences } = await import('./mock/mockNotifications')
      return mockUpdatePreferences(prefs)
    }
    const response = await api.put('/notifications/preferences', prefs)
    return response.data.data as NotificationPreferences
  },

  async markAsRead(id: string) {
    if (isMockMode()) {
      const { mockMarkNotificationRead } = await import('./mock/mockNotifications')
      mockMarkNotificationRead(id)
      return
    }
    await api.put(`/notifications/${id}/read`)
  },

  async markAsCompleted(id: string) {
    if (isMockMode()) {
      const { mockMarkNotificationComplete } = await import('./mock/mockNotifications')
      mockMarkNotificationComplete(id)
      return
    }
    await api.put(`/notifications/${id}/complete`)
  },

  async markAllAsRead() {
    if (isMockMode()) {
      const { mockMarkAllNotificationsRead } = await import('./mock/mockNotifications')
      mockMarkAllNotificationsRead()
      return
    }
    await api.put('/notifications/read-all')
  },

  async announce(payload: { title: string; message: string }) {
    if (isMockMode()) {
      const { mockSendAnnouncement } = await import('./mock/mockNotifications')
      return mockSendAnnouncement(payload)
    }
    const response = await api.post('/notifications/announce', payload)
    return (response.data.data as { sent: number })?.sent ?? 0
  },

  async delete(id: string) {
    if (isMockMode()) {
      const { mockDeleteNotification } = await import('./mock/mockNotifications')
      mockDeleteNotification(id)
      return
    }
    await api.delete(`/notifications/${id}`)
  },
}