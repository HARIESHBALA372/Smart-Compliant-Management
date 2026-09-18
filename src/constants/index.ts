/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { ComplaintStatus, ComplaintPriority } from '@/types'
import type { AnalyticsStatus, AnalyticsPriority } from '@/types/analytics'

export const APP_NAME = 'Smart Complaint Management'

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  [ComplaintStatus.SUBMITTED]: 'Submitted',
  [ComplaintStatus.UNDER_REVIEW]: 'Under Review',
  [ComplaintStatus.IN_PROGRESS]: 'In Progress',
  [ComplaintStatus.PENDING_CUSTOMER_RESPONSE]: 'Pending Customer Response',
  [ComplaintStatus.RESOLVED]: 'Resolved',
  [ComplaintStatus.CLOSED]: 'Closed',
  [ComplaintStatus.REJECTED]: 'Rejected',
}

export const ANALYTICS_STATUS_LABELS: Record<AnalyticsStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_USER: 'Awaiting Customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
}

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  [ComplaintPriority.LOW]: 'Low',
  [ComplaintPriority.MEDIUM]: 'Medium',
  [ComplaintPriority.HIGH]: 'High',
  [ComplaintPriority.CRITICAL]: 'Critical',
}

export const ANALYTICS_PRIORITY_LABELS: Record<AnalyticsPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const ANALYTICS_CATEGORY_LABELS: Record<string, string> = {
  WATER: 'Water',
  ELECTRICITY: 'Electricity',
  ROADS: 'Roads',
  SANITATION: 'Sanitation',
  TRANSPORT: 'Transport',
  SAFETY: 'Safety',
  OTHER: 'Other',
  BILLING: 'Billing',
  'Technical Support': 'Technical Support',
  ACCOUNT: 'Account',
  PAYMENT: 'Payment',
  DELIVERY: 'Delivery',
  PRODUCT: 'Product',
  SERVICE: 'Service',
}

export const DEFAULT_CATEGORIES = [
  'Billing',
  'Technical Support',
  'Account',
  'Payment',
  'Delivery',
  'Product',
  'Service',
  'Other',
]

export const DEFAULT_SLA_CONFIG = [
  { priority: ComplaintPriority.LOW, responseHours: 24, resolutionHours: 72 },
  { priority: ComplaintPriority.MEDIUM, responseHours: 12, resolutionHours: 48 },
  { priority: ComplaintPriority.HIGH, responseHours: 4, resolutionHours: 24 },
  { priority: ComplaintPriority.CRITICAL, responseHours: 1, resolutionHours: 8 },
]

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_complaint: 'New Complaint',
  complaint_assigned: 'Complaint Assigned',
  status_changed: 'Status Changed',
  customer_reply: 'Customer Reply',
  sla_approaching: 'SLA Approaching',
  sla_breached: 'SLA Breached',
  complaint_resolved: 'Complaint Resolved',
  complaint_closed: 'Complaint Closed',
}

export const STATUS_FLOW = [
  ComplaintStatus.SUBMITTED,
  ComplaintStatus.UNDER_REVIEW,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.PENDING_CUSTOMER_RESPONSE,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.CLOSED,
]

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
}

export const ITEMS_PER_PAGE = 10

export const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'Custom', value: 'custom' },
]
