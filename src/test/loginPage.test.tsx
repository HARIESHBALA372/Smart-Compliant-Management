/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { LoginPage } from '@/pages/auth/LoginPage'
import { Role } from '@/types'

function renderLogin() {
  const store = configureStore({
    reducer: {
      auth: (state = { isAuthenticated: false, isLoading: false, user: null, tokens: null, error: null }, action) => state,
      complaints: (state = { complaints: [], currentComplaint: null, total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, action) => state,
      users: (state = { users: [], currentUser: null, total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, action) => state,
      notifications: (state = { notifications: [], unreadCount: 0, isLoading: false, error: null }, action) => state,
      analytics: (state = { data: null, isLoading: false, error: null }, action) => state,
      ui: (state = { sidebarOpen: false, sidebarCollapsed: false, theme: 'system' as const, toasts: [] }, action) => state,
      audit: (state = { logs: [], total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, action) => state,
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  )
}

vi.mock('@/services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

describe('LoginPage', () => {
  it('renders login form fields', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty form', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument()
  })
})