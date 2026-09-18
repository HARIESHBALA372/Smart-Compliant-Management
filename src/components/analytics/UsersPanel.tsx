/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  User analytics panel (totals + top complainants).
 * ------------------------------------------------------------------
 */

import { Users } from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import type { UserAnalytics } from '@/types/analytics'

export function UsersPanel({ data }: { data: UserAnalytics }) {
  const t = data.totals
  const cards = [
    { label: 'Total Users', value: t.totalUsers },
    { label: 'Active Customers', value: t.activeCustomers },
    { label: 'Staff', value: t.staffCount },
    { label: 'Complaints', value: t.totalComplaints },
    { label: 'Avg / User', value: t.avgComplaintsPerUser },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2">
        <Table>
          <TableHead>
            <TableHeader>Customer</TableHeader>
            <TableHeader>Complaints Filed</TableHeader>
          </TableHead>
          <TableBody>
            {data.topComplainants.map((u) => (
              <TableRow key={u.userId}>
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-500" />
                    {u.userName}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-300">{u.count}</TableCell>
              </TableRow>
            ))}
            {data.topComplainants.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-gray-500 dark:text-gray-400">No complainants.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}