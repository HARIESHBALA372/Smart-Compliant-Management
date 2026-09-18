/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Complaint volume trend line chart (recharts).
 * ------------------------------------------------------------------
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TrendPoint } from '@/types/analytics'

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No trend data for the selected range.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#6B7280" minTickGap={28} />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ResolutionTrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No resolution trend yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id="resTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#6B7280" minTickGap={28} />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
        <Tooltip />
        <Area type="monotone" dataKey="avg_hours" name="Avg hours" stroke="#10B981" strokeWidth={2} fill="url(#resTrendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}