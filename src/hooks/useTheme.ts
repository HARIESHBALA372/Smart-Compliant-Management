/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setTheme } from '@/store/slices/uiSlice'

export function useTheme() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'system'
    applyTheme(theme as 'light' | 'dark' | 'system')
  }, [])

  function applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  function changeTheme(theme: 'light' | 'dark' | 'system') {
    dispatch(setTheme(theme))
    applyTheme(theme)
  }

  return { changeTheme }
}
