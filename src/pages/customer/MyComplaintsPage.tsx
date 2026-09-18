/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, FileText } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaints } from '@/store/slices/complaintSlice'
import { useDebounce } from '@/hooks/useDebounce'
import type { ComplaintPriority, ComplaintStatus } from '@/types'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Pagination } from '@/components/common/Pagination'
import { SearchBar } from '@/components/common/SearchBar'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { TableRowSkeleton } from '@/components/common/Skeleton'

export function MyComplaintsPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { complaints, total, page, totalPages, isLoading } = useAppSelector((state) => state.complaints)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | ''>('')
  const [priority, setPriority] = useState<ComplaintPriority | ''>('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')

  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    dispatch(fetchComplaints({ customerId: user?.id || '1', page: 1, limit: 10, search: debouncedSearch || undefined }))
  }, [dispatch, debouncedSearch, user?.id])

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (status && c.status !== status) return false
      if (priority && c.priority !== priority) return false
      if (category && c.category !== category) return false
      return true
    })
  }, [complaints, status, priority, category])

  const columns: Array<{ key: string; label: string }> = [
    { key: 'complaintId', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'assignedAgent', label: 'Agent' },
    { key: 'createdAt', label: 'Created' },
  ]

  const sortKey = sortBy === 'title' ? 'title' : sortBy === 'createdAt' ? 'createdAt' : 'complaintId'
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return String(a[sortKey as keyof typeof a]).localeCompare(String(b[sortKey as keyof typeof b]))
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Complaints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and track all your complaints</p>
        </div>
        <Link to="/customer/complaints/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-1" />
            Submit Complaint
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search complaints..." />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplaintStatus | '')}
            className="px-3 py-2 border rounded-lg text-sm"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_customer_response">Pending Response</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ComplaintPriority | '')}
            className="px-3 py-2 border rounded-lg text-sm"
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            <option>Billing</option>
            <option>Technical Support</option>
            <option>Account</option>
            <option>Payment</option>
            <option>Delivery</option>
            <option>Product</option>
            <option>Service</option>
            <option>Other</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
            aria-label="Sort by"
          >
            <option value="createdAt">Newest</option>
            <option value="title">Title</option>
            <option value="complaintId">Complaint ID</option>
          </select>
        </div>
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHead>
            {columns.map((col) => (
              <TableHeader key={col.key}>{col.label}</TableHeader>
            ))}
            <TableHeader>Actions</TableHeader>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : sorted.length ? (
              sorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-blue-600 dark:text-blue-400">{c.complaintId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={c.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{c.assignedAgent?.name || 'Not assigned'}</TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link to={`/customer/complaints/${c.id}`} className="text-sm text-blue-600 hover:underline">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState title="No complaints found" description="Try adjusting your search or filters." icon={<FileText className="h-12 w-12" />} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length ? (
          <div className="space-y-4">
            {sorted.map((c) => (
              <Link key={c.id} to={`/customer/complaints/${c.id}`} className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{c.complaintId}</span>
                  <StatusBadge status={c.status} />
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">{c.title}</h4>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{c.category}</span>
                  <PriorityBadge priority={c.priority} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No complaints found" icon={<FileText className="h-12 w-12" />} />
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {sorted.length} of {total} complaints</p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => dispatch(fetchComplaints({ customerId: '1', page: p }))} />
      </div>
    </div>
  )
}
