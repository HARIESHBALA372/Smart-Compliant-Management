/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { AnalyticsData } from '@/types'
import { analyticsApi } from '@/services/analyticsApi'

interface AnalyticsState {
  data: AnalyticsData | null
  isLoading: boolean
  error: string | null
  staleSignal: number
  lastUpdatedAt: number | null
}

const initialState: AnalyticsState = {
  data: null,
  isLoading: false,
  error: null,
  staleSignal: 0,
  lastUpdatedAt: null,
}

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetch',
  async (params: { startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
    try {
      return await analyticsApi.getAnalytics(params)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch analytics')
    }
  },
)

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
reducers: {
    clearAnalyticsError: (state) => {
      state.error = null
    },
    analyticsStale: (state) => {
      state.staleSignal += 1
      state.lastUpdatedAt = Date.now()
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoading = false
        state.data = action.payload
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearAnalyticsError, analyticsStale } = analyticsSlice.actions
export default analyticsSlice.reducer
