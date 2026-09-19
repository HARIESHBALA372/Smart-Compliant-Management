/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaints } from '@/store/slices/complaintSlice'
import { Card } from '@/components/common/Card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { SLAIndicator } from '@/components/common/SLAIndicator'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchBar } from '@/components/common/SearchBar'
import { PageSpinner } from '@/components/common/Spinner'
import { formatDate } from '@/utils'

export function SLAAalertsPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { complaints, isLoading } = useAppSelector((state) => state.complaints)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchComplaints({ assignedAgentId: user.id, limit: 100 }))
    } else {
      dispatch(fetchComplaints({ limit: 100 }))
    }
  }, [dispatch, user?.id])

  const alerts = useMemo(() => {
    const now = new Date()
    return complaints
      .filter((c) => c.status !== 'resolved' && c.status !== 'closed')
      .filter((c) => {
        const deadline = new Date(c.slaDeadline)
        const hoursLeft = (deadline.getTime() - now.getTime()) / 3600000
        return hoursLeft < 24
      })
      .filter(
        (c) =>
          !search ||
          c.complaintId.toLowerCase().includes(search.toLowerCase()) ||
          c.title.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime())
  }, [complaints, search])

  if (isLoading && !complaints.length) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Alerts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Complaints approaching or breaching their SLA deadlines
        </p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search SLA alerts..." />

      {alerts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <Link to={`/agent/complaints/${c.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600">{c.complaintId}</span>
                  <PriorityBadge priority={c.priority} />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">{c.title}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{c.category}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">Created {formatDate(c.createdAt)}</span>
                  <SLAIndicator deadline={c.slaDeadline} />
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <EmptyState title="No SLA alerts" description="All complaints are within their SLA deadlines." />
        </div>
      )}
    </div>
  )
}