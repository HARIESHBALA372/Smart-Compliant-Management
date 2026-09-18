/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import type { Department, AgentWithWorkload, ComplaintEscalation, Category, SLAConfig, AuditLog, PaginatedResponse } from '@/types'
import { isMockMode, mockGetCategories, mockGetSLAConfig, mockGetAuditLogs } from './mock/mockData'
import { mockGetDepartments, mockCreateDepartment, mockUpdateDepartment, mockDeleteDepartment, mockGetAgents, mockGetEscalations } from './mock/mockAdminData'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

function unwrapPaginated<T>(response: { data: { data: T[]; pagination?: { total: number; page: number; limit: number; totalPages: number } } }): PaginatedResponse<T> {
  const env = response.data
  return {
    data: env.data,
    total: env.pagination?.total ?? env.data.length,
    page: env.pagination?.page ?? 1,
    limit: env.pagination?.limit ?? 20,
    totalPages: env.pagination?.totalPages ?? 1,
  }
}

export const adminApi = {
  async getCategories(): Promise<Category[]> {
    if (isMockMode()) {
      return mockGetCategories()
    }
    return unwrap<Category[]>(await api.get('/admin/categories'))
  },

  async createCategory(data: Record<string, unknown>): Promise<Category> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return { id: Math.random().toString(36).substring(2, 9), ...data, isActive: true, subcategories: [] } as unknown as Category
    }
    return unwrap<Category>(await api.post('/admin/categories', data))
  },

  async updateCategory(id: string, data: Record<string, unknown>): Promise<Category> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return { id, ...data } as Category
    }
    return unwrap<Category>(await api.put(`/admin/categories/${id}`, data))
  },

  async deleteCategory(id: string) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return
    }
    await api.delete(`/admin/categories/${id}`)
  },

  async getSLAConfig(): Promise<SLAConfig[]> {
    if (isMockMode()) {
      return mockGetSLAConfig()
    }
    return unwrap<SLAConfig[]>(await api.get('/admin/sla'))
  },

  async updateSLAConfig(data: { id: string; priority: string; responseHours: number; resolutionHours: number }[]): Promise<SLAConfig[]> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return data as SLAConfig[]
    }
    return unwrap<SLAConfig[]>(await api.put('/admin/sla', data))
  },

  async getAuditLogs(params?: { page?: number; limit?: number; search?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<AuditLog>> {
    if (isMockMode()) {
      return mockGetAuditLogs(params)
    }
    return unwrapPaginated<AuditLog>(await api.get('/admin/audit-logs', { params }))
  },

  // ── Departments ────────────────────────────────────────────────────

  async getDepartments(): Promise<Department[]> {
    if (isMockMode()) {
      return mockGetDepartments()
    }
    return unwrap<Department[]>(await api.get('/admin/departments'))
  },

  async createDepartment(data: { name: string; description?: string; contactEmail?: string; contactPhone?: string }): Promise<Department> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return mockCreateDepartment(data)
    }
    return unwrap<Department>(await api.post('/admin/departments', data))
  },

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return mockUpdateDepartment(id, data) as Department
    }
    return unwrap<Department>(await api.put(`/admin/departments/${id}`, data))
  },

  async deleteDepartment(id: string) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      mockDeleteDepartment(id)
      return
    }
    await api.delete(`/admin/departments/${id}`)
  },

  // ── Agents ─────────────────────────────────────────────────────────

  async getAgents(params?: { page?: number; limit?: number; search?: string; departmentId?: string }): Promise<PaginatedResponse<AgentWithWorkload>> {
    if (isMockMode()) {
      return mockGetAgents(params)
    }
    return unwrapPaginated<AgentWithWorkload>(await api.get('/admin/agents', { params }))
  },

  // ── Escalations ────────────────────────────────────────────────────

  async getEscalations(params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<ComplaintEscalation>> {
    if (isMockMode()) {
      return mockGetEscalations(params)
    }
    return unwrapPaginated<ComplaintEscalation>(await api.get('/admin/escalations', { params }))
  },
}
