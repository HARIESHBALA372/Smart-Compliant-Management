/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import type { ComplaintFilter, Complaint, PaginatedResponse, ComplaintEscalation, AgentRecommendation, Comment } from '@/types'
import { ComplaintPriority, ComplaintStatus } from '@/types'
import { isMockMode } from './mock/mockData'
import { mockGetComplaintById, mockCreateComplaint, mockUpdateComplaint, mockAddComment, mockGetComplaintStats, mockEscalateComplaint, mockChangePriority, mockResolveComplaint, mockChangeStatus, mockRecommendAgents } from './mock/mockComplaints'
import { mockGetComplaints } from './mock/mockComplaints'

const TO_API_PRIORITY: Record<string, string> = {
  [ComplaintPriority.LOW]: 'LOW',
  [ComplaintPriority.MEDIUM]: 'MEDIUM',
  [ComplaintPriority.HIGH]: 'HIGH',
  [ComplaintPriority.CRITICAL]: 'CRITICAL',
}

const FROM_API_PRIORITY: Record<string, ComplaintPriority> = {
  LOW: ComplaintPriority.LOW,
  MEDIUM: ComplaintPriority.MEDIUM,
  HIGH: ComplaintPriority.HIGH,
  CRITICAL: ComplaintPriority.CRITICAL,
}

const TO_API_STATUS: Record<string, string> = {
  submitted: 'SUBMITTED',
  under_review: 'UNDER_REVIEW',
  in_progress: 'IN_PROGRESS',
  pending_customer_response: 'WAITING_FOR_USER',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
  rejected: 'REJECTED',
}

const FROM_API_STATUS: Record<string, ComplaintStatus> = {
  SUBMITTED: ComplaintStatus.SUBMITTED,
  UNDER_REVIEW: ComplaintStatus.UNDER_REVIEW,
  ASSIGNED: ComplaintStatus.UNDER_REVIEW,
  IN_PROGRESS: ComplaintStatus.IN_PROGRESS,
  WAITING_FOR_USER: ComplaintStatus.PENDING_CUSTOMER_RESPONSE,
  RESOLVED: ComplaintStatus.RESOLVED,
  CLOSED: ComplaintStatus.CLOSED,
  REJECTED: ComplaintStatus.REJECTED,
}

function normalizeComplaint(raw: Record<string, unknown>): Complaint {
  return {
    id: String(raw.id),
    complaintId: String(raw.complaintNumber ?? raw.complaintId ?? raw.id),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    category: String(raw.category ?? ''),
    subcategory: raw.subcategory ? String(raw.subcategory) : undefined,
    priority: FROM_API_PRIORITY[String(raw.priority)] ?? ComplaintPriority.MEDIUM,
    status: FROM_API_STATUS[String(raw.status)] ?? ComplaintStatus.SUBMITTED,
    customerId: String(raw.userId ?? raw.customerId ?? ''),
    customer: raw.user as Complaint['customer'],
    assignedAgentId: raw.assignedToId ? String(raw.assignedToId) : raw.assignedAgentId as string | undefined,
    assignedAgent: raw.assignedTo as Complaint['assignedAgent'],
    attachments: (raw.attachments ?? []) as Complaint['attachments'],
    comments: (raw.comments ?? []) as Complaint['comments'],
    sentiment: raw.sentiment as string | undefined,
    sentimentConfidence: raw.sentimentConfidence as number | undefined,
    aiCategory: raw.aiCategory as string | undefined,
    aiCategoryConfidence: raw.aiCategoryConfidence as number | undefined,
    aiPriority: raw.aiPriority as string | undefined,
    aiPriorityConfidence: raw.aiPriorityConfidence as number | undefined,
    keywords: raw.keywords as string[] | undefined,
    slaDeadline: raw.slaDeadline ? String(raw.slaDeadline) : new Date().toISOString(),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    resolvedAt: raw.resolvedAt ? String(raw.resolvedAt) : undefined,
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
  } as Complaint
}

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

export const complaintApi = {
  async getAll(filter?: ComplaintFilter): Promise<PaginatedResponse<Complaint>> {
    if (isMockMode()) {
      return mockGetComplaints(filter)
    }
    const env = (await api.get('/complaints', { params: filter })).data
    return {
      data: (env.data ?? []).map(normalizeComplaint),
      total: env.pagination?.total ?? (env.data ?? []).length,
      page: env.pagination?.page ?? filter?.page ?? 1,
      limit: env.pagination?.limit ?? filter?.limit ?? 10,
      totalPages: env.pagination?.totalPages ?? 1,
    }
  },

  async getById(id: string): Promise<Complaint> {
    if (isMockMode()) {
      return mockGetComplaintById(id)
    }
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.get(`/complaints/${id}`)))
  },

  async create(data: FormData): Promise<Complaint> {
    if (isMockMode()) {
      return mockCreateComplaint(data)
    }
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.post('/complaints', data)))
  },

  async update(id: string, data: Record<string, unknown>): Promise<Complaint> {
    if (isMockMode()) {
      return mockUpdateComplaint(id, data)
    }
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.put(`/complaints/${id}`, data)))
  },

  async addComment(complaintId: string, content: string): Promise<Comment> {
    if (isMockMode()) {
      return mockAddComment(complaintId, content)
    }
    return unwrap<Comment>(await api.post(`/complaints/${complaintId}/comments`, { content }))
  },

  async getStats() {
    if (isMockMode()) {
      return mockGetComplaintStats()
    }
    return unwrap<Record<string, unknown>>(await api.get('/complaints/stats'))
  },

  // ── New actions ────────────────────────────────────────────────────

  async escalate(complaintId: string, payload: { reason?: string; toLevel: string }): Promise<ComplaintEscalation> {
    if (isMockMode()) {
      return mockEscalateComplaint(complaintId, payload)
    }
    return unwrap<ComplaintEscalation>(await api.post(`/complaints/${complaintId}/escalate`, {
      reason: payload.reason,
      toLevel: payload.toLevel,
    }))
  },

  async changePriority(complaintId: string, newPriority: string): Promise<Complaint> {
    if (isMockMode()) {
      return mockChangePriority(complaintId, newPriority)
    }
    const apiPriority = TO_API_PRIORITY[newPriority] ?? newPriority.toUpperCase()
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.put(`/complaints/${complaintId}/priority`, { priority: apiPriority })))
  },

  async resolveComplaint(complaintId: string, comment?: string): Promise<Complaint> {
    if (isMockMode()) {
      return mockResolveComplaint(complaintId, comment)
    }
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.post(`/complaints/${complaintId}/resolve`, { comment })))
  },

  async changeStatus(complaintId: string, newStatus: string, comment?: string): Promise<Complaint> {
    if (isMockMode()) {
      return mockChangeStatus(complaintId, newStatus, comment)
    }
    const apiStatus = TO_API_STATUS[newStatus] ?? newStatus.toUpperCase()
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.post(`/complaints/${complaintId}/status`, { status: apiStatus, comment })))
  },

  async recommendAgents(complaintId: string): Promise<AgentRecommendation[]> {
    if (isMockMode()) {
      return mockRecommendAgents(complaintId)
    }
    return unwrap<AgentRecommendation[]>(await api.get(`/complaints/${complaintId}/recommend-agents`))
  },

  async assign(complaintId: string, payload: { assignedTo: string; departmentId?: string; reason?: string }): Promise<Complaint> {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500))
      return mockGetComplaintById(complaintId)
    }
    return normalizeComplaint(unwrap<Record<string, unknown>>(await api.post(`/complaints/${complaintId}/assign`, payload)))
  },
}
