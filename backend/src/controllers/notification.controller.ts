import type { Request, Response, NextFunction } from 'express'
import {
  listUserNotifications,
  markAsRead,
  markAsCompleted,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendAnnouncement,
} from '../services/notification.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../middleware/validation'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listUserNotifications(
      req.user!.id,
      page,
      limit,
      req.query.unread === 'true',
      typeof req.query.type === 'string' ? req.query.type : undefined,
    )
    sendSuccess(res, 'Notifications fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      unreadCount: result.unreadCount,
    })
  } catch (error) {
    next(error)
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await getUnreadCount(req.user!.id)
    sendSuccess(res, 'Unread count fetched', { unreadCount: count })
  } catch (error) {
    next(error)
  }
}

export async function preferencesGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const preferences = await getNotificationPreferences(req.user!.id)
    sendSuccess(res, 'Notification preferences fetched', preferences)
  } catch (error) {
    next(error)
  }
}

export async function preferencesPut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const preferences = await updateNotificationPreferences(req.user!.id, req.body)
    sendSuccess(res, 'Notification preferences updated', preferences)
  } catch (error) {
    next(error)
  }
}

export async function announce(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, message, type, complaintId, priority } = req.body
    const created = await sendAnnouncement({ title, message, type, complaintId, priority })
    sendSuccess(res, 'Announcement dispatched', { sent: created })
  } catch (error) {
    next(error)
  }
}

export async function readOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await markAsRead(req.user!.id, req.params.id)
    sendSuccess(res, 'Notification marked as read', notification)
  } catch (error) {
    next(error)
  }
}

export async function completeOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await markAsCompleted(req.user!.id, req.params.id)
    sendSuccess(res, 'Notification marked as completed', notification)
  } catch (error) {
    next(error)
  }
}

export async function readAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await markAllAsRead(req.user!.id)
    sendSuccess(res, 'All notifications marked as read', result)
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteNotification(req.user!.id, req.params.id)
    sendSuccess(res, 'Notification deleted')
  } catch (error) {
    next(error)
  }
}