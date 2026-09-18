/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FileText,
  FolderClock,
  CheckCircle,
  AlertTriangle,
  Clock,
  Smile,
  UserCheck,
  ArrowRight,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchAnalytics } from '@/store/slices/analyticsSlice'
import { fetchUsers } from '@/store/slices/userSlice'
import { StatCard } from '@/components/common/StatCard'
import { ChartCard } from '@/components/charts/ChartCard'
import { PieChartComponent } from '@/components/charts/PieChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { LineChartComponent } from '@/components/charts/LineChart'
import { Button } from '@/components/common/Button'
import { PageSpinner } from '@/components/common/Spinner'

export function AdminDashboard() {
  const dispatch = useAppDispatch()
  const { data, isLoading: analyticsLoading } = useAppSelector((state) => state.analytics)
  const { users, total: totalUsers } = useAppSelector((state) => state.users)

  useEffect(() => {
    dispatch(fetchAnalytics())
    dispatch(fetchUsers({ limit: 100 }))
  }, [dispatch])

  if (analyticsLoading && !data) return <PageSpinner />
  if (!data) return null

  const activeAgents = users.filter((u) => (u.role === 'agent' || u.role === 'manager') && u.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide administration overview</p>
        </div>
        <Link to="/admin/analytics">
          <Button variant="outline">
            View Analytics
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={totalUsers} icon={<Users className="h-6 w-6" />} />
        <StatCard title="Total Complaints" value={data.totalComplaints} icon={<FileText className="h-6 w-6" />} />
        <StatCard title="Open Complaints" value={data.openComplaints} icon={<FolderClock className="h-6 w-6" />} />
        <StatCard title="Resolved" value={data.resolvedComplaints} icon={<CheckCircle className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="SLA Breaches" value={100 - data.slaCompliance} icon={<AlertTriangle className="h-6 w-6" />} />
        <StatCard title="Avg Resolution Time" value={`${data.averageResolutionTime}h`} icon={<Clock className="h-6 w-6" />} />
        <StatCard title="Customer Satisfaction" value={data.customerSatisfaction} icon={<Smile className="h-6 w-6" />} />
        <StatCard title="Active Agents" value={activeAgents} icon={<UserCheck className="h-6 w-6" />} />
      </div>

      <ChartCard title="Complaint Trends">
        <LineChartComponent data={data.complaintsTrend} xKey="date" yKey="count" />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="By Category">
          <PieChartComponent data={data.complaintsByCategory.map((c) => ({ name: c.category, value: c.count }))} />
        </ChartCard>
        <ChartCard title="By Priority">
          <BarChartComponent data={data.complaintsByPriority.map((p) => ({ name: p.priority, value: p.count }))} xKey="name" yKey="value" color="#8B5CF6" />
        </ChartCard>
        <ChartCard title="By Status">
          <PieChartComponent data={data.complaintsByStatus.map((s) => ({ name: s.status, value: s.count }))} />
        </ChartCard>
      </div>
    </div>
  )
}