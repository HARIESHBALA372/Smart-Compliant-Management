/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useCallback } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { addToast } from '@/store/slices/uiSlice'

interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export function useToast() {
  const dispatch = useAppDispatch()

  const showToast = useCallback(
    ({ type = 'info', message, duration = 5000 }: ToastOptions) => {
      dispatch(addToast({ type, message, duration }))
    },
    [dispatch],
  )

  return { showToast }
}
