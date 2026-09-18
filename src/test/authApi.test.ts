/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect, vi } from 'vitest'
import { authApi } from '@/services/authApi'

vi.mock('@/services/mock/mockAuth', () => ({
  mockLogin: vi.fn().mockResolvedValue({
    user: { id: '1', name: 'Test', email: 'a@b.com', role: 'customer' },
    token: 'x',
  }),
  mockRegister: vi.fn().mockResolvedValue({
    user: { id: '2', name: 'New', email: 'n@b.com', role: 'customer' },
    token: 'x',
  }),
  mockGetProfile: vi.fn().mockResolvedValue({ id: '1', name: 'Test', email: 'a@b.com', role: 'customer' }),
  mockUpdateProfile: vi.fn().mockResolvedValue({ id: '1', name: 'Updated', email: 'a@b.com', role: 'customer' }),
}))

describe('authApi', () => {
  it('login returns user and token', async () => {
    const result = await authApi.login({ email: 'a@b.com', password: 'password' })
    expect(result.user).toBeDefined()
    expect(result.token).toBeDefined()
  })

  it('register creates user', async () => {
    const result = await authApi.register({ name: 'New', email: 'n@b.com', password: 'Password123!' })
    expect(result.user.name).toBe('New')
  })
})