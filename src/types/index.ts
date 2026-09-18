/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

export enum Role {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export enum ComplaintStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  IN_PROGRESS = 'in_progress',
  PENDING_CUSTOMER_RESPONSE = 'pending_customer_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

export enum EscalationLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  avatar?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
}

export interface Complaint {
  id: string
  complaintId: string
  title: string
  description: string
  category: string
  subcategory?: string
  priority: ComplaintPriority
  status: ComplaintStatus
  customerId: string
  customer?: User
  assignedAgentId?: string
  assignedAgent?: User
  attachments: Attachment[]
  comments: Comment[]
  sentiment?: string
  sentimentConfidence?: number
  aiCategory?: string
  aiCategoryConfidence?: number
  aiPriority?: string
  aiPriorityConfidence?: number
  keywords?: string[]
  slaDeadline: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  closedAt?: string
}

export interface Attachment {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  createdAt: string
}

export interface Comment {
  id: string
  content: string
  userId: string
  user?: User
  complaintId: string
  parentId?: string
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  userId: string
  complaintId?: string
  isRead: boolean
  readAt?: string | null
  completed?: boolean
  completedAt?: string | null
  channel?: 'IN_APP' | 'EMAIL'
  priority?: 'NORMAL' | 'IMPORTANT' | 'CRITICAL'
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface NotificationPreferences {
  complaintStatusUpdates: boolean
  complaintAssignment: boolean
  complaintResolution: boolean
  commentNotifications: boolean
  slaAlerts: boolean
  emailNotifications: boolean
  inAppNotifications: boolean
  announcements: boolean
  feedbackRequests: boolean
}

export interface NotificationListResult {
  notifications: Notification[]
  page: number
  limit: number
  total: number
  totalPages: number
  unreadCount: number
}

export enum NotificationType {
  NEW_COMPLAINT = 'new_complaint',
  COMPLAINT_ASSIGNED = 'complaint_assigned',
  STATUS_CHANGED = 'status_changed',
  CUSTOMER_REPLY = 'customer_reply',
  SLA_APPROACHING = 'sla_approaching',
  SLA_BREACHED = 'sla_breached',
  COMPLAINT_ESCALATED = 'complaint_escalated',
  SLA_WARNING = 'sla_warning',
  COMPLAINT_RESOLVED = 'complaint_resolved',
  COMPLAINT_CLOSED = 'complaint_closed',
  COMPLAINT_CREATED = 'COMPLAINT_CREATED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  COMPLAINT_ASSIGNED_UPPER = 'COMPLAINT_ASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMPLAINT_REJECTED = 'COMPLAINT_REJECTED',
  COMPLAINT_REOPENED = 'COMPLAINT_REOPENED',
  COMPLAINT_PRIORITY_CHANGED = 'COMPLAINT_PRIORITY_CHANGED',
  FEEDBACK_REQUEST = 'FEEDBACK_REQUEST',
  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
}

export interface Category {
  id: string
  name: string
  subcategories: string[]
  isActive: boolean
  slaResponseHours: number
  slaResolutionHours: number
  createdAt: string
}

export interface SLAConfig {
  id: string
  priority: ComplaintPriority
  responseHours: number
  resolutionHours: number
}

export interface AuditLog {
  id: string
  userId: string
  user?: User
  action: string
  resource: string
  resourceId: string
  details?: string | Record<string, unknown> | null
  userName?: string
  ipAddress: string
  createdAt: string
}

export interface AnalyticsData {
  totalComplaints: number
  openComplaints: number
  resolvedComplaints: number
  closedComplaints: number
  resolutionRate: number
  averageResponseTime: number
  averageResolutionTime: number
  slaCompliance: number
  customerSatisfaction: number
  escalations: number
  reopenedComplaints: number
  complaintsByStatus: { status: string; count: number }[]
  complaintsByCategory: { category: string; count: number }[]
  complaintsByPriority: { priority: string; count: number }[]
  complaintsTrend: { date: string; count: number }[]
  agentPerformance?: AgentPerformance[]
}

export interface AgentPerformance {
  agentId: string
  agentName: string
  assigned: number
  resolved: number
  averageResolutionTime: number
  slaCompliance: number
  customerSatisfaction: number
}

export interface ReportConfig {
  type: string
  startDate: string
  endDate: string
  format: 'pdf' | 'csv' | 'excel'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ComplaintFilter {
  status?: ComplaintStatus[]
  priority?: ComplaintPriority[]
  category?: string
  search?: string
  startDate?: string
  endDate?: string
  assignedAgentId?: string
  customerId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface Department {
  id: string
  name: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AgentWithWorkload {
  id: string
  name: string
  email: string
  phone?: string
  departmentId?: string
  department?: { id: string; name: string } | null
  assigned: number
  open: number
  inProgress: number
  waiting: number
  resolved: number
  critical: number
  overdue: number
  avgResolutionHours: number
  slaCompliance: number
}

export interface AgentRecommendation {
  agentId: string
  name: string
  email: string
  departmentId?: string
  departmentName?: string
  openComplaints: number
  resolvedCount: number
  score: number
  reason: string
}

export interface ComplaintEscalation {
  id: string
  complaintId: string
  complaintNumber?: string
  escalatedBy?: string
  escalator?: { id: string; name: string }
  escalatedTo?: string
  escalatee?: { id: string; name: string }
  fromLevel?: EscalationLevel
  toLevel: EscalationLevel
  reason?: string
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  complaint?: Complaint
}

export interface DashboardStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  overdue: number
  resolvedToday: number
  avgResponseTime: number
  avgResolutionTime: number
  slaCompliance: number
}
