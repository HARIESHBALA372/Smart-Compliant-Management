/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import type { Category, SLAConfig, AuditLog, PaginatedResponse } from '@/types'
import { ComplaintPriority } from '@/types'

export const isMockMode = () => {
  return import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.MODE === 'test' || !import.meta.env.VITE_API_URL
}

const mockCategories: Category[] = [
  { id: '1', name: 'Water', subcategories: ['Leakage', 'Contamination', 'Supply Disruption', 'Billing'], isActive: true, slaResponseHours: 4, slaResolutionHours: 24, createdAt: '2026-01-01' },
  { id: '2', name: 'Electricity', subcategories: ['Power Outage', 'Faulty Wiring', 'Street Light', 'Billing'], isActive: true, slaResponseHours: 4, slaResolutionHours: 24, createdAt: '2026-01-01' },
  { id: '3', name: 'Roads', subcategories: ['Potholes', 'Road Damage', 'Missing Signage', 'Drainage'], isActive: true, slaResponseHours: 12, slaResolutionHours: 48, createdAt: '2026-01-01' },
  { id: '4', name: 'Sanitation', subcategories: ['Garbage Collection', 'Public Toilets', 'Drainage Block', 'Sweeping'], isActive: true, slaResponseHours: 4, slaResolutionHours: 24, createdAt: '2026-01-01' },
  { id: '5', name: 'Transport', subcategories: ['Bus Service', 'Traffic Signal', 'Public Parking', 'Road Safety'], isActive: true, slaResponseHours: 12, slaResolutionHours: 48, createdAt: '2026-01-01' },
  { id: '6', name: 'Safety', subcategories: ['Street Lighting', 'Unsafe Structure', 'Public Hazard', 'Crime Concern'], isActive: true, slaResponseHours: 12, slaResolutionHours: 48, createdAt: '2026-01-01' },
  { id: '7', name: 'Other', subcategories: ['General', 'Feedback', 'Environmental', 'Noise'], isActive: true, slaResponseHours: 24, slaResolutionHours: 72, createdAt: '2026-01-01' },
]

const mockSLAConfig: SLAConfig[] = [
  { id: '1', priority: ComplaintPriority.LOW, responseHours: 24, resolutionHours: 72 },
  { id: '2', priority: ComplaintPriority.MEDIUM, responseHours: 12, resolutionHours: 48 },
  { id: '3', priority: ComplaintPriority.HIGH, responseHours: 4, resolutionHours: 24 },
  { id: '4', priority: ComplaintPriority.CRITICAL, responseHours: 1, resolutionHours: 8 },
]

const mockAuditLogs: AuditLog[] = [
  { id: '1', userId: '4', action: 'LOGIN', resource: 'Auth', resourceId: '4', ipAddress: '192.168.1.1', createdAt: '2026-09-08T10:00:00Z' },
  { id: '2', userId: '2', action: 'UPDATE_STATUS', resource: 'Complaint', resourceId: '1', details: 'Status changed to In Progress', ipAddress: '192.168.1.2', createdAt: '2026-09-08T10:30:00Z' },
  { id: '3', userId: '4', action: 'CREATE_USER', resource: 'User', resourceId: '5', details: 'Created customer account', ipAddress: '192.168.1.1', createdAt: '2026-09-08T11:00:00Z' },
  { id: '4', userId: '3', action: 'UPDATE_SLA', resource: 'SLA', resourceId: '1', details: 'Updated high priority SLA', ipAddress: '192.168.1.3', createdAt: '2026-09-08T11:30:00Z' },
  { id: '5', userId: '2', action: 'RESOLVE', resource: 'Complaint', resourceId: '3', details: 'Complaint resolved', ipAddress: '192.168.1.2', createdAt: '2026-09-08T12:00:00Z' },
]

export function mockGetCategories(): Category[] {
  return mockCategories
}

export function mockGetSLAConfig(): SLAConfig[] {
  return mockSLAConfig
}

export function mockGetAuditLogs(_params?: { page?: number; limit?: number; search?: string }): PaginatedResponse<AuditLog> {
  return { data: mockAuditLogs, total: mockAuditLogs.length, page: 1, limit: 10, totalPages: 1 }
}
