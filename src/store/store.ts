/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/slices/authSlice'
import complaintReducer from '@/store/slices/complaintSlice'
import userReducer from '@/store/slices/userSlice'
import notificationReducer from '@/store/slices/notificationSlice'
import analyticsReducer from '@/store/slices/analyticsSlice'
import uiReducer from '@/store/slices/uiSlice'
import auditReducer from '@/store/slices/auditSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    complaints: complaintReducer,
    users: userReducer,
    notifications: notificationReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
    audit: auditReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch