/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  ML / AI analytics panel (coverage, confidence, distributions).
 * ------------------------------------------------------------------
 */

import { Brain, Percent, ShieldCheck } from 'lucide-react'
import { DistributionBars } from '@/components/analytics/DistributionBars'
import { ANALYTICS_PRIORITY_LABELS } from '@/constants'
import type { MlAnalytics } from '@/types/analytics'

export function MlPanel({ data }: { data: MlAnalytics }) {
  const uncovered = data.total - data.classifiedCount
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-3">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.classifiedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Classified by AI</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.coverage}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Coverage ({uncovered} unclassified)</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{((data.averageConfidence ?? 0) * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg confidence</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Category distribution</p>
        <DistributionBars
          slices={data.categoryDistribution.map((c) => ({
            label: c.category,
            count: c.count,
            percentage: data.total ? Math.round((c.count / data.total) * 100) : 0,
            subLabel: `${((c.averageConfidence ?? 0) * 100).toFixed(0)}% conf`,
          }))}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Priority distribution</p>
        <DistributionBars
          slices={data.priorityDistribution.map((p) => ({
            label: ANALYTICS_PRIORITY_LABELS[p.priority] ?? p.priority,
            count: p.count,
            percentage: data.total ? Math.round((p.count / data.total) * 100) : 0,
            subLabel: `${((p.averageConfidence ?? 0) * 100).toFixed(0)}% conf`,
          }))}
        />
      </div>
    </div>
  )
}