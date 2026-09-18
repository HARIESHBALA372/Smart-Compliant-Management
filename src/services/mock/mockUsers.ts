/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { User, PaginatedResponse } from '@/types'
import { Role } from '@/types'

const mockUsers: User[] = [
  { id: '1', email: 'customer@test.com', name: 'John Customer', phone: '+1234567890', role: Role.CUSTOMER, isActive: true, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z' },
  { id: '2', email: 'agent@test.com', name: 'Jane Agent', phone: '+1234567891', role: Role.AGENT, isActive: true, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' },
  { id: '3', email: 'manager@test.com', name: 'Bob Manager', phone: '+1234567892', role: Role.MANAGER, isActive: true, createdAt: '2026-01-05T00:00:00Z', updatedAt: '2026-01-05T00:00:00Z' },
  { id: '4', email: 'admin@test.com', name: 'Alice Admin', phone: '+1234567893', role: Role.ADMIN, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '5', email: 'agent2@test.com', name: 'Charlie Agent', phone: '+1234567894', role: Role.AGENT, isActive: true, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' },
  { id: '6', email: 'customer2@test.com', name: 'Diana Customer', phone: '+1234567895', role: Role.CUSTOMER, isActive: false, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
]

export function mockGetUsers(params?: { page?: number; limit?: number; role?: string; search?: string }): PaginatedResponse<User> {
  let filtered = [...mockUsers]
  if (params?.role) filtered = filtered.filter((u) => u.role === params.role)
  if (params?.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }
  const page = params?.page || 1
  const limit = params?.limit || 10
  const start = (page - 1) * limit
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  }
}

export function mockGetUserById(id: string): User {
  return mockUsers.find((u) => u.id === id) || mockUsers[0]
}

export function mockCreateUser(data: Record<string, unknown>): User {
  return {
    id: Math.random().toString(36).substring(2, 9),
    email: (data.email as string) || '',
    name: (data.name as string) || '',
    phone: data.phone as string,
    role: (data.role as Role) || Role.CUSTOMER,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function mockUpdateUser(id: string, data: Record<string, unknown>): User {
  const existing = mockUsers.find((u) => u.id === id) || mockUsers[0]
  return { ...existing, ...data, updatedAt: new Date().toISOString() } as User
}

export function mockDeleteUser(_id: string): void {
  return
}
