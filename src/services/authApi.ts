/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import type { LoginCredentials, RegisterData } from '@/types'
import { isMockMode } from './mock/mockData'

export const authApi = {
  async login(credentials: LoginCredentials) {
    if (isMockMode()) {
      const { mockLogin } = await import('./mock/mockAuth')
      return mockLogin(credentials)
    }
    const response = await api.post('/auth/login', credentials)
    return response.data?.data ?? response.data
  },

  async register(data: RegisterData) {
    if (isMockMode()) {
      const { mockRegister } = await import('./mock/mockAuth')
      return mockRegister(data)
    }
    const response = await api.post('/auth/register', data)
    return response.data?.data ?? response.data
  },

  async forgotPassword(email: string) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 1000))
      return { message: 'Reset link sent' }
    }
    const response = await api.post('/auth/forgot-password', { email })
    return response.data?.data ?? response.data
  },

  async resetPassword(token: string, password: string) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 1000))
      return { message: 'Password reset successful' }
    }
    const response = await api.post('/auth/reset-password', { token, password })
    return response.data?.data ?? response.data
  },

  async logout() {
    if (isMockMode()) return
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
  },

  async getProfile() {
    if (isMockMode()) {
      const { mockGetProfile } = await import('./mock/mockAuth')
      return mockGetProfile()
    }
    const response = await api.get('/auth/me')
    return response.data?.data ?? response.data
  },

  async updateProfile(data: Partial<{ name: string; phone: string; avatar: string }>) {
    if (isMockMode()) {
      const { mockUpdateProfile } = await import('./mock/mockAuth')
      return mockUpdateProfile(data)
    }
    const response = await api.put('/auth/profile', data)
    return response.data?.data ?? response.data
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 1000))
      return { message: 'Password changed' }
    }
    const response = await api.put('/auth/change-password', data)
    return response.data?.data ?? response.data
  },
}
