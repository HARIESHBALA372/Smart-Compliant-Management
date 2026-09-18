/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from './Button'

interface FilterPanelProps {
  children: React.ReactNode
  activeCount?: number
  onClear?: () => void
}

export function FilterPanel({ children, activeCount = 0, onClear }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
        <Filter className="h-4 w-4 mr-1" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-10 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h4>
            <div className="flex gap-2">
              {activeCount > 0 && onClear && (
                <button onClick={onClear} className="text-xs text-blue-600 hover:underline">
                  Clear all
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close filters">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}
