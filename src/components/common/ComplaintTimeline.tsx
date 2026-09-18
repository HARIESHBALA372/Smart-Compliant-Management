/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { cn, getStatusColor, getStatusDarkColor } from '@/utils'
import { STATUS_FLOW } from '@/constants'
import type { ComplaintStatus } from '@/types'
import { Check } from 'lucide-react'

interface ComplaintTimelineProps {
  currentStatus: ComplaintStatus
  className?: string
}

export function ComplaintTimeline({ currentStatus, className }: ComplaintTimelineProps) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus)

  return (
    <div className={cn('space-y-0', className)}>
      {STATUS_FLOW.map((status, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        return (
          <div key={status} className="flex items-start gap-3 relative">
            {index < STATUS_FLOW.length - 1 && (
              <div
                className={cn(
                  'absolute left-3.5 top-7 w-0.5 h-full',
                  isCompleted ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 flex-shrink-0',
                isCompleted && 'bg-blue-600 border-blue-600 text-white',
                isCurrent && 'bg-white dark:bg-gray-800 border-blue-600 text-blue-600',
                isPending && 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400',
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-medium">{index + 1}</span>}
            </div>
            <div className="pb-6">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-blue-600 dark:text-blue-400',
                  isCurrent && 'text-blue-600 dark:text-blue-400 font-semibold',
                  isPending && 'text-gray-400 dark:text-gray-500',
                )}
              >
                {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
