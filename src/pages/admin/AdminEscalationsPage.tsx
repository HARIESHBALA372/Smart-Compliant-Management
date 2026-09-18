/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { adminApi } from '@/services/adminApi'
import type { ComplaintEscalation } from '@/types'
import { Card } from '@/components/common/Card'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSpinner } from '@/components/common/Spinner'

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Level 1',
  LEVEL_2: 'Level 2',
  LEVEL_3: 'Level 3',
}

export function AdminEscalationsPage() {
  const { showToast } = useToast()
  const [escalations, setEscalations] = useState<ComplaintEscalation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    try {
      const result = await adminApi.getEscalations()
      setEscalations(result.data)
    } catch {
      showToast({ type: 'error', message: 'Failed to load escalations' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    adminApi.getEscalations().then((result) => {
      if (cancelled) return
      setEscalations(result.data)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const formatDate = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Escalations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">View all complaint escalations across the system</p>
      </div>

      <Card>
        {escalations.length ? (
          <Table>
            <TableHead>
              <TableHeader>Complaint</TableHeader>
              <TableHeader>Level</TableHeader>
              <TableHeader>Escalated By</TableHeader>
              <TableHeader>Escalated To</TableHeader>
              <TableHeader>Reason</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Date</TableHeader>
            </TableHead>
            <TableBody>
              {escalations.map((esc) => (
                <TableRow key={esc.id}>
                  <TableCell>
                    <Link to={`/admin/complaints`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm">
                      {esc.complaintNumber || esc.complaintId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
                      {LEVEL_LABELS[esc.toLevel] || esc.toLevel}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{esc.escalator?.name || 'System'}</TableCell>
                  <TableCell className="text-sm">{esc.escalatee?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">{esc.reason || '—'}</TableCell>
                  <TableCell>
                    {esc.isResolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="h-3 w-3" /> Open
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(esc.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No escalations" description="No complaints have been escalated yet." />
        )}
      </Card>
    </div>
  )
}
