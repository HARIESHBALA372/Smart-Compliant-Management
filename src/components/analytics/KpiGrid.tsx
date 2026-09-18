/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics KPI overview grid.
 * ------------------------------------------------------------------
 */

import { FileText, AlertTriangle, RefreshCw, Gauge, TrendingUp, Clock, Smile, Inbox, CheckCircle2, Flame } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'
import type { AnalyticsOverview } from '@/types/analytics'

export function KpiGrid({ overview }: { overview: AnalyticsOverview }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <StatCard title="Total Complaints" value={overview.totalComplaints} icon={<FileText className="h-6 w-6" />} />
      <StatCard title="Open / Pending" value={overview.pendingComplaints} icon={<Inbox className="h-6 w-6" />} />
      <StatCard title="In Progress" value={overview.inProgressComplaints} icon={<TrendingUp className="h-6 w-6" />} />
      <StatCard title="Resolved" value={overview.resolvedComplaints} icon={<CheckCircle2 className="h-6 w-6" />} />
      <StatCard title="Closed" value={overview.closedComplaints} icon={<CheckCircle2 className="h-6 w-6" />} />
      <StatCard title="High Priority" value={overview.highPriorityComplaints} icon={<Flame className="h-6 w-6" />} />
      <StatCard title="Escalated" value={overview.escalatedComplaints} icon={<AlertTriangle className="h-6 w-6" />} />
      <StatCard title="Reopened" value={overview.reopenedComplaints} icon={<RefreshCw className="h-6 w-6" />} />
      <StatCard title="Resolution Rate" value={`${overview.resolutionRate}%`} icon={<TrendingUp className="h-6 w-6" />} />
      <StatCard title="Avg Response" value={`${overview.averageResponseHours}h`} icon={<Clock className="h-6 w-6" />} />
      <StatCard title="Avg Resolution" value={overview.averageResolutionTime} icon={<Clock className="h-6 w-6" />} />
      <StatCard title="SLA Compliance" value={`${overview.slaCompliance}%`} icon={<Gauge className="h-6 w-6" />} />
      <StatCard title="Customer Rating" value={(overview.customerSatisfaction ?? 0).toFixed(1)} icon={<Smile className="h-6 w-6" />} />
    </div>
  )
}