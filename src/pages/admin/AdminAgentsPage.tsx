/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { adminApi } from '@/services/adminApi'
import type { AgentWithWorkload } from '@/types'
import { Card } from '@/components/common/Card'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSpinner } from '@/components/common/Spinner'
import { Input } from '@/components/common/Input'

function SlaBar({ value }: { value: number }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 75 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium">{value}%</span>
    </div>
  )
}

export function AdminAgentsPage() {
  const { showToast } = useToast()
  const [agents, setAgents] = useState<AgentWithWorkload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const result = await adminApi.getAgents({ search: search || undefined })
      setAgents(result.data)
    } catch {
      showToast({ type: 'error', message: 'Failed to load agents' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    adminApi.getAgents().then((result) => {
      if (cancelled) return
      setAgents(result.data)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = () => load()

  const filtered = agents.filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor agent workload and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search agents..."
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        {filtered.length ? (
          <Table>
            <TableHead>
              <TableHeader>Name</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Department</TableHeader>
              <TableHeader>Assigned</TableHeader>
              <TableHeader>Open</TableHeader>
              <TableHeader>Critical</TableHeader>
              <TableHeader>Overdue</TableHeader>
              <TableHeader>Resolved</TableHeader>
              <TableHeader>Avg Resolution</TableHeader>
              <TableHeader>SLA</TableHeader>
            </TableHead>
            <TableBody>
              {filtered.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      {agent.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{agent.email}</TableCell>
                  <TableCell className="text-sm">{agent.department?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{agent.assigned}</TableCell>
                  <TableCell className="text-sm">
                    <span className="text-orange-600 dark:text-orange-400 font-medium">{agent.open}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-red-600 dark:text-red-400 font-medium">{agent.critical}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {agent.overdue > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">{agent.overdue}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-green-600 dark:text-green-400">{agent.resolved}</TableCell>
                  <TableCell className="text-sm">{(agent.avgResolutionHours ?? 0).toFixed(1)}h</TableCell>
                  <TableCell><SlaBar value={agent.slaCompliance ?? 0} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No agents found" description={search ? 'Try a different search term.' : 'No agents are currently registered.'} />
        )}
      </Card>
    </div>
  )
}
