/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Bell,
  User,
  Settings,
  LogOut,
  Users,
  BarChart3,
  FolderOpen,
  Clock,
  FileBarChart,
  Shield,
  ShieldCheck,
  Building2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleSidebarCollapsed, closeSidebar } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'
import { Role } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const customerNav: NavItem[] = [
  { label: 'Dashboard', path: '/customer/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'My Complaints', path: '/customer/complaints', icon: <FileText className="h-5 w-5" /> },
  { label: 'Submit Complaint', path: '/customer/complaints/new', icon: <PlusCircle className="h-5 w-5" /> },
  { label: 'Notifications', path: '/customer/notifications', icon: <Bell className="h-5 w-5" /> },
  { label: 'Profile', path: '/customer/profile', icon: <User className="h-5 w-5" /> },
  { label: 'Settings', path: '/customer/settings', icon: <Settings className="h-5 w-5" /> },
]

const agentNav: NavItem[] = [
  { label: 'Dashboard', path: '/agent/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'My Complaints', path: '/agent/complaints', icon: <FileText className="h-5 w-5" /> },
  { label: 'SLA Alerts', path: '/agent/sla-alerts', icon: <Clock className="h-5 w-5" /> },
  { label: 'Notifications', path: '/agent/notifications', icon: <Bell className="h-5 w-5" /> },
  { label: 'Profile', path: '/agent/profile', icon: <User className="h-5 w-5" /> },
  { label: 'Settings', path: '/agent/settings', icon: <Settings className="h-5 w-5" /> },
]

const managerNav: NavItem[] = [
  { label: 'Dashboard', path: '/manager/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Complaints', path: '/manager/complaints', icon: <FileText className="h-5 w-5" /> },
  { label: 'Agents', path: '/manager/agents', icon: <Users className="h-5 w-5" /> },
  { label: 'Categories', path: '/manager/categories', icon: <FolderOpen className="h-5 w-5" /> },
  { label: 'SLA Management', path: '/manager/sla', icon: <Clock className="h-5 w-5" /> },
  { label: 'Analytics', path: '/manager/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Reports', path: '/manager/reports', icon: <FileBarChart className="h-5 w-5" /> },
  { label: 'Notifications', path: '/manager/notifications', icon: <Bell className="h-5 w-5" /> },
  { label: 'Profile', path: '/manager/profile', icon: <User className="h-5 w-5" /> },
  { label: 'Settings', path: '/manager/settings', icon: <Settings className="h-5 w-5" /> },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Users', path: '/admin/users', icon: <Users className="h-5 w-5" /> },
  { label: 'Complaints', path: '/admin/complaints', icon: <FileText className="h-5 w-5" /> },
  { label: 'Categories', path: '/admin/categories', icon: <FolderOpen className="h-5 w-5" /> },
  { label: 'Departments', path: '/admin/departments', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Agents', path: '/admin/agents', icon: <Users className="h-5 w-5" /> },
  { label: 'Escalations', path: '/admin/escalations', icon: <AlertTriangle className="h-5 w-5" /> },
  { label: 'SLA Management', path: '/admin/sla', icon: <Clock className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Reports', path: '/admin/reports', icon: <FileBarChart className="h-5 w-5" /> },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: <Shield className="h-5 w-5" /> },
  { label: 'Settings', path: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  { label: 'Notifications', path: '/admin/notifications', icon: <Bell className="h-5 w-5" /> },
]

const navMap: Record<string, NavItem[]> = {
  [Role.CUSTOMER]: customerNav,
  [Role.AGENT]: agentNav,
  [Role.MANAGER]: managerNav,
  [Role.ADMIN]: adminNav,
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)

  const navItems = navMap[user?.role || Role.CUSTOMER]
  const rolePath = user?.role || Role.CUSTOMER

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => dispatch(closeSidebar())} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800/80 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64',
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-800/80 min-h-[65px]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white leading-tight">SmartComplaint</span>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Enterprise Portal</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs" title="SmartComplaint">
              <ShieldCheck className="h-5 w-5" />
            </div>
          )}
          <button
            onClick={() => dispatch(toggleSidebarCollapsed())}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => dispatch(closeSidebar())}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => dispatch(closeSidebar())}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200',
                  sidebarCollapsed && 'justify-center px-2',
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-200/80 dark:border-gray-800/80">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors w-full',
              sidebarCollapsed && 'justify-center px-2',
            )}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
