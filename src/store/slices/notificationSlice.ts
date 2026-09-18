/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { Notification, NotificationPreferences } from '@/types'
import { notificationApi } from '@/services/notificationApi'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
  preferences: NotificationPreferences | null
  preferencesLoading: boolean
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  preferences: null,
  preferencesLoading: false,
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params: { unreadOnly?: boolean; type?: string; page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      return await notificationApi.getAll(params)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch notifications')
    }
  },
)

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnread', async (_, { rejectWithValue }) => {
  try {
    return await notificationApi.getUnreadCount()
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch unread count')
  }
})

export const fetchPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      return await notificationApi.getPreferences()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch preferences')
    }
  },
)

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (prefs: Partial<NotificationPreferences>, { rejectWithValue }) => {
    try {
      return await notificationApi.updatePreferences(prefs)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to update preferences')
    }
  },
)

export const markAsRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationApi.markAsRead(id)
      return id
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to mark notification')
    }
  },
)

export const markAsCompleted = createAsyncThunk(
  'notifications/markCompleted',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationApi.markAsCompleted(id)
      return id
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to mark notification')
    }
  },
)

export const markAllAsRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await notificationApi.markAllAsRead()
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message || 'Failed to mark all notifications')
  }
})

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationApi.delete(id)
      return id
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to delete notification')
    }
  },
)

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const incoming = action.payload as Notification
      if (!state.notifications.some((n) => n.id === incoming.id)) {
        state.notifications.unshift(incoming)
        state.unreadCount += 1
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false
        state.notifications = action.payload.notifications
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
        state.unreadCount = action.payload.unreadCount
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
      .addCase(fetchPreferences.pending, (state) => {
        state.preferencesLoading = true
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false
        state.preferences = action.payload
      })
      .addCase(fetchPreferences.rejected, (state) => {
        state.preferencesLoading = false
      })
      .addCase(updatePreferences.pending, (state) => {
        state.preferencesLoading = true
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false
        state.preferences = action.payload
      })
      .addCase(updatePreferences.rejected, (state) => {
        state.preferencesLoading = false
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notif = state.notifications.find((n) => n.id === action.payload)
        if (notif && !notif.isRead) {
          notif.isRead = true
          notif.readAt = new Date().toISOString()
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      .addCase(markAsCompleted.fulfilled, (state, action) => {
        const notif = state.notifications.find((n) => n.id === action.payload)
        if (notif) {
          notif.completed = true
          notif.completedAt = new Date().toISOString()
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => (n.isRead = true))
        state.unreadCount = 0
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notif = state.notifications.find((n) => n.id === action.payload)
        if (notif && !notif.isRead) state.unreadCount = Math.max(0, state.unreadCount - 1)
        state.notifications = state.notifications.filter((n) => n.id !== action.payload)
      })
  },
})

export const { addNotification } = notificationSlice.actions
export default notificationSlice.reducer