/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics dashboard – assembles the shared admin/manager analytics view.
 * ------------------------------------------------------------------
 */

import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ChartCard } from '@/components/charts/ChartCard'
import { PageSpinner } from '@/components/common/Spinner'
import { ErrorState } from '@/components/common/ErrorState'
import { AnalyticsFilterBar, type DashboardMode } from '@/components/analytics/AnalyticsFilterBar'
import { KpiGrid } from '@/components/analytics/KpiGrid'
import { DistributionBars } from '@/components/analytics/DistributionBars'
import { TrendChart } from '@/components/analytics/TrendChart'
import { ResolutionPanel } from '@/components/analytics/ResolutionPanel'
import { SlaPanel } from '@/components/analytics/SlaPanel'
import { AgentLeaderboard } from '@/components/analytics/AgentLeaderboard'
import { DepartmentPanel } from '@/components/analytics/DepartmentPanel'
import { LocationPanel } from '@/components/analytics/LocationPanel'
import { UsersPanel } from '@/components/analytics/UsersPanel'
import { MlPanel } from '@/components/analytics/MlPanel'
import { InsightsPanel } from '@/components/analytics/InsightsPanel'
import { ExportPanel } from '@/components/analytics/ExportPanel'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAnalyticsRealtime } from '@/hooks/useAnalyticsRealtime'
import { ANALYTICS_CATEGORY_LABELS, ANALYTICS_PRIORITY_LABELS, ANALYTICS_STATUS_LABELS } from '@/constants'
import type { AnalyticsFilters } from '@/types/analytics'

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
const PRIORITY_COLORS: Record<string, string> = { LOW: '#10B981', MEDIUM: '#F59E0B', HIGH: '#F97316', CRITICAL: '#EF4444' }

export function AnalyticsDashboard({ mode }: { mode: DashboardMode }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return { startDate: start.toISOString(), endDate: end.toISOString() }
  })

  const { data, isLoading, isRefreshing, error, lastUpdated, refetch } = useAnalytics(filters, true)
  const { isLive } = useAnalyticsRealtime()

  const onChange = useCallback((next: AnalyticsFilters) => setFilters(next), [])

  if (error) {
    return <ErrorState title="Analytics unavailable" message={error} onRetry={refetch} />
  }
  if (isLoading || !data) return <PageSpinner />

  const departmentOptions = data
    ? data.departments.departments.map((d) => ({ value: d.departmentId, label: d.departmentName }))
    : []
  const agentOptions = data ? data.agents.agents.map((a) => ({ value: a.agentId, label: a.agentName })) : []

  const categoryLabel = (c: string) => ANALYTICS_CATEGORY_LABELS[c] ?? ANALYTICS_CATEGORY_LABELS[c.toUpperCase()] ?? c

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'admin' ? 'Platform Analytics' : 'Department Analytics'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'admin'
              ? 'Comprehensive platform performance insights'
              : 'Performance insights for your department'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPanel filters={filters} />
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={refetch} disabled={isRefreshing}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <AnalyticsFilterBar
        mode={mode}
        filters={filters}
        onChange={onChange}
        live={isLive}
        departments={departmentOptions}
        agents={agentOptions}
      />

      <KpiGrid overview={data.overview} />

      <ChartCard title="Complaint Volume Trend">
        <TrendChart points={data.trends.points} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Status Distribution">
          <DistributionBars
            slices={data.status.statuses.map((s) => ({
              label: ANALYTICS_STATUS_LABELS[s.status] ?? s.status,
              count: s.count,
              percentage: s.percentage,
            }))}
            colors={CHART_COLORS}
          />
        </ChartCard>
        <ChartCard title="Category Distribution">
          <DistributionBars
            slices={data.categories.categories.map((c) => ({
              label: categoryLabel(c.category),
              count: c.count,
              percentage: c.percentage,
              subLabel: `${c.open} open`,
            }))}
          />
        </ChartCard>
        <ChartCard title="Priority Distribution">
          <DistributionBars
            slices={data.priority.priorities.map((p) => ({
              label: ANALYTICS_PRIORITY_LABELS[p.priority] ?? p.priority,
              count: p.count,
              percentage: p.percentage,
              subLabel: `${p.resolved} resolved / ${p.pending} pending`,
            }))}
            colors={PRIORITY_COLORS as unknown as string[]}
          />
        </ChartCard>
      </div>

      <ResolutionPanel data={data.resolution} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SlaPanel data={data.sla} />
        <ChartCard title="Trend Insights">
          <InsightsPanel data={data.insights} />
        </ChartCard>
      </div>

      {data.agents.leaderboard.length > 0 && (
        <ChartCard title="Agent Leaderboard">
          <AgentLeaderboard rows={data.agents.leaderboard} />
        </ChartCard>
      )}

      {data.departments.departments.length > 0 && (
        <ChartCard title="Department Performance">
          <DepartmentPanel rows={data.departments.departments} total={data.departments.total} />
        </ChartCard>
      )}

      {data.locations.locations.length > 0 && (
        <ChartCard title="Location Analysis">
          <LocationPanel data={data.locations} />
        </ChartCard>
      )}

      {data.users.topComplainants.length > 0 && (
        <ChartCard title="Customer Behaviour">
          <UsersPanel data={data.users} />
        </ChartCard>
      )}

      <ChartCard title="AI Classification">
        <MlPanel data={data.ml} />
      </ChartCard>
    </div>
  )
}