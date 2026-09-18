/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Agent leaderboard panel.
 * ------------------------------------------------------------------
 */

import { Trophy } from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import type { AgentAnalyticsRow } from '@/types/analytics'
import { cn } from '@/utils'

const MEDALS = ['text-yellow-500', 'text-gray-400', 'text-amber-700']

export function AgentLeaderboard({ rows }: { rows: (AgentAnalyticsRow & { rank: number })[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No agent data available.</p>
  }

  return (
    <Table>
      <TableHead>
        <TableHeader>Rank</TableHeader>
        <TableHeader>Agent</TableHeader>
        <TableHeader>Department</TableHeader>
        <TableHeader>Assigned</TableHeader>
        <TableHeader>Resolved</TableHeader>
        <TableHeader>Pending</TableHeader>
        <TableHeader>Escalated</TableHeader>
        <TableHeader>Avg Resolution</TableHeader>
        <TableHeader>SLA</TableHeader>
        <TableHeader>Rating</TableHeader>
        <TableHeader>Score</TableHeader>
      </TableHead>
      <TableBody>
        {rows.map((a) => (
          <TableRow key={a.agentId}>
            <TableCell>
              {a.rank <= 3 ? (
                <Trophy className={cn('h-4 w-4', MEDALS[a.rank - 1])} />
              ) : (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {a.rank}
                </span>
              )}
            </TableCell>
            <TableCell className="font-medium text-gray-900 dark:text-white">{a.agentName}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.departmentName ?? '—'}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.assigned}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.resolved}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.pending}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.escalated}</TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.averageResolutionTime}</TableCell>
            <TableCell>
              <span className={cn('font-semibold', a.slaCompliance >= 90 ? 'text-green-600' : 'text-orange-500')}>{a.slaCompliance}%</span>
            </TableCell>
            <TableCell className="text-gray-600 dark:text-gray-300">{a.customerRating !== null ? a.customerRating.toFixed(1) : '—'}</TableCell>
            <TableCell className="font-bold text-gray-900 dark:text-white">{a.score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}