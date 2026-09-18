/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Resolution analytics panel.
 * ------------------------------------------------------------------
 */

import { ChartCard } from '@/components/charts/ChartCard'
import { ResolutionTrendChart } from '@/components/analytics/TrendChart'
import type { ResolutionAnalytics } from '@/types/analytics'

export function ResolutionPanel({ data }: { data: ResolutionAnalytics }) {
  const stats = [
    { label: 'Resolved', value: data.resolvedCount },
    { label: 'Within SLA', value: data.withinSla },
    { label: 'Exceeded SLA', value: data.exceededSla },
    { label: 'Resolution Rate', value: `${data.resolutionRate}%` },
    { label: 'Reopen Rate', value: `${data.reopenedRate}%` },
  ]

  return (
    <ChartCard title="Resolution Analytics">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Avg</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.averageResolutionTime}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Median</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.medianResolutionHours}h</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Min</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.minResolutionHours}h</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Max</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.maxResolutionHours}h</span>
        </div>
      </div>
      <ResolutionTrendChart points={data.trend} />
    </ChartCard>
  )
}