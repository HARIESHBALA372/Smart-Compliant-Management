/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { Role } from '@/types'

interface RoleRouteProps {
  roles: Role[]
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const user = useAppSelector((state) => state.auth.user)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
