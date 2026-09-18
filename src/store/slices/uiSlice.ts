/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice } from '@reduxjs/toolkit'

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  toasts: Toast[]
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

const getStoredTheme = (): 'light' | 'dark' | 'system' => {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

const initialState: UIState = {
  sidebarOpen: false,
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  theme: getStoredTheme(),
  toasts: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    closeSidebar: (state) => {
      state.sidebarOpen = false
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
      localStorage.setItem('sidebarCollapsed', String(state.sidebarCollapsed))
    },
    setTheme: (state, action) => {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
    addToast: (state, action) => {
      state.toasts.push({
        id: Math.random().toString(36).substring(2, 9),
        ...action.payload,
      })
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { toggleSidebar, closeSidebar, toggleSidebarCollapsed, setTheme, addToast, removeToast } =
  uiSlice.actions
export default uiSlice.reducer
