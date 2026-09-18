/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, FolderClock, Inbox, CheckCircle, XCircle, PlusCircle, ArrowRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaints } from '@/store/slices/complaintSlice'
import { StatCard } from '@/components/common/StatCard'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { ChartCard } from '@/components/charts/ChartCard'
import { PieChartComponent } from '@/components/charts/PieChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { LineChartComponent } from '@/components/charts/LineChart'
import { DashboardCardSkeleton } from '@/components/common/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { formatDate } from '@/utils'

export function CustomerDashboard() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { complaints, isLoading } = useAppSelector((state) => state.complaints)

  useEffect(() => {
    dispatch(fetchComplaints({ customerId: user?.id || '1', limit: 100 }))
  }, [dispatch, user?.id])

  const stats = useMemo(
    () => ({
      total: complaints.length,
      open: complaints.filter((c) => c.status === 'submitted' || c.status === 'under_review').length,
      inProgress: complaints.filter((c) => c.status === 'in_progress' || c.status === 'pending_customer_response').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      closed: complaints.filter((c) => c.status === 'closed').length,
    }),
    [complaints],
  )

  const statusData = [
    { name: 'Submitted', value: complaints.filter((c) => c.status === 'submitted').length },
    { name: 'In Progress', value: complaints.filter((c) => c.status === 'in_progress').length },
    { name: 'Resolved', value: complaints.filter((c) => c.status === 'resolved').length },
    { name: 'Closed', value: complaints.filter((c) => c.status === 'closed').length },
  ]

  const categoryData = complaints.reduce<{ name: string; value: number }[]>((acc, c) => {
    const existing = acc.find((a) => a.name === c.category)
    if (existing) existing.value++
    else acc.push({ name: c.category, value: 1 })
    return acc
  }, [])

  const recentComplaints = complaints.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here's your complaint overview.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/customer/complaints">
            <Button variant="outline">
              View All Complaints
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link to="/customer/complaints/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-1" />
              Submit Complaint
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Total Complaints" value={stats.total} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Open" value={stats.open} icon={<FolderClock className="h-6 w-6" />} />
          <StatCard title="In Progress" value={stats.inProgress} icon={<Inbox className="h-6 w-6" />} />
          <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle className="h-6 w-6" />} />
          <StatCard title="Closed" value={stats.closed} icon={<XCircle className="h-6 w-6" />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Complaint Status">
          <PieChartComponent data={statusData} />
        </ChartCard>
        <ChartCard title="Complaints by Category">
          {categoryData.length ? <BarChartComponent data={categoryData} xKey="name" yKey="value" /> : <EmptyState title="No data yet" />}
        </ChartCard>
      </div>

      <ChartCard title="Complaint Trend">
        <LineChartComponent data={complaints.slice(0, 7).map((c, i) => ({ date: `Day ${i + 1}`, count: i + 1 }))} xKey="date" yKey="count" />
      </ChartCard>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Complaints</h3>
          <Link to="/customer/complaints" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </Link>
        </div>
        {complaints.length ? (
          <Table>
            <TableHead>
              <TableHeader>ID</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Created</TableHeader>
            </TableHead>
            <TableBody>
              {recentComplaints.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`/customer/complaints/${c.id}`} className="text-blue-600 hover:underline">
                      {c.complaintId}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={c.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No complaints yet" description="Submit your first complaint to get started." />
        )}
      </Card>
    </div>
  )
}
