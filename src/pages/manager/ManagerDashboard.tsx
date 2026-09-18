/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  FolderClock,
  TrendingUp,
  Clock,
  Gauge,
  Smile,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchAnalytics } from '@/store/slices/analyticsSlice'
import { StatCard } from '@/components/common/StatCard'
import { Card } from '@/components/common/Card'
import { ChartCard } from '@/components/charts/ChartCard'
import { PieChartComponent } from '@/components/charts/PieChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { LineChartComponent } from '@/components/charts/LineChart'
import { DashboardCardSkeleton } from '@/components/common/Skeleton'
import { Button } from '@/components/common/Button'
import { PageSpinner } from '@/components/common/Spinner'

export function ManagerDashboard() {
  const dispatch = useAppDispatch()
  const { data, isLoading } = useAppSelector((state) => state.analytics)

  useEffect(() => {
    dispatch(fetchAnalytics())
  }, [dispatch])

  if (isLoading && !data) return <PageSpinner />

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overall performance and operations overview</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center shadow-xs">
          <p className="text-gray-500 dark:text-gray-400">No dashboard analytics available right now.</p>
          <Button variant="outline" className="mt-4" onClick={() => dispatch(fetchAnalytics())}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overall performance and operations overview</p>
        </div>
        <Link to="/manager/analytics">
          <Button variant="outline">
            View Analytics
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Complaints" value={data.totalComplaints} icon={<FileText className="h-6 w-6" />} />
        <StatCard title="Open Complaints" value={data.openComplaints} icon={<FolderClock className="h-6 w-6" />} />
        <StatCard title="Resolution Rate" value={`${data.resolutionRate}%`} icon={<TrendingUp className="h-6 w-6" />} />
        <StatCard title="Avg Response Time" value={`${data.averageResponseTime}h`} icon={<Clock className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Avg Resolution Time" value={`${data.averageResolutionTime}h`} icon={<Clock className="h-6 w-6" />} />
        <StatCard title="SLA Compliance" value={`${data.slaCompliance}%`} icon={<Gauge className="h-6 w-6" />} />
        <StatCard title="Customer Satisfaction" value={data.customerSatisfaction} icon={<Smile className="h-6 w-6" />} />
        <StatCard title="Escalations" value={data.escalations} icon={<AlertTriangle className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Complaint Trend">
          <LineChartComponent data={data.complaintsTrend} xKey="date" yKey="count" />
        </ChartCard>
        <ChartCard title="Category Distribution">
          <PieChartComponent
            data={data.complaintsByCategory.map((c) => ({ name: c.category, value: c.count }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Priority Distribution">
          <BarChartComponent
            data={data.complaintsByPriority.map((p) => ({ name: p.priority, value: p.count }))}
            xKey="name"
            yKey="value"
          />
        </ChartCard>
        <ChartCard title="Agent Performance">
          <BarChartComponent
            data={(data.agentPerformance || []).map((a) => ({ name: a.agentName, value: a.resolved }))}
            xKey="name"
            yKey="value"
            color="#10B981"
          />
        </ChartCard>
      </div>
    </div>
  )
}