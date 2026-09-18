/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  return (
    <div className={cn('relative group', className)}>
      {trigger}
      <div
        className={cn(
          'absolute top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        className,
      )}
    >
      {children}
    </button>
  )
}
