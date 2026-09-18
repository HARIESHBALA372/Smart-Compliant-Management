/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { cn } from '@/utils'

interface SLAIndicatorProps {
  deadline: string
  className?: string
}

export function SLAIndicator({ deadline, className }: SLAIndicatorProps) {
  const now = new Date()
  const slaDate = new Date(deadline)
  const hoursLeft = (slaDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursLeft < 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400', className)}>
        <AlertTriangle className="h-3.5 w-3.5" />
        SLA Breached
      </span>
    )
  }

  if (hoursLeft < 4) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400', className)}>
        <Clock className="h-3.5 w-3.5" />
        {Math.round(hoursLeft)}h remaining
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400', className)}>
      <CheckCircle className="h-3.5 w-3.5" />
      Within SLA
    </span>
  )
}
