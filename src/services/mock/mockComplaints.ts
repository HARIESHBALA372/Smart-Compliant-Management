/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { Complaint, ComplaintFilter, PaginatedResponse, ComplaintEscalation, AgentRecommendation } from '@/types'
import { ComplaintStatus, ComplaintPriority, Role, EscalationLevel } from '@/types'
import { mockRecommendAgents } from './mockAdminData'

const baseComplaints: Complaint[] = [
  { id: '1', complaintId: 'CMP-2026-00001', title: 'Overcharged on monthly bill', description: 'I was charged twice for my subscription this month. Please investigate and refund the extra amount.', category: 'Billing', priority: ComplaintPriority.HIGH, status: ComplaintStatus.IN_PROGRESS, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.88, aiCategory: 'Billing', aiCategoryConfidence: 0.94, aiPriority: 'high', aiPriorityConfidence: 0.91, keywords: ['refund', 'payment', 'overcharge'], slaDeadline: '2026-09-09T10:00:00Z', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-08T09:00:00Z' },
  { id: '2', complaintId: 'CMP-2026-00002', title: 'Cannot access my account', description: 'I am unable to log in to my account since yesterday. I have tried resetting my password but did not receive the email.', category: 'Account', priority: ComplaintPriority.CRITICAL, status: ComplaintStatus.UNDER_REVIEW, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'frustrated', sentimentConfidence: 0.82, aiCategory: 'Account', aiCategoryConfidence: 0.90, aiPriority: 'critical', aiPriorityConfidence: 0.87, keywords: ['login', 'password', 'access'], slaDeadline: '2026-09-08T18:00:00Z', createdAt: '2026-09-07T14:00:00Z', updatedAt: '2026-09-08T08:00:00Z' },
  { id: '3', complaintId: 'CMP-2026-00003', title: 'Delivery is late by 5 days', description: 'My order was supposed to arrive 5 days ago but I still haven\'t received it. Order number: ORD-98765.', category: 'Delivery', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.IN_PROGRESS, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.75, keywords: ['delivery', 'late', 'order'], slaDeadline: '2026-09-10T14:00:00Z', createdAt: '2026-09-05T10:00:00Z', updatedAt: '2026-09-07T16:00:00Z' },
  { id: '4', complaintId: 'CMP-2026-00004', title: 'Product quality is poor', description: 'The product I received has visible defects and does not match the description on the website.', category: 'Product', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.PENDING_CUSTOMER_RESPONSE, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.85, keywords: ['quality', 'defect', 'product'], slaDeadline: '2026-09-11T10:00:00Z', createdAt: '2026-09-04T09:00:00Z', updatedAt: '2026-09-07T12:00:00Z' },
  { id: '5', complaintId: 'CMP-2026-00005', title: 'Duplicate payment charged', description: 'My credit card was charged twice for the same transaction. Please process a refund immediately.', category: 'Payment', priority: ComplaintPriority.HIGH, status: ComplaintStatus.RESOLVED, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.90, keywords: ['payment', 'duplicate', 'refund', 'charged'], slaDeadline: '2026-09-09T08:00:00Z', createdAt: '2026-09-03T11:00:00Z', updatedAt: '2026-09-07T10:00:00Z', resolvedAt: '2026-09-07T10:00:00Z' },
  { id: '6', complaintId: 'CMP-2026-00006', title: 'App crashes on startup', description: 'After the latest update, the mobile app crashes immediately when I try to open it. I am using iPhone 15, iOS 18.', category: 'Technical Support', priority: ComplaintPriority.HIGH, status: ComplaintStatus.SUBMITTED, customerId: '1', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.78, keywords: ['crash', 'app', 'update'], slaDeadline: '2026-09-09T12:00:00Z', createdAt: '2026-09-08T06:00:00Z', updatedAt: '2026-09-08T06:00:00Z' },
  { id: '7', complaintId: 'CMP-2026-00007', title: 'Service quality has declined', description: 'The customer service response time has been terrible lately. I waited 2 hours on hold.', category: 'Service', priority: ComplaintPriority.LOW, status: ComplaintStatus.CLOSED, customerId: '1', assignedAgentId: '2', attachments: [], comments: [], sentiment: 'negative', sentimentConfidence: 0.72, keywords: ['service', 'response', 'wait'], slaDeadline: '2026-09-08T22:00:00Z', createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-06T15:00:00Z', resolvedAt: '2026-09-05T10:00:00Z', closedAt: '2026-09-06T15:00:00Z' },
  { id: '8', complaintId: 'CMP-2026-00008', title: 'Request for feature addition', description: 'It would be great if you could add a dark mode option to the web application.', category: 'Technical Support', priority: ComplaintPriority.LOW, status: ComplaintStatus.SUBMITTED, customerId: '1', attachments: [], comments: [], sentiment: 'neutral', sentimentConfidence: 0.65, keywords: ['feature', 'dark mode', 'web'], slaDeadline: '2026-09-11T08:00:00Z', createdAt: '2026-09-07T15:00:00Z', updatedAt: '2026-09-07T15:00:00Z' },
]

export function mockGetComplaints(filter?: ComplaintFilter): PaginatedResponse<Complaint> {
  let filtered = [...baseComplaints]
  if (filter?.status?.length) filtered = filtered.filter((c) => filter.status!.includes(c.status))
  if (filter?.priority?.length) filtered = filtered.filter((c) => filter.priority!.includes(c.priority))
  if (filter?.category) filtered = filtered.filter((c) => c.category === filter.category)
  if (filter?.search) {
    const s = filter.search.toLowerCase()
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(s) || c.complaintId.toLowerCase().includes(s))
  }
  const page = filter?.page || 1
  const limit = filter?.limit || 10
  const start = (page - 1) * limit
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  }
}

