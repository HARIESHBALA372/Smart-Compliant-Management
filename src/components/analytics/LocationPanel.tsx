/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Location analysis panel (top locations + markers + density).
 * ------------------------------------------------------------------
 */

import { MapPin } from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { ANALYTICS_PRIORITY_LABELS, ANALYTICS_STATUS_LABELS } from '@/constants'
import type { LocationAnalytics } from '@/types/analytics'
import { cn } from '@/utils'

export function LocationPanel({ data }: { data: LocationAnalytics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Table>
          <TableHead>
            <TableHeader>Location</TableHeader>
            <TableHeader>Complaints</TableHeader>
            <TableHeader>Top Priority</TableHeader>
            <TableHeader>Latest Status</TableHeader>
          </TableHead>
          <TableBody>
            {data.locations.slice(0, 8).map((loc) => (
              <TableRow key={loc.location}>
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    {loc.location}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-300">{loc.count}</TableCell>
                <TableCell className="text-gray-600 dark:text-gray-300">
                  {loc.priority ? ANALYTICS_PRIORITY_LABELS[loc.priority] : '—'}
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-300">
                  {loc.status ? ANALYTICS_STATUS_LABELS[loc.status] : '—'}
                </TableCell>
              </TableRow>
            ))}
            {data.locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-gray-500 dark:text-gray-400">No location data.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalLocations}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Locations with complaints</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.complaintCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Complaints in range</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.densityPerDay}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Average per day</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recently active locations</p>
          <div className="space-y-1.5">
            {data.markers.slice(0, 5).map((m) => (
              <div
                key={m.location}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
                )}
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{m.location}</span>
                <span className="text-gray-500 dark:text-gray-400">{m.count}</span>
              </div>
            ))}
            {data.markers.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No markers.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}