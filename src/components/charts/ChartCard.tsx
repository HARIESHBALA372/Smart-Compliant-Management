/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
  className?: string
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className || ''}`}>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{title}</h3>
      {children}
    </div>
  )
}
