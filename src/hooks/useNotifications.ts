/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchNotifications } from '@/store/slices/notificationSlice'

export function useNotifications() {
  const dispatch = useAppDispatch()
  const { notifications, unreadCount, isLoading } = useAppSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  return { notifications, unreadCount, isLoading }
}
