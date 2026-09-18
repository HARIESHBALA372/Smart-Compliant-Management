/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Mock analytics data for offline / local development
 * ------------------------------------------------------------------
 */

import type {
  AnalyticsFilters,
  AnalyticsOverview,
  ComplaintStats,
  TrendData,
  CategoryAnalytics,
  StatusAnalytics,
  PriorityAnalytics,
  ResolutionAnalytics,
  SlaAnalytics,
  AgentAnalytics,
  DepartmentAnalytics,
  LocationAnalytics,
  UserAnalytics,
  MlAnalytics,
  InsightsData,
} from '@/types/analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInRange(filters?: AnalyticsFilters): number {
  const end = filters?.endDate ? new Date(filters.endDate) : new Date()
  const start = filters?.startDate
    ? new Date(filters.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
}

function fillDates(filters?: AnalyticsFilters) {
  const end = filters?.endDate ? new Date(filters.endDate) : new Date()
  const start = filters?.startDate
    ? new Date(filters.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const points: { bucket: string; count: number }[] = []
  const cur = new Date(start)
  while (cur <= end) {
    points.push({
      bucket: cur.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 8) + 1,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return points
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const overview: AnalyticsOverview = {
  totalComplaints: 156,
  openComplaints: 23,
  pendingComplaints: 23,
  inProgressComplaints: 28,
  resolvedComplaints: 112,
  closedComplaints: 21,
  rejectedComplaints: 0,
  escalatedComplaints: 8,
  reopenedComplaints: 3,
  highPriorityComplaints: 48,
  averageResolutionHours: 18.7,
  averageResolutionTime: '18h 42m',
  averageResponseHours: 3.5,
  resolutionRate: 85.2,
  slaCompliance: 92.1,
  customerSatisfaction: 4.2,
}

// ---------------------------------------------------------------------------
// Complaint stats
// ---------------------------------------------------------------------------

const complaints: ComplaintStats = {
  total: 156,
  byStatus: [
    { status: 'SUBMITTED', count: 12, percentage: 7.69 },
    { status: 'UNDER_REVIEW', count: 11, percentage: 7.05 },
    { status: 'ASSIGNED', count: 8, percentage: 5.13 },
    { status: 'IN_PROGRESS', count: 28, percentage: 17.95 },
    { status: 'WAITING_FOR_USER', count: 15, percentage: 9.62 },
    { status: 'RESOLVED', count: 62, percentage: 39.74 },
    { status: 'CLOSED', count: 28, percentage: 17.95 },
    { status: 'REJECTED', count: 0, percentage: 0 },
  ],
  byCategory: [
    { category: 'BILLING', count: 35, percentage: 22.44 },
    { category: 'ELECTRICITY', count: 28, percentage: 17.95 },
    { category: 'WATER', count: 25, percentage: 16.03 },
    { category: 'ROADS', count: 22, percentage: 14.1 },
    { category: 'SANITATION', count: 18, percentage: 11.54 },
    { category: 'TRANSPORT', count: 15, percentage: 9.62 },
    { category: 'SAFETY', count: 8, percentage: 5.13 },
    { category: 'OTHER', count: 5, percentage: 3.21 },
  ],
  byPriority: [
    { priority: 'LOW', count: 32, percentage: 20.51, pending: 4, resolved: 26, averageResolutionHours: 22.1 },
    { priority: 'MEDIUM', count: 58, percentage: 37.18, pending: 11, resolved: 44, averageResolutionHours: 18.5 },
    { priority: 'HIGH', count: 48, percentage: 30.77, pending: 7, resolved: 38, averageResolutionHours: 15.2 },
    { priority: 'CRITICAL', count: 18, percentage: 11.54, pending: 4, resolved: 12, averageResolutionHours: 8.3 },
  ],
}

// ---------------------------------------------------------------------------
// Categories / status / priority analytics
// ---------------------------------------------------------------------------

const categories: CategoryAnalytics = {
  total: 156,
  categories: complaints.byCategory.map((c) => ({
    category: c.category,
    count: c.count,
    percentage: c.percentage,
    open: Math.min(c.count, Math.floor(Math.random() * 6) + 1),
  })),
}

const status: StatusAnalytics = {
  total: 156,
  statuses: complaints.byStatus,
}

const priority: PriorityAnalytics = {
  total: 156,
  priorities: complaints.byPriority,
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

function getTrends(filters?: AnalyticsFilters): TrendData {
  const points = fillDates(filters)
  return {
    period: {
      start: (filters?.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString(),
      end: (filters?.endDate ? new Date(filters.endDate) : new Date()).toISOString(),
    },
    points,
    total: points.reduce((sum, p) => sum + p.count, 0),
  }
}

// ---------------------------------------------------------------------------
// Resolution / SLA
// ---------------------------------------------------------------------------

const resolution: ResolutionAnalytics = {
  averageResolutionHours: 18.7,
  minResolutionHours: 0.5,
  maxResolutionHours: 72.3,
  medianResolutionHours: 16.4,
  resolvedCount: 133,
  withinSla: 123,
  exceededSla: 10,
  resolutionRate: 85.2,
  reopenedRate: 2.26,
  trend: [
    { bucket: '2026-08-16', count: 4 },
    { bucket: '2026-08-17', count: 5 },
    { bucket: '2026-08-18', count: 3 },
    { bucket: '2026-08-19', count: 7 },
    { bucket: '2026-08-20', count: 6 },
    { bucket: '2026-08-21', count: 4 },
    { bucket: '2026-08-22', count: 8 },
  ],
  averageResolutionTime: '18h 42m',
}

const sla: SlaAnalytics = {
  compliance: 92.1,
  breachCount: 14,
  openBreached: 4,
  resolvedExceeded: 10,
  nearDeadline: 5,
  withinSla: 14,
  openTotal: 23,
  averageResponseHours: 3.5,
  averageResponseTime: '3h 30m',
  averageResolutionHours: 18.7,
  averageResolutionTime: '18h 42m',
  byPriority: [
    { priority: 'LOW', resolved: 26, withinSla: 24, compliance: 92.3, targetResolutionHours: 72 },
    { priority: 'MEDIUM', resolved: 44, withinSla: 40, compliance: 90.9, targetResolutionHours: 48 },
    { priority: 'HIGH', resolved: 38, withinSla: 36, compliance: 94.7, targetResolutionHours: 24 },
    { priority: 'CRITICAL', resolved: 12, withinSla: 11, compliance: 91.7, targetResolutionHours: 8 },
  ],
  total: 156,
}

// ---------------------------------------------------------------------------
// Agents / departments / locations / users / ML / insights
// ---------------------------------------------------------------------------

const agents: AgentAnalytics = {
  agents: [
    { agentId: 'a1', agentName: 'Jane Agent', departmentId: 'd1', departmentName: 'Water', assigned: 45, resolved: 38, pending: 4, escalated: 2, reopened: 1, averageResolutionHours: 16.5, averageResolutionTime: '16h 30m', slaCompliance: 94.2, customerRating: 4.5, score: 78.6 },
    { agentId: 'a2', agentName: 'Charlie Agent', departmentId: 'd1', departmentName: 'Water', assigned: 35, resolved: 28, pending: 5, escalated: 2, reopened: 0, averageResolutionHours: 20.3, averageResolutionTime: '20h 18m', slaCompliance: 89.1, customerRating: 4.0, score: 64.2 },
  ],
  leaderboard: [
    { rank: 1, agentId: 'a1', agentName: 'Jane Agent', departmentId: 'd1', departmentName: 'Water', assigned: 45, resolved: 38, pending: 4, escalated: 2, reopened: 1, averageResolutionHours: 16.5, averageResolutionTime: '16h 30m', slaCompliance: 94.2, customerRating: 4.5, score: 78.6 },
    { rank: 2, agentId: 'a2', agentName: 'Charlie Agent', departmentId: 'd1', departmentName: 'Water', assigned: 35, resolved: 28, pending: 5, escalated: 2, reopened: 0, averageResolutionHours: 20.3, averageResolutionTime: '20h 18m', slaCompliance: 89.1, customerRating: 4.0, score: 64.2 },
  ],
}

const departments: DepartmentAnalytics = {
  departments: [
    { departmentId: 'd1', departmentName: 'Water', total: 70, pending: 9, resolved: 58, escalated: 4, resolutionRate: 82.86, averageResolutionHours: 18.0, averageResolutionTime: '18h 0m', slaCompliance: 93.1 },
    { departmentId: 'd2', departmentName: 'Electricity', total: 55, pending: 8, resolved: 43, escalated: 3, resolutionRate: 78.18, averageResolutionHours: 19.5, averageResolutionTime: '19h 30m', slaCompliance: 90.7 },
  ],
  total: 125,
}

const locations: LocationAnalytics = {
  locations: [
    { location: 'Block 12', count: 42, priority: 'HIGH', status: 'IN_PROGRESS' },
    { location: 'Main Road', count: 31, priority: 'MEDIUM', status: 'SUBMITTED' },
    { location: 'City Center', count: 28, priority: 'LOW', status: 'RESOLVED' },
  ],
  totalLocations: 18,
  complaintCount: 156,
  densityPerDay: 5.2,
  markers: [
    { location: 'Block 12', count: 42, priority: 'HIGH', status: 'IN_PROGRESS' },
    { location: 'Main Road', count: 31, priority: 'MEDIUM', status: 'SUBMITTED' },
  ],
}

const users: UserAnalytics = {
  totals: { totalUsers: 84, totalComplaints: 156, activeCustomers: 73, staffCount: 11, avgComplaintsPerUser: 1.86 },
  topComplainants: [
    { userId: 'u1', userName: 'Alice', count: 8 },
    { userId: 'u2', userName: 'Bob', count: 6 },
    { userId: 'u3', userName: 'Carlos', count: 5 },
  ],
}

const ml: MlAnalytics = {
  classifiedCount: 122,
  total: 156,
  coverage: 78.2,
  categoryDistribution: [
    { category: 'BILLING', count: 34, averageConfidence: 0.87 },
    { category: 'ELECTRICITY', count: 27, averageConfidence: 0.82 },
    { category: 'WATER', count: 24, averageConfidence: 0.79 },
  ],
  priorityDistribution: [
    { priority: 'LOW', count: 30, averageConfidence: 0.91 },
    { priority: 'MEDIUM', count: 55, averageConfidence: 0.88 },
    { priority: 'HIGH', count: 27, averageConfidence: 0.93 },
    { priority: 'CRITICAL', count: 10, averageConfidence: 0.96 },
  ],
  averageConfidence: 0.88,
  sentimentAvailable: false,
  metrics: { modelVersion: '2026.09.1', lastTrained: '2026-09-10T12:00:00Z' },
}

const insights: InsightsData = {
  alerts: [
    { severity: 'info', key: 'area-block-12', message: 'Block 12 has the highest number of unresolved complaints (42).' },
    { severity: 'warning', key: 'category-billing', message: 'BILLING complaints increased by 25% this period (35 vs 28).' },
    { severity: 'critical', key: 'critical-burst', message: 'Critical complaints (18) are above the previous period\'s level (12).' },
  ],
  period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export function mockGetAnalytics(_filters?: AnalyticsFilters) {
  return {
    overview,
    complaints,
    trends: getTrends(_filters),
    categories,
    status,
    priority,
    resolution,
    sla,
    agents,
    departments,
    locations,
    users,
    ml,
    insights,
    lastUpdated: Date.now(),
  }
}
