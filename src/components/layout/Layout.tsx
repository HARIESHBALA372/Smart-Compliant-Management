/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/utils'
import { useAppSelector } from '@/store/hooks'
import { wsService } from '@/services/websocketService'
import { isMockMode } from '@/services/mock/mockData'

interface LayoutProps {
  children?: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)

  useEffect(() => {
    if (isMockMode()) return
    wsService.connect()
    return () => {
      wsService.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={cn('transition-all duration-300 lg:ml-64', sidebarCollapsed && 'lg:ml-20')}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">{children || <Outlet />}</main>
      </div>
    </div>
  )
}