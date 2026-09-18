/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { User, PaginatedResponse } from '@/types'
import { userApi } from '@/services/userApi'

interface UserState {
  users: User[]
  currentUser: User | null
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params: { page?: number; limit?: number; role?: string; search?: string } | undefined, {
    rejectWithValue,
  }) => {
    try {
      const response: PaginatedResponse<User> = await userApi.getAll(params)
      return response
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users')
    }
  },
)

export const createUser = createAsyncThunk(
  'users/create',
  async (data: Partial<User> & { password?: string }, { rejectWithValue }) => {
    try {
      return await userApi.create(data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to create user')
    }
  },
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      return await userApi.update(id, data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || 'Failed to update user')
    }
  },
)

export const deleteUser = createAsyncThunk('users/delete', async (id: string, { rejectWithValue }) => {
  try {
    await userApi.delete(id)
    return id
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message || 'Failed to delete user')
  }
})

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.users = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload)
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id)
        if (index !== -1) state.users[index] = action.payload
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload)
      })
  },
})

export const { clearUserError } = userSlice.actions
export default userSlice.reducer
