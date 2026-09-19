/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { Complaint, ComplaintFilter, PaginatedResponse, ComplaintEscalation } from '@/types'
import { complaintApi } from '@/services/complaintApi'

interface ComplaintState {
  complaints: Complaint[]
  currentComplaint: Complaint | null
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
}

const initialState: ComplaintState = {
  complaints: [],
  currentComplaint: null,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
}

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (filter: ComplaintFilter | undefined, { rejectWithValue }) => {
    try {
      const response: PaginatedResponse<Complaint> = await complaintApi.getAll(filter)
      return response
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch complaints')
    }
  },
)

export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await complaintApi.getById(id)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch complaint')
    }
  },
)

export const createComplaint = createAsyncThunk(
  'complaints/create',
  async (data: FormData, { rejectWithValue }) => {
    try {
      return await complaintApi.create(data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to create complaint')
    }
  },
)

export const updateComplaint = createAsyncThunk(
  'complaints/update',
  async ({ id, data }: { id: string; data: Partial<Complaint> }, { rejectWithValue }) => {
    try {
      return await complaintApi.update(id, data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to update complaint')
    }
  },
)

export const addComment = createAsyncThunk(
  'complaints/addComment',
  async ({ complaintId, content }: { complaintId: string; content: string }, { rejectWithValue }) => {
    try {
      return await complaintApi.addComment(complaintId, content)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
    }
  },
)

export const escalateComplaintAction = createAsyncThunk(
  'complaints/escalate',
  async ({ complaintId, reason, toLevel }: { complaintId: string; reason?: string; toLevel: string }, { rejectWithValue }) => {
    try {
      return await complaintApi.escalate(complaintId, { reason, toLevel })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to escalate complaint')
    }
  },
)

export const changePriorityAction = createAsyncThunk(
  'complaints/changePriority',
  async ({ complaintId, priority }: { complaintId: string; priority: string }, { rejectWithValue }) => {
    try {
      return await complaintApi.changePriority(complaintId, priority)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to change priority')
    }
  },
)

export const resolveComplaintAction = createAsyncThunk(
  'complaints/resolve',
  async ({ complaintId, comment }: { complaintId: string; comment?: string }, { rejectWithValue }) => {
    try {
      return await complaintApi.resolveComplaint(complaintId, comment)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to resolve complaint')
    }
  },
)

export const changeStatusAction = createAsyncThunk(
  'complaints/changeStatus',
  async ({ complaintId, status, comment }: { complaintId: string; status: string; comment?: string }, { rejectWithValue }) => {
    try {
      return await complaintApi.changeStatus(complaintId, status, comment)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to change status')
    }
  },
)

export const assignComplaintAction = createAsyncThunk(
  'complaints/assign',
  async (
    { complaintId, assignedTo, departmentId, reason }: { complaintId: string; assignedTo: string; departmentId?: string; reason?: string },
    { rejectWithValue },
  ) => {
    try {
      return await complaintApi.assign(complaintId, { assignedTo, departmentId, reason })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to assign complaint')
    }
  },
)

const complaintSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearCurrentComplaint: (state) => {
      state.currentComplaint = null
    },
    clearComplaintError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.isLoading = false
        state.complaints = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchComplaintById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentComplaint = action.payload
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createComplaint.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.isLoading = false
        state.complaints.unshift(action.payload)
      })
      .addCase(createComplaint.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(updateComplaint.fulfilled, (state, action) => {
        const index = state.complaints.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) state.complaints[index] = action.payload
        if (state.currentComplaint?.id === action.payload.id) {
          state.currentComplaint = action.payload
        }
      })
      .addCase(addComment.fulfilled, (state, action) => {
        if (state.currentComplaint) {
          state.currentComplaint.comments.push(action.payload)
        }
      })
      .addCase(escalateComplaintAction.fulfilled, (state, _action) => {
        if (state.currentComplaint) {
          state.currentComplaint.updatedAt = new Date().toISOString()
        }
      })
      .addCase(changePriorityAction.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.complaints.findIndex((c) => c.id === updated.id)
        if (index !== -1) state.complaints[index] = updated
        if (state.currentComplaint?.id === updated.id) {
          state.currentComplaint = updated
        }
      })
      .addCase(resolveComplaintAction.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.complaints.findIndex((c) => c.id === updated.id)
        if (index !== -1) state.complaints[index] = updated
        if (state.currentComplaint?.id === updated.id) {
          state.currentComplaint = updated
        }
      })
      .addCase(changeStatusAction.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.complaints.findIndex((c) => c.id === updated.id)
        if (index !== -1) state.complaints[index] = updated
        if (state.currentComplaint?.id === updated.id) {
          state.currentComplaint = updated
        }
      })
      .addCase(assignComplaintAction.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.complaints.findIndex((c) => c.id === updated.id)
        if (index !== -1) state.complaints[index] = updated
        if (state.currentComplaint?.id === updated.id) {
          state.currentComplaint = updated
        }
      })
  },
})

export const { clearCurrentComplaint, clearComplaintError } = complaintSlice.actions
export default complaintSlice.reducer
