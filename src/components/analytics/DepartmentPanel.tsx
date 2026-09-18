/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Department performance panel.
 * ------------------------------------------------------------------
 */

import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import type { DepartmentAnalyticsRow } from '@/types/analytics'
import { cn } from '@/utils'

export function DepartmentPanel({ rows, total }: { rows: DepartmentAnalyticsRow[]; total: number }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No department data available.</p>
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Total complaints: {total}</p>
      <Table>
        <TableHead>
          <TableHeader>Department</TableHeader>
          <TableHeader>Total</TableHeader>
          <TableHeader>Pending</TableHeader>
          <TableHeader>Resolved</TableHeader>
          <TableHeader>Escalated</TableHeader>
          <TableHeader>Resolution Rate</TableHeader>
          <TableHeader>Avg Resolution</TableHeader>
          <TableHeader>SLA</TableHeader>
        </TableHead>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.departmentId}>
              <TableCell className="font-medium text-gray-900 dark:text-white">{d.departmentName}</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.total}</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.pending}</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.resolved}</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.escalated}</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.resolutionRate}%</TableCell>
              <TableCell className="text-gray-600 dark:text-gray-300">{d.averageResolutionTime}</TableCell>
              <TableCell>
                <span className={cn('font-semibold', d.slaCompliance >= 90 ? 'text-green-600' : d.slaCompliance >= 75 ? 'text-orange-500' : 'text-red-600')}>
                  {d.slaCompliance}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}