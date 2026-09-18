/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LineChartComponentProps {
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  color?: string
}

export function LineChartComponent({ data, xKey, yKey, color = '#3B82F6' }: LineChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6B7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
