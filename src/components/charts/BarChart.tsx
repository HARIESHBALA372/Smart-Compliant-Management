/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface BarChartComponentProps {
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  color?: string
}

export function BarChartComponent({ data, xKey, yKey, color = '#3B82F6' }: BarChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6B7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
        <Tooltip />
        <Legend />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
