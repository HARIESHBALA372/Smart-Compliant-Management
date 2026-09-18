/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { User, LoginCredentials, RegisterData, AuthTokens } from '@/types'
import { Role } from '@/types'
import { authApi } from '@/services/authApi'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Backend roles (USER / STAFF / ADMIN) are mapped onto the richer frontend
// model (customer / agent / manager / admin). Managers are STAFF in the
// backend model, so a STAFF account is treated as a manager in the UI.
function normalizeUser(raw: Record<string, unknown>): User {
  const backendRole = String(raw.role ?? '').toUpperCase()
  let role = Role.CUSTOMER
  if (backendRole === 'ADMIN') role = Role.ADMIN
  else if (backendRole === 'STAFF' || backendRole === 'MANAGER' || backendRole === 'AGENT') role = Role.MANAGER
  return { ...(raw as unknown as User), role }
}

function normalizeAuthResponse(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>
  const payload = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>
  const rawUser = (payload.user && typeof payload.user === 'object' ? payload.user : payload) as Record<string, unknown>
  const token = String(payload.token ?? r.token ?? '')
  return {
    user: normalizeUser(rawUser),
    tokens: { accessToken: token } as AuthTokens,
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: {
        message?: string
        error?: { message?: string }[] | string
      }
    }
    message?: string
  }
  const issues = err.response?.data?.error
  if (Array.isArray(issues) && issues.length > 0 && issues[0]?.message) {
    return issues[0].message
  }
  if (typeof issues === 'string' && issues) {
    return issues
  }
  return err.response?.data?.message || err.message || fallback
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tokens: JSON.parse(localStorage.getItem('tokens') || 'null'),
  isAuthenticated: !!localStorage.getItem('tokens'),
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk('auth/login', async (credentials: LoginCredentials, { rejectWithValue }) => {
  try {
    const raw = await authApi.login(credentials)
    const response = normalizeAuthResponse(raw)
    localStorage.setItem('tokens', JSON.stringify(response.tokens))
    localStorage.setItem('user', JSON.stringify(response.user))
    return response
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Invalid email or password'))
  }
})

export const register = createAsyncThunk('auth/register', async (data: RegisterData, { rejectWithValue }) => {
  try {
    const raw = await authApi.register(data)
    const response = normalizeAuthResponse(raw)
    localStorage.setItem('tokens', JSON.stringify(response.tokens))
    localStorage.setItem('user', JSON.stringify(response.user))
    return response
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Registration failed'))
  }
})

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email: string, { rejectWithValue }) => {
  try {
    await authApi.forgotPassword(email)
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to send reset email'))
  }
})

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      await authApi.resetPassword(token, password)
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to reset password'))
    }
  },
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout()
  } finally {
    localStorage.removeItem('tokens')
    localStorage.removeItem('user')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action) => {
      state.user = action.payload
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.tokens = action.payload.tokens
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.tokens = action.payload.tokens
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.tokens = null
        state.isAuthenticated = false
      })
  },
})

export { normalizeUser }
export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer