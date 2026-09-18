/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { Role } from '@/types'

function makeStore(isAuthenticated: boolean, userRole?: Role) {
  return configureStore({
    reducer: {
      auth: (
        state = {
          isAuthenticated,
          isLoading: false,
          user: userRole ? { id: '1', role: userRole } : null,
          tokens: null,
          error: null,
        },
        _action,
      ) => state,
      complaints: (state = { complaints: [], currentComplaint: null, total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, _action) => state,
      users: (state = { users: [], currentUser: null, total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, _action) => state,
      notifications: (state = { notifications: [], unreadCount: 0, isLoading: false, error: null }, _action) => state,
      analytics: (state = { data: null, isLoading: false, error: null }, _action) => state,
      ui: (state = { sidebarOpen: false, sidebarCollapsed: false, theme: 'system' as const, toasts: [] }, _action) => state,
      audit: (state = { logs: [], total: 0, page: 1, totalPages: 1, isLoading: false, error: null }, _action) => state,
    },
  })
}

function TestLogin() {
  return <div>Login Page</div>
}

function TestDashboard() {
  return <div>Protected Content</div>
}

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    const store = makeStore(false)
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<TestLogin />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<TestDashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders protected content when authenticated', () => {
    const store = makeStore(true, Role.CUSTOMER)
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<TestLogin />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<TestDashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

describe('RoleRoute', () => {
  it('renders admin content for admin role', () => {
    const store = makeStore(true, Role.ADMIN)
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
            <Route element={<RoleRoute roles={[Role.ADMIN]} />}>
              <Route path="/admin" element={<TestDashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects customer away from admin routes', () => {
    const store = makeStore(true, Role.CUSTOMER)
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
            <Route element={<RoleRoute roles={[Role.ADMIN]} />}>
              <Route path="/admin" element={<TestDashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })
})