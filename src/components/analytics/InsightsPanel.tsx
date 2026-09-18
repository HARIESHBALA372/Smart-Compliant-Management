/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Trend insights alerts panel.
 * ------------------------------------------------------------------
 */

import { AlertTriangle, Info, MessageSquareWarning } from 'lucide-react'
import type { InsightsData } from '@/types/analytics'
import { cn } from '@/utils'

const SEVERITY_STYLES = {
  critical: { icon: AlertTriangle, wrapper: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', iconColor: 'text-red-600' },
  warning: { icon: MessageSquareWarning, wrapper: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', iconColor: 'text-orange-600' },
  info: { icon: Info, wrapper: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-600' },
} as const

export function InsightsPanel({ data }: { data: InsightsData }) {
  const sorted = [...data.alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No anomalies detected in the selected period.</p>
      )}
      {sorted.map((alert) => {
        const conf = SEVERITY_STYLES[alert.severity]
        const Icon = conf.icon
        return (
          <div key={alert.key} className={cn('flex items-start gap-3 rounded-lg border p-3', conf.wrapper)}>
            <Icon className={cn('h-5 w-5 shrink-0', conf.iconColor)} />
            <p className={cn('text-sm font-medium', conf.text)}>{alert.message}</p>
          </div>
        )
      })}
    </div>
  )
}