/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { cn, getStatusColor, getStatusDarkColor } from '@/utils'
import { COMPLAINT_STATUS_LABELS } from '@/constants'
import type { ComplaintStatus } from '@/types'

interface StatusBadgeProps {
  status: ComplaintStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getStatusColor(status),
        getStatusDarkColor(status),
        className,
      )}
    >
      <span className="sr-only">Status: </span>
      {COMPLAINT_STATUS_LABELS[status] || status}
    </span>
  )
}
