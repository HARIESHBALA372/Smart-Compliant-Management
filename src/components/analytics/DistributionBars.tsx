/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Reusable horizontal distribution bars (status / category / priority).
 * ------------------------------------------------------------------
 */

import { cn } from '@/utils'

interface BarSlice {
  label: string
  count: number
  percentage: number
  color?: string
  subLabel?: string
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function DistributionBars({ slices, colors = DEFAULT_COLORS }: { slices: BarSlice[]; colors?: string[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0)
  const maxCount = Math.max(...slices.map((s) => s.count), 1)

  return (
    <div className="space-y-3">
      {slices.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No data for the selected range.</p>}
      {slices.map((s, index) => (
        <div key={`${s.label}-${index}`} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {s.count}
              {s.subLabel ? <span className="ml-1.5 text-xs text-gray-400">{s.subLabel}</span> : null}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${total ? (s.count / maxCount) * 100 : 0}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
          <div className={cn('text-xs text-gray-400')}>{s.percentage}% of total</div>
        </div>
      ))}
    </div>
  )
}