/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import type { User, PaginatedResponse } from '@/types'
import { Role } from '@/types'
import { isMockMode } from './mock/mockData'

function normalizeUser(raw: Record<string, unknown>): User {
  const rawRole = String(raw.role ?? '').toUpperCase()
  let role = Role.CUSTOMER
  if (rawRole === 'ADMIN') role = Role.ADMIN
  else if (rawRole === 'STAFF' || rawRole === 'MANAGER') role = Role.MANAGER
  else if (rawRole === 'AGENT') role = Role.AGENT
  else if (rawRole === 'USER' || rawRole === 'CUSTOMER') role = Role.CUSTOMER

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    phone: raw.phone ? String(raw.phone) : undefined,
    role,
    isActive: Boolean(raw.isActive ?? true),
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  }
}

function mapRoleToBackend(role?: string): string | undefined {
  if (!role) return undefined
  const r = role.toLowerCase()
  if (r === 'customer') return 'USER'
  if (r === 'agent' || r === 'manager') return 'STAFF'
  if (r === 'admin') return 'ADMIN'
  return role
}

export const userApi = {
  async getAll(params?: { page?: number; limit?: number; role?: string; search?: string }): Promise<PaginatedResponse<User>> {
    if (isMockMode()) {
      const { mockGetUsers } = await import('./mock/mockUsers')
      return mockGetUsers(params)
    }
    const queryParams: Record<string, unknown> = { ...params }
    if (params?.role) {
      queryParams.role = mapRoleToBackend(params.role)
    }
    const response = await api.get('/admin/users', { params: queryParams })
    const resData = response.data
    const list = Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData) ? resData : [])
    const pagination = resData?.pagination
    return {
      data: list.map((u: Record<string, unknown>) => normalizeUser(u)),
      total: pagination?.total ?? list.length,
      page: pagination?.page ?? params?.page ?? 1,
      limit: pagination?.limit ?? params?.limit ?? 10,
      totalPages: pagination?.totalPages ?? Math.max(1, Math.ceil((pagination?.total ?? list.length) / (params?.limit ?? 10))),
    }
  },

  async getById(id: string): Promise<User> {
    if (isMockMode()) {
      const { mockGetUserById } = await import('./mock/mockUsers')
      return mockGetUserById(id)
    }
    const response = await api.get(`/admin/users/${id}`)
    const raw = response.data?.data ?? response.data
    return normalizeUser(raw)
  },

  async create(data: Record<string, unknown>): Promise<User> {
    if (isMockMode()) {
      const { mockCreateUser } = await import('./mock/mockUsers')
      return mockCreateUser(data)
    }
    const payload = { ...data }
    if (payload.role && typeof payload.role === 'string') {
      payload.role = mapRoleToBackend(payload.role)
    }
    const response = await api.post('/admin/users', payload)
    const raw = response.data?.data ?? response.data
    return normalizeUser(raw)
  },

  async update(id: string, data: Record<string, unknown>): Promise<User> {
    if (isMockMode()) {
      const { mockUpdateUser } = await import('./mock/mockUsers')
      return mockUpdateUser(id, data)
    }
    const payload = { ...data }
    if (payload.role && typeof payload.role === 'string') {
      payload.role = mapRoleToBackend(payload.role)
    }
    const response = await api.put(`/admin/users/${id}`, payload)
    const raw = response.data?.data ?? response.data
    return normalizeUser(raw)
  },

  async delete(id: string): Promise<void> {
    if (isMockMode()) {
      const { mockDeleteUser } = await import('./mock/mockUsers')
      mockDeleteUser(id)
      return
    }
    await api.delete(`/admin/users/${id}`)
  },
}