export function mockGetComplaintById(id: string): Complaint {
  return baseComplaints.find((c) => c.id === id) || baseComplaints[0]
}

export function mockCreateComplaint(_data: FormData): Complaint {
  const id = String(baseComplaints.length + 1).padStart(5, '0')
  return {
    id: String(baseComplaints.length + 1),
    complaintId: `CMP-2026-${id}`,
    title: 'New Complaint',
    description: '',
    category: 'Other',
    priority: ComplaintPriority.MEDIUM,
    status: ComplaintStatus.SUBMITTED,
    customerId: '1',
    attachments: [],
    comments: [],
    sentiment: 'neutral',
    sentimentConfidence: 0.5,
    aiCategory: 'Other',
    aiCategoryConfidence: 0.5,
    aiPriority: 'medium',
    aiPriorityConfidence: 0.5,
    keywords: [],
    slaDeadline: new Date(Date.now() + 48 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function mockUpdateComplaint(id: string, data: Record<string, unknown>): Complaint {
  const existing = baseComplaints.find((c) => c.id === id) || baseComplaints[0]
  return { ...existing, ...data, updatedAt: new Date().toISOString() } as Complaint
}

export function mockAddComment(complaintId: string, content: string) {
  return {
    id: Math.random().toString(36).substring(2, 9),
    content,
    userId: '1',
    complaintId,
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function mockGetComplaintStats() {
  return {
    total: 8,
    open: 2,
    inProgress: 2,
    resolved: 1,
    closed: 1,
    pending: 1,
    underReview: 1,
  }
}

export { Role }

export function mockEscalateComplaint(complaintId: string, payload: { reason?: string; toLevel?: string }): ComplaintEscalation {
  const complaint = baseComplaints.find((c) => c.id === complaintId) || baseComplaints[0]
  return {
    id: String(Math.floor(Math.random() * 1000)),
    complaintId,
    complaintNumber: complaint.complaintId,
    escalatedBy: '2',
    escalator: { id: '2', name: 'Agent Smith' },
    escalatedTo: '4',
    escalatee: { id: '4', name: 'Admin User' },
    fromLevel: EscalationLevel.LEVEL_1,
    toLevel: (payload.toLevel as EscalationLevel) || EscalationLevel.LEVEL_2,
    reason: payload.reason,
    isResolved: false,
    createdAt: new Date().toISOString(),
  }
}

export function mockChangePriority(complaintId: string, newPriority: string): Complaint {
  const complaint = baseComplaints.find((c) => c.id === complaintId) || baseComplaints[0]
  return { ...complaint, priority: newPriority as ComplaintPriority, updatedAt: new Date().toISOString() }
}

export function mockResolveComplaint(complaintId: string, _comment?: string): Complaint {
  const complaint = baseComplaints.find((c) => c.id === complaintId) || baseComplaints[0]
  return {
    ...complaint,
    status: ComplaintStatus.RESOLVED,
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function mockChangeStatus(complaintId: string, newStatus: string, _comment?: string): Complaint {
  const complaint = baseComplaints.find((c) => c.id === complaintId) || baseComplaints[0]
  return { ...complaint, status: newStatus as ComplaintStatus, updatedAt: new Date().toISOString() }
}

export { mockRecommendAgents }
