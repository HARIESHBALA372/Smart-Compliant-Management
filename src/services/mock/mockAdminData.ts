import type { Department, AgentWithWorkload, AgentRecommendation, ComplaintEscalation, PaginatedResponse } from '@/types'
import { EscalationLevel } from '@/types'

const mockDepartments: Department[] = [
  { id: '1', name: 'Customer Service', description: 'Handles general customer inquiries', contactEmail: 'support@example.com', contactPhone: '+1-555-0101', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'Technical Support', description: 'Handles technical issues and bugs', contactEmail: 'tech@example.com', contactPhone: '+1-555-0102', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'Billing', description: 'Handles billing and payment issues', contactEmail: 'billing@example.com', contactPhone: '+1-555-0103', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '4', name: 'Logistics', description: 'Handles delivery and shipping issues', contactEmail: 'logistics@example.com', contactPhone: '+1-555-0104', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]

const mockAgents: AgentWithWorkload[] = [
  { id: '2', name: 'Agent Smith', email: 'agent@example.com', phone: '+1-555-1002', departmentId: '1', department: { id: '1', name: 'Customer Service' }, assigned: 5, open: 3, inProgress: 2, waiting: 1, resolved: 12, critical: 0, overdue: 0, avgResolutionHours: 18.5, slaCompliance: 95 },
  { id: '5', name: 'Agent Johnson', email: 'agent2@example.com', phone: '+1-555-1005', departmentId: '2', department: { id: '2', name: 'Technical Support' }, assigned: 8, open: 4, inProgress: 3, waiting: 2, resolved: 20, critical: 1, overdue: 1, avgResolutionHours: 24.3, slaCompliance: 88 },
  { id: '6', name: 'Agent Lee', email: 'agent3@example.com', phone: '+1-555-1006', departmentId: '3', department: { id: '3', name: 'Billing' }, assigned: 3, open: 1, inProgress: 1, waiting: 0, resolved: 15, critical: 0, overdue: 0, avgResolutionHours: 12.0, slaCompliance: 100 },
]

const mockEscalations: ComplaintEscalation[] = [
  { id: '1', complaintId: '1', complaintNumber: 'CMP-2026-00001', escalatedBy: '2', escalator: { id: '2', name: 'Agent Smith' }, escalatedTo: '4', escalatee: { id: '4', name: 'Admin User' }, fromLevel: EscalationLevel.LEVEL_1, toLevel: EscalationLevel.LEVEL_2, reason: 'SLA deadline approaching', isResolved: false, createdAt: '2026-09-08T12:00:00Z' },
]

export function mockGetDepartments(): Department[] {
  return [...mockDepartments]
}

export function mockCreateDepartment(data: { name: string; description?: string; contactEmail?: string; contactPhone?: string }): Department {
  const dept: Department = {
    id: String(mockDepartments.length + 1),
    name: data.name,
    description: data.description,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mockDepartments.push(dept)
  return dept
}

export function mockUpdateDepartment(id: string, data: Partial<Department>): Department | undefined {
  const idx = mockDepartments.findIndex((d) => d.id === id)
  if (idx === -1) return undefined
  mockDepartments[idx] = { ...mockDepartments[idx], ...data, updatedAt: new Date().toISOString() }
  return mockDepartments[idx]
}

export function mockDeleteDepartment(id: string): boolean {
  const idx = mockDepartments.findIndex((d) => d.id === id)
  if (idx === -1) return false
  mockDepartments.splice(idx, 1)
  return true
}

export function mockGetAgents(_params?: { page?: number; limit?: number; search?: string; departmentId?: string }): PaginatedResponse<AgentWithWorkload> {
  const data = [...mockAgents]
  return { data, total: data.length, page: 1, limit: 20, totalPages: 1 }
}

export function mockGetEscalations(_params?: { page?: number; limit?: number; status?: string }): PaginatedResponse<ComplaintEscalation> {
  return { data: [...mockEscalations], total: mockEscalations.length, page: 1, limit: 20, totalPages: 1 }
}

export function mockRecommendAgents(_complaintId: string): AgentRecommendation[] {
  return [
    { agentId: '2', name: 'Agent Smith', email: 'agent@example.com', departmentId: '1', departmentName: 'Customer Service', openComplaints: 3, resolvedCount: 12, score: 42.5, reason: 'currently assigned, same department, available' },
    { agentId: '6', name: 'Agent Lee', email: 'agent3@example.com', departmentId: '3', departmentName: 'Billing', openComplaints: 1, resolvedCount: 15, score: 38.0, reason: 'available, lighter current load' },
    { agentId: '5', name: 'Agent Johnson', email: 'agent2@example.com', departmentId: '2', departmentName: 'Technical Support', openComplaints: 4, resolvedCount: 20, score: 32.0, reason: 'same department, proven track record' },
  ]
}
