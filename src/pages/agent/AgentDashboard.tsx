/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Inbox,
  FolderClock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaints } from '@/store/slices/complaintSlice'
import { StatCard } from '@/components/common/StatCard'
import { Card } from '@/components/common/Card'
import { ChartCard } from '@/components/charts/ChartCard'
import { PieChartComponent } from '@/components/charts/PieChart'
import { LineChartComponent } from '@/components/charts/LineChart'
import { DashboardCardSkeleton } from '@/components/common/Skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { SLAIndicator } from '@/components/common/SLAIndicator'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { formatDate } from '@/utils'

export function AgentDashboard() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { complaints, isLoading } = useAppSelector((state) => state.complaints)

  useEffect(() => {
    dispatch(fetchComplaints({ assignedAgentId: user?.id || '2', limit: 100 }))
  }, [dispatch, user?.id])

  const stats = {
    assigned: complaints.length,
    new: complaints.filter((c) => c.status === 'submitted').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    pendingResponse: complaints.filter((c) => c.status === 'pending_customer_response').length,
    overdue: complaints.filter((c) => new Date(c.slaDeadline) < new Date()).length,
    resolvedToday: 0,
  }

  const queue = complaints.slice(0, 5)

  const statusData = [
    { name: 'Submitted', value: complaints.filter((c) => c.status === 'submitted').length },
    { name: 'In Progress', value: complaints.filter((c) => c.status === 'in_progress').length },
    { name: 'Resolved', value: complaints.filter((c) => c.status === 'resolved').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here's your workload.</p>
        </div>
        <Link to="/agent/complaints">
          <Button variant="outline">
            View All Complaints
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          <StatCard title="Assigned" value={stats.assigned} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="New" value={stats.new} icon={<Inbox className="h-6 w-6" />} />
          <StatCard title="In Progress" value={stats.inProgress} icon={<FolderClock className="h-6 w-6" />} />
          <StatCard title="Pending Response" value={stats.pendingResponse} icon={<MessageSquare className="h-6 w-6" />} />
          <StatCard title="Overdue" value={stats.overdue} icon={<AlertTriangle className="h-6 w-6" />} />
          <StatCard title="Resolved Today" value={stats.resolvedToday} icon={<CheckCircle className="h-6 w-6" />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Complaint Distribution">
          <PieChartComponent data={statusData} />
        </ChartCard>
        <ChartCard title="Performance Trend">
          <LineChartComponent data={statusData.map((s, i) => ({ date: s.name, count: s.value }))} xKey="date" yKey="count" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complaint Queue</h3>
            <Link to="/agent/complaints" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {queue.length ? (
            <Table>
              <TableHead>
                <TableHeader>ID</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>SLA</TableHeader>
              </TableHead>
              <TableBody>
                {queue.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/agent/complaints/${c.id}`} className="text-blue-600 hover:underline">
                        {c.complaintId}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{c.title}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={c.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <SLAIndicator deadline={c.slaDeadline} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No assigned complaints" />
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SLA Alerts</h3>
          <div className="space-y-2">
            {complaints
              .filter((c) => c.status !== 'resolved' && c.status !== 'closed')
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <Link to={`/agent/complaints/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {c.complaintId}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(c.slaDeadline)}</p>
                  </div>
                  <SLAIndicator deadline={c.slaDeadline} />
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
