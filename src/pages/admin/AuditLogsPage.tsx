/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchAuditLogs } from '@/store/slices/auditSlice'
import { Card } from '@/components/common/Card'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Pagination } from '@/components/common/Pagination'
import { SearchBar } from '@/components/common/SearchBar'
import { PageSpinner } from '@/components/common/Spinner'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDateTime } from '@/utils'

function formatDetails(details: unknown): string {
  if (!details) return '—'
  if (typeof details === 'string') return details
  try {
    const str = JSON.stringify(details)
    return str === '{}' ? '—' : str
  } catch {
    return String(details)
  }
}

export function AuditLogsPage() {
  const dispatch = useAppDispatch()
  const { logs, total, page, totalPages, isLoading } = useAppSelector((state) => state.audit)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchAuditLogs({ search: search || undefined }))
  }, [dispatch, search])

  if (isLoading && !logs.length) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Track all system actions and changes</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search audit logs..." />

      <Card>
        {logs.length > 0 ? (
          <Table>
            <TableHead>
              <TableHeader>User</TableHeader>
              <TableHeader>Action</TableHeader>
              <TableHeader>Resource</TableHeader>
              <TableHeader>Resource ID</TableHeader>
              <TableHeader>Timestamp</TableHeader>
              <TableHeader>IP Address</TableHeader>
              <TableHeader>Details</TableHeader>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const detailsText = formatDetails(log.details)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.userName || log.user?.name || log.userId}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell className="text-gray-500 text-xs font-mono">{log.resourceId}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="text-gray-500 text-xs font-mono">{log.ipAddress || '—'}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-gray-500 text-xs font-mono" title={detailsText}>
                      {detailsText}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No audit logs found"
            description={search ? 'No logs match your search criteria.' : 'No system actions have been recorded yet.'}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => dispatch(fetchAuditLogs({ page: p }))} />
      )}
    </div>
  )
}