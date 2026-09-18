/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers } from '@/store/slices/userSlice'
import { Card } from '@/components/common/Card'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Pagination } from '@/components/common/Pagination'
import { SearchBar } from '@/components/common/SearchBar'
import { PageSpinner } from '@/components/common/Spinner'
import { Role } from '@/types'
import { EmptyState } from '@/components/common/EmptyState'
import { getInitials } from '@/utils'

export function ManagerAgentsPage() {
  const dispatch = useAppDispatch()
  const { users, total, page, totalPages, isLoading } = useAppSelector((state) => state.users)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchUsers({ role: Role.AGENT, search: search || undefined }))
  }, [dispatch, search])

  if (isLoading && !users.length) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Agents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor agent performance and workload</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search agents..." />

      <Card>
        {users.length > 0 ? (
          <Table>
            <TableHead>
              <TableHeader>Agent</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Phone</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center font-semibold text-blue-700 dark:text-blue-300 text-xs">
                        {getInitials(u.name)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{u.email}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{u.phone || '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No agents found"
            description={search ? 'No agents match your search query.' : 'No agents are currently registered.'}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => dispatch(fetchUsers({ role: Role.AGENT, page: p }))} />
      )}
    </div>
  )
}