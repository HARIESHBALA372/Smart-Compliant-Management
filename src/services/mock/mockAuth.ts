/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { LoginCredentials, RegisterData, User } from '@/types'
import { Role } from '@/types'

const mockUsers: Record<string, { password: string; user: User }> = {
  'customer@test.com': {
    password: 'Password123!',
    user: { id: '1', email: 'customer@test.com', name: 'John Customer', phone: '+1234567890', role: Role.CUSTOMER, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  },
  'agent@test.com': {
    password: 'Password123!',
    user: { id: '2', email: 'agent@test.com', name: 'Jane Agent', phone: '+1234567891', role: Role.AGENT, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  },
  'manager@test.com': {
    password: 'Password123!',
    user: { id: '3', email: 'manager@test.com', name: 'Bob Manager', phone: '+1234567892', role: Role.MANAGER, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  },
  'admin@test.com': {
    password: 'Password123!',
    user: { id: '4', email: 'admin@test.com', name: 'Alice Admin', phone: '+1234567893', role: Role.ADMIN, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  },
}

function generateTokens() {
  return {
    accessToken: 'mock_access_' + Math.random().toString(36).substring(2),
  }
}

export async function mockLogin(credentials: LoginCredentials) {
  await new Promise((r) => setTimeout(r, 800))
  const entry = mockUsers[credentials.email]
  if (!entry || entry.password !== credentials.password) {
    throw { response: { data: { message: 'Invalid email or password' } } }
  }
  return { user: entry.user, token: generateTokens().accessToken }
}

export async function mockRegister(data: RegisterData) {
  await new Promise((r) => setTimeout(r, 800))
  const user: User = {
    id: Math.random().toString(36).substring(2, 9),
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: Role.CUSTOMER,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return { user, token: generateTokens().accessToken }
}

export async function mockGetProfile(): Promise<User> {
  const stored = localStorage.getItem('user')
  if (stored) return JSON.parse(stored)
  return mockUsers['customer@test.com'].user
}

export async function mockUpdateProfile(data: Partial<{ name: string; phone: string }>) {
  const stored = localStorage.getItem('user')
  const user: User = stored ? JSON.parse(stored) : mockUsers['customer@test.com'].user
  const updated = { ...user, ...data, updatedAt: new Date().toISOString() }
  localStorage.setItem('user', JSON.stringify(updated))
  return updated
}
