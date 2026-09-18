/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics filter bar: date range presets + status/priority/category
 *  chips + department/agent selects (admin only) + live badge.
 * ------------------------------------------------------------------
 */

import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { Button } from '@/components/common/Button'
import type { AnalyticsFilters, AnalyticsPriority, AnalyticsRange, AnalyticsStatus } from '@/types/analytics'
import {
  ANALYTICS_PRIORITY_LABELS,
  ANALYTICS_STATUS_LABELS,
  DATE_RANGES,
} from '@/constants'
import { cn } from '@/utils'

export type DashboardMode = 'admin' | 'manager'

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'WATER', label: 'Water' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'ROADS', label: 'Roads' },
  { value: 'SANITATION', label: 'Sanitation' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_OPTIONS = Object.entries(ANALYTICS_STATUS_LABELS) as [AnalyticsStatus, string][]
const PRIORITY_OPTIONS = Object.entries(ANALYTICS_PRIORITY_LABELS) as [AnalyticsPriority, string][]

interface AnalyticsFilterBarProps {
  mode: DashboardMode
  filters: AnalyticsFilters
  onChange: (next: AnalyticsFilters) => void
  live?: boolean
  departments?: { value: string; label: string }[]
  agents?: { value: string; label: string }[]
}

function dateRange(range: AnalyticsRange, customStart?: string, customEnd?: string): Pick<AnalyticsFilters, 'startDate' | 'endDate'> {
  const end = new Date()
  const start = new Date()
  if (range === 'today') start.setHours(0, 0, 0, 0)
  else if (range === '7d') start.setDate(start.getDate() - 7)
  else if (range === '30d') start.setDate(start.getDate() - 30)
  else if (range === '90d') start.setDate(start.getDate() - 90)

  if (range === 'custom') {
    if (!customStart || !customEnd) return {}
    return { startDate: new Date(customStart).toISOString(), endDate: new Date(customEnd).toISOString() }
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export function AnalyticsFilterBar({
  mode,
  filters,
  onChange,
  live = false,
  departments = [],
  agents = [],
}: AnalyticsFilterBarProps) {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const applyRange = (r: AnalyticsRange) => {
    setRange(r)
    if (r === 'custom') {
      if (customStart && customEnd) {
        onChange({ ...filters, ...dateRange('custom', customStart, customEnd) })
      } else {
        onChange({ ...filters, startDate: undefined, endDate: undefined })
      }
      return
    }
    onChange({ ...filters, ...dateRange(r) })
  }

  const toggleMulti = <T extends string>(key: 'statuses' | 'priorities' | 'categories', value: T, current?: T[]) => {
    const list = current ?? []
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    onChange({ ...filters, [key]: next.length ? next : undefined })
  }

  const chip = (active: boolean) =>
    active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-white border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'

  const hasFilters = Boolean(
    filters.statuses?.length || filters.priorities?.length || filters.categories?.length || filters.agent || filters.department,
  )

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => applyRange(r.value as AnalyticsRange)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                r.value === range ? chip(true) : chip(false),
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-40 py-1.5 text-xs"
              aria-label="Start date"
            />
            <span className="text-xs text-gray-400">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-40 py-1.5 text-xs"
              aria-label="End date"
            />
            <Button size="sm" variant="outline" onClick={() => applyRange('custom')}>
              Apply
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ startDate: filters.startDate, endDate: filters.endDate })}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleMulti('statuses', value, filters.statuses)}
                className={cn('px-2 py-0.5 rounded-full text-xs font-medium border transition-colors', chip(filters.statuses?.includes(value) ?? false))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleMulti('priorities', value, filters.priorities)}
                className={cn('px-2 py-0.5 rounded-full text-xs font-medium border transition-colors', chip(filters.priorities?.includes(value) ?? false))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleMulti('categories', value, filters.categories)}
                className={cn('px-2 py-0.5 rounded-full text-xs font-medium border transition-colors', chip(filters.categories?.includes(value) ?? false))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'admin' && (
          <div className="flex items-center gap-2">
            <Select
              value={filters.department ?? ''}
              onChange={(e) => onChange({ ...filters, department: e.target.value || undefined })}
              options={[{ value: '', label: 'All Departments' }, ...departments]}
              className="w-44 py-1.5 text-xs"
              aria-label="Department"
            />
            <Select
              value={filters.agent ?? ''}
              onChange={(e) => onChange({ ...filters, agent: e.target.value || undefined })}
              options={[{ value: '', label: 'All Agents' }, ...agents]}
              className="w-44 py-1.5 text-xs"
              aria-label="Agent"
            />
          </div>
        )}
      </div>
    </div>
  )
}