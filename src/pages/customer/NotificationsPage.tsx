/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchNotifications,
  markAsRead,
  markAsCompleted,
  markAllAsRead,
  deleteNotification,
} from '@/store/slices/notificationSlice'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSpinner } from '@/components/common/Spinner'
import { BellOff, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'

const NOTIFICATION_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'COMPLAINT_CREATED', label: 'New complaints' },
  { value: 'COMPLAINT_ASSIGNED', label: 'Assignments' },
  { value: 'STATUS_UPDATED', label: 'Status updates' },
  { value: 'COMMENT_ADDED', label: 'Comments' },
  { value: 'COMPLAINT_RESOLVED', label: 'Resolved' },
  { value: 'COMPLAINT_REOPENED', label: 'Reopened' },
  { value: 'COMPLAINT_REJECTED', label: 'Rejected' },
  { value: 'COMPLAINT_PRIORITY_CHANGED', label: 'Priority changes' },
  { value: 'SLA_WARNING', label: 'SLA warnings' },
  { value: 'SLA_BREACHED', label: 'SLA breaches' },
  { value: 'FEEDBACK_REQUEST', label: 'Feedback requests' },
  { value: 'ADMIN_ANNOUNCEMENT', label: 'Announcements' },
]

const STATUS_FILTERS: { value: 'ALL' | 'ACTIVE' | 'COMPLETED'; label: string }[] = [
  { value: 'ALL', label: 'Status: All' },
  { value: 'ACTIVE', label: 'Status: Active' },
  { value: 'COMPLETED', label: 'Status: Completed' },
]

export function NotificationsPage() {
  const dispatch = useAppDispatch()
  const { notifications, isLoading, totalPages } = useAppSelector((state) => state.notifications)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchNotifications({ unreadOnly, type: typeFilter === 'ALL' ? undefined : typeFilter, page }))
  }, [dispatch, unreadOnly, typeFilter, page])

  const filtered = notifications.filter((n) => {
    if (unreadOnly && n.isRead) return false
    if (statusFilter === 'ACTIVE' && n.completed) return false
    if (statusFilter === 'COMPLETED' && !n.completed) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stay updated with your complaint activity</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'COMPLETED')
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label="Filter by completion status"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label="Filter by type"
          >
            {NOTIFICATION_TYPE_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => { setUnreadOnly(!unreadOnly); setPage(1) }}>
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => dispatch(markAllAsRead())}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark All Read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : filtered.length ? (
        <>
          <div className="space-y-3">
            {filtered.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onRead={(id) => dispatch(markAsRead(id))}
                onComplete={(id) => dispatch(markAsCompleted(id))}
                onDelete={(id) => dispatch(deleteNotification(id))}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <EmptyState
            icon={<BellOff className="h-12 w-12" />}
            title="No notifications"
            description={unreadOnly ? 'You have no unread notifications.' : 'You have no notifications yet.'}
          />
        </div>
      )}
    </div>
  )
}