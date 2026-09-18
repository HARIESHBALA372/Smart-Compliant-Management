/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  SLA compliance panel.
 * ------------------------------------------------------------------
 */

import { Gauge, AlertTriangle, Clock } from 'lucide-react'
import { ChartCard } from '@/components/charts/ChartCard'
import { ANALYTICS_PRIORITY_LABELS } from '@/constants'
import type { SlaAnalytics } from '@/types/analytics'
import { cn } from '@/utils'

export function SlaPanel({ data }: { data: SlaAnalytics }) {
  const gaugeColor = data.compliance >= 90 ? 'text-green-600' : data.compliance >= 75 ? 'text-orange-500' : 'text-red-600'

  return (
    <ChartCard title="SLA Analytics">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className={cn('rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-center')}>
          <p className={cn('text-2xl font-bold', gaugeColor)}>{data.compliance}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Overall Compliance</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.breachCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Breaches (open + resolved)</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{data.nearDeadline}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Approaching deadline</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Avg response</span>
          <span className="ml-auto font-semibold text-gray-900 dark:text-white">{data.averageResponseTime}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <Gauge className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Avg resolution</span>
          <span className="ml-auto font-semibold text-gray-900 dark:text-white">{data.averageResolutionTime}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Open SLA misfires</span>
          <span className="ml-auto font-semibold text-gray-900 dark:text-white">{data.openBreached}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Resolved exceed</span>
          <span className="ml-auto font-semibold text-gray-900 dark:text-white">{data.resolvedExceeded}</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="pb-2">Priority</th>
            <th className="pb-2">Resolved</th>
            <th className="pb-2">Within SLA</th>
            <th className="pb-2">Compliance</th>
            <th className="pb-2">Target (h)</th>
          </tr>
        </thead>
        <tbody>
          {data.byPriority.map((row) => (
            <tr key={row.priority} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-2 font-medium text-gray-900 dark:text-white">{ANALYTICS_PRIORITY_LABELS[row.priority]}</td>
              <td className="py-2 text-gray-600 dark:text-gray-300">{row.resolved}</td>
              <td className="py-2 text-gray-600 dark:text-gray-300">{row.withinSla}</td>
              <td className="py-2">
                <span className={cn('font-semibold', row.compliance >= 90 ? 'text-green-600' : row.compliance >= 75 ? 'text-orange-500' : 'text-red-600')}>
                  {row.compliance}%
                </span>
              </td>
              <td className="py-2 text-gray-600 dark:text-gray-300">{row.targetResolutionHours}</td>
            </tr>
          ))}
          {data.byPriority.length === 0 && (
            <tr>
              <td colSpan={5} className="py-3 text-gray-500 dark:text-gray-400">No resolved complaints.</td>
            </tr>
          )}
        </tbody>
      </table>
    </ChartCard>
  )
}