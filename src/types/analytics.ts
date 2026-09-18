/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics module types  (mirror the backend /api/analytics payloads)
 * ------------------------------------------------------------------
 */

export type AnalyticsStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'

export type AnalyticsPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TrendBucketLabel = 'day' | 'week' | 'month' | 'year'

export type AnalyticsRange = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  statuses?: AnalyticsStatus[]
  priorities?: AnalyticsPriority[]
  categories?: string[]
  agent?: string
  department?: string
  location?: string
}

export interface TrendPoint {
  bucket: string
  count: number
}

export interface AnalyticsPeriod {
  start: string
  end: string
}

// ---------------------------------------------------------------------------
// KPI overview
// ---------------------------------------------------------------------------

export interface AnalyticsOverview {
  totalComplaints: number
  openComplaints: number
  pendingComplaints: number
  inProgressComplaints: number
  resolvedComplaints: number
  closedComplaints: number
  rejectedComplaints: number
  escalatedComplaints: number
  reopenedComplaints: number
  highPriorityComplaints: number
  averageResolutionHours: number
  averageResolutionTime: string
  averageResponseHours: number
  resolutionRate: number
  slaCompliance: number
  customerSatisfaction: number
}

// ---------------------------------------------------------------------------
// Complaint statistics
// ---------------------------------------------------------------------------

export interface StatusSlice {
  status: AnalyticsStatus
  count: number
  percentage: number
}

export interface CategorySlice {
  category: string
  count: number
  percentage: number
}

export interface PrioritySlice {
  priority: AnalyticsPriority
  count: number
  percentage: number
  pending: number
  resolved: number
  averageResolutionHours: number
}

export interface ComplaintStats {
  total: number
  byStatus: StatusSlice[]
  byCategory: CategorySlice[]
  byPriority: PrioritySlice[]
}

export interface TrendData {
  period: AnalyticsPeriod
  points: TrendPoint[]
  total: number
}

export interface CategoryAnalytics {
  total: number
  categories: {
    category: string
    count: number
    percentage: number
    open: number
  }[]
}

export interface StatusAnalytics {
  total: number
  statuses: StatusSlice[]
}

export interface PriorityAnalytics {
  total: number
  priorities: PrioritySlice[]
}

// ---------------------------------------------------------------------------
// Resolution / SLA
// ---------------------------------------------------------------------------

export interface ResolutionAnalytics {
  averageResolutionHours: number
  minResolutionHours: number
  maxResolutionHours: number
  medianResolutionHours: number
  resolvedCount: number
  withinSla: number
  exceededSla: number
  resolutionRate: number
  reopenedRate: number
  trend: TrendPoint[]
  averageResolutionTime: string
}

export interface SlaPriorityRow {
  priority: AnalyticsPriority
  resolved: number
  withinSla: number
  compliance: number
  targetResolutionHours: number
}

export interface SlaAnalytics {
  compliance: number
  breachCount: number
  openBreached: number
  resolvedExceeded: number
  nearDeadline: number
  withinSla: number
  openTotal: number
  averageResponseHours: number
  averageResponseTime: string
  averageResolutionHours: number
  averageResolutionTime: string
  byPriority: SlaPriorityRow[]
  total: number
}

// ---------------------------------------------------------------------------
// Agents / departments / locations / users / ML / insights
// ---------------------------------------------------------------------------

export interface AgentAnalyticsRow {
  agentId: string
  agentName: string
  departmentId: string | null
  departmentName: string | null
  assigned: number
  resolved: number
  pending: number
  escalated: number
  reopened: number
  averageResolutionHours: number
  averageResolutionTime: string
  slaCompliance: number
  customerRating: number | null
  score: number
}

export interface AgentAnalytics {
  agents: AgentAnalyticsRow[]
  leaderboard: (AgentAnalyticsRow & { rank: number })[]
}

export interface DepartmentAnalyticsRow {
  departmentId: string
  departmentName: string
  total: number
  pending: number
  resolved: number
  escalated: number
  resolutionRate: number
  averageResolutionHours: number
  averageResolutionTime: string
  slaCompliance: number
}

export interface DepartmentAnalytics {
  departments: DepartmentAnalyticsRow[]
  total: number
}

export interface LocationAnalysisRow {
  location: string
  count: number
  priority: AnalyticsPriority | null
  status: AnalyticsStatus | null
}

export interface LocationAnalytics {
  locations: LocationAnalysisRow[]
  totalLocations: number
  complaintCount: number
  densityPerDay: number
  markers: LocationAnalysisRow[]
}

export interface UserAnalytics {
  totals: {
    totalUsers: number
    totalComplaints: number
    activeCustomers: number
    staffCount: number
    avgComplaintsPerUser: number
  }
  topComplainants: {
    userId: string
    userName: string
    count: number
  }[]
}

export interface MlCategoryDistribution {
  category: string
  count: number
  averageConfidence: number
}

export interface MlPriorityDistribution {
  priority: AnalyticsPriority
  count: number
  averageConfidence: number
}

export interface MlAnalytics {
  classifiedCount: number
  total: number
  coverage: number
  categoryDistribution: MlCategoryDistribution[]
  priorityDistribution: MlPriorityDistribution[]
  averageConfidence: number
  sentimentAvailable: boolean
  metrics: Record<string, unknown> | null
}

export interface InsightAlert {
  severity: 'info' | 'warning' | 'critical'
  message: string
  key: string
}

export interface InsightsData {
  alerts: InsightAlert[]
  period: AnalyticsPeriod
}

export interface ExportSection {
  id: string
  label: string
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

// ---------------------------------------------------------------------------
// Aggregated dashboard payload
// ---------------------------------------------------------------------------

export interface AnalyticsDashboardData {
  overview: AnalyticsOverview
  complaints: ComplaintStats
  trends: TrendData
  categories: CategoryAnalytics
  status: StatusAnalytics
  priority: PriorityAnalytics
  resolution: ResolutionAnalytics
  sla: SlaAnalytics
  agents: AgentAnalytics
  departments: DepartmentAnalytics
  locations: LocationAnalytics
  users: UserAnalytics
  ml: MlAnalytics
  insights: InsightsData
  lastUpdated: number
}