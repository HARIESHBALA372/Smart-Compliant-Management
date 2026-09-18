/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState, type ReactNode } from 'react'
import { cn } from '@/utils'

interface TabsProps {
  tabs: { id: string; label: string; icon?: ReactNode }[]
  activeTab?: string
  onTabChange: (id: string) => void
  children: ReactNode
}

export function Tabs({ tabs, activeTab: controlledTab, onTabChange, children }: TabsProps) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id || '')
  const activeTab = controlledTab ?? internalTab

  const handleChange = (id: string) => {
    setInternalTab(id)
    onTabChange(id)
  }

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-0 -mb-px" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              onClick={() => handleChange(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
              )}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
