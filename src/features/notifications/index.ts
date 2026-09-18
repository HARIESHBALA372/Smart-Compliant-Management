/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

export {
  fetchNotifications,
  fetchUnreadCount,
  fetchPreferences,
  updatePreferences,
  markAsRead,
  markAsCompleted,
  markAllAsRead,
  deleteNotification,
  addNotification,
} from '@/store/slices/notificationSlice'

export { notificationApi } from '@/services/notificationApi'