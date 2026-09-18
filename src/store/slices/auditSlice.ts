/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { AuditLog } from '@/types'
import { adminApi } from '@/services/adminApi'

interface AuditState {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
}

const initialState: AuditState = {
  logs: [],
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
}

export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchAll',
  async (params: { page?: number; search?: string } | undefined, { rejectWithValue }) => {
    try {
      return await adminApi.getAuditLogs(params)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch audit logs')
    }
  },
)

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false
        state.logs = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export default auditSlice.reducer