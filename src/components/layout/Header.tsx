/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, Sun, Moon, Monitor, ChevronDown, BellRing } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'
import { fetchNotifications, fetchUnreadCount, markAsRead } from '@/store/slices/notificationSlice'
import { useTheme } from '@/hooks/useTheme'
import { Dropdown, DropdownItem } from '@/components/common/Dropdown'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { cn, getInitials } from '@/utils'
import { Role } from '@/types'

const roleLabels: Record<string, string> = {
  [Role.CUSTOMER]: 'Customer',
  [Role.AGENT]: 'Support Agent',
  [Role.MANAGER]: 'Manager',
  [Role.ADMIN]: 'Administrator',
}

const themeIcons = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Monitor className="h-4 w-4" />,
}

export function Header() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount)
  const notifications = useAppSelector((state) => state.notifications.notifications)
  const { changeTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const role = user?.role || Role.CUSTOMER
  const basePath = `/${role}`

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 5 }))
    dispatch(fetchUnreadCount())
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleRead = (id: string) => {
    dispatch(markAsRead(id))
    dispatch(fetchUnreadCount())
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`${basePath}/complaints?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search complaints & press Enter..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700/80 rounded-xl text-sm bg-gray-50/70 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Dropdown
            align="right"
            className="w-[24rem]"
            trigger={
              <button
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            }
          >
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
              <span className="text-xs text-gray-400">{unreadCount} unread</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                  <BellRing className="h-6 w-6 text-gray-300" />
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    compact
                    onRead={handleRead}
                    onDelete={() => undefined}
                  />
                ))
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
              <DropdownItem onClick={() => navigate(`${basePath}/notifications`)} className="text-blue-600 dark:text-blue-400 font-medium">
                View all notifications
              </DropdownItem>
            </div>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {user ? getInitials(user.name) : '?'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabels[role]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>
            }
          >
            <DropdownItem onClick={() => navigate(`${basePath}/profile`)}>Profile</DropdownItem>
            <DropdownItem onClick={() => navigate(`${basePath}/settings`)}>Settings</DropdownItem>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <div className="px-4 py-1.5">
              <p className="text-xs text-gray-400 mb-1">Theme</p>
              <div className="flex gap-1">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTheme(t)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={`${t} theme`}
                  >
                    {themeIcons[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <DropdownItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
