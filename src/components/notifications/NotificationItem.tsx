/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Bell } from 'lucide-react'
import { cn, formatRelativeTime } from '@/utils'
import type { Notification } from '@/types'
import {
  FileText,
  UserPlus,
  RefreshCw,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Frown,
  TrendingUp,
  Megaphone,
  Star,
  CheckCheck,
} from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onComplete?: (id: string) => void
  compact?: boolean
}

const typeIcons: Record<string, React.ReactNode> = {
  COMPLAINT_CREATED: <FileText className="h-5 w-5 text-blue-500" />,
  new_complaint: <FileText className="h-5 w-5 text-blue-500" />,
  COMPLAINT_ASSIGNED: <UserPlus className="h-5 w-5 text-indigo-500" />,
  complaint_assigned: <UserPlus className="h-5 w-5 text-indigo-500" />,
  STATUS_UPDATED: <RefreshCw className="h-5 w-5 text-yellow-500" />,
  status_changed: <RefreshCw className="h-5 w-5 text-yellow-500" />,
  COMMENT_ADDED: <MessageSquare className="h-5 w-5 text-green-500" />,
  customer_reply: <MessageSquare className="h-5 w-5 text-green-500" />,
  SLA_WARNING: <Clock className="h-5 w-5 text-orange-500" />,
  sla_approaching: <Clock className="h-5 w-5 text-orange-500" />,
  sla_warning: <Clock className="h-5 w-5 text-orange-500" />,
  SLA_BREACHED: <AlertTriangle className="h-5 w-5 text-red-500" />,
  sla_breached: <AlertTriangle className="h-5 w-5 text-red-500" />,
  COMPLAINT_RESOLVED: <CheckCircle className="h-5 w-5 text-green-500" />,
  complaint_resolved: <CheckCircle className="h-5 w-5 text-green-500" />,
  COMPLAINT_CLOSED: <XCircle className="h-5 w-5 text-gray-500" />,
  complaint_closed: <XCircle className="h-5 w-5 text-gray-500" />,
  COMPLAINT_REOPENED: <RotateCcw className="h-5 w-5 text-purple-500" />,
  COMPLAINT_REJECTED: <Frown className="h-5 w-5 text-red-500" />,
  COMPLAINT_PRIORITY_CHANGED: <TrendingUp className="h-5 w-5 text-amber-500" />,
  COMPLAINT_ESCALATED: <TrendingUp className="h-5 w-5 text-red-500" />,
  complaint_escalated: <TrendingUp className="h-5 w-5 text-red-500" />,
  FEEDBACK_REQUEST: <Star className="h-5 w-5 text-amber-400" />,
  ADMIN_ANNOUNCEMENT: <Megaphone className="h-5 w-5 text-blue-600" />,
  SYSTEM_NOTIFICATION: <Bell className="h-5 w-5 text-gray-500" />,
}

const priorityLabel: Record<string, string> = {
  NORMAL: 'bg-gray-100 text-gray-600',
  IMPORTANT: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export function NotificationItem({ notification, onRead, onDelete, onComplete, compact }: NotificationItemProps) {
  const completed = notification.completed
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border transition-colors cursor-pointer',
        compact ? 'p-3' : 'p-4',
        completed
          ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 opacity-70'
          : notification.isRead
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
      )}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      <div className="flex-shrink-0 mt-0.5">{typeIcons[notification.type] || <Bell className="h-5 w-5 text-gray-400" />}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{notification.title}</p>
          {completed && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Completed
            </span>
          )}
          {notification.priority && notification.priority !== 'NORMAL' && (
            <span className={cn('text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full', priorityLabel[notification.priority])}>
              {notification.priority}
            </span>
          )}
        </div>
        <p className={cn('text-sm text-gray-600 dark:text-gray-400 mt-0.5', compact && 'line-clamp-2')}>{notification.message}</p>
        {notification.completedAt && (
          <p className="text-xs mt-0.5 inline-block rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-green-700 dark:text-green-400">
            Completed {formatRelativeTime(notification.completedAt)}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {!completed && onComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onComplete(notification.id)
            }}
            className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            aria-label="Mark notification completed"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Complete
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="text-gray-400 hover:text-red-500 text-xs"
          aria-label="Delete notification"
        >
          Delete
        </button>
      </div>
    </div>
  )
}