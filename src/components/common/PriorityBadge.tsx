/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { cn, getPriorityColor, getPriorityDarkColor } from '@/utils'
import { PRIORITY_LABELS } from '@/constants'
import type { ComplaintPriority } from '@/types'

interface PriorityBadgeProps {
  priority: ComplaintPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getPriorityColor(priority),
        getPriorityDarkColor(priority),
        className,
      )}
    >
      <span className="sr-only">Priority: </span>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}
