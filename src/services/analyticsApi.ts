/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import { isMockMode } from './mock/mockData'
import type { AnalyticsData, AgentPerformance } from '@/types'
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
  ExportSection,
  ExportFormat,
} from '@/types/analytics'

function toQuery(filters?: AnalyticsFilters): Record<string, string | string[]> | undefined {
  if (!filters) return undefined
  const q: Record<string, string | string[]> = {}
  if (filters.startDate) q.startDate = filters.startDate
  if (filters.endDate) q.endDate = filters.endDate
  if (filters.statuses?.length) q.status = filters.statuses.join(',')
  if (filters.priorities?.length) q.priority = filters.priorities.join(',')
  if (filters.categories?.length) q.category = filters.categories.join(',')
  if (filters.agent) q.agent = filters.agent
  if (filters.department) q.department = filters.department
  if (filters.location) q.location = filters.location
  return q
}

async function get<T>(url: string, params?: Record<string, string | string[]> | undefined): Promise<T> {
  const response = await api.get(url, { params })
  return response.data.data as T
}

/* ------------------------------------------------------------------
 * Legacy API  (used by analyticsSlice – kept for backward compat)
 * ------------------------------------------------------------------ */

async function legacyGetAnalytics(params?: AnalyticsFilters): Promise<AnalyticsData> {
  const mock = isMockMode()
  const { mockGetAnalytics } = await import('./mock/mockAnalytics')
  const query = toQuery(params)
  const [overview, complaintStats, trendData] = await Promise.all([
    mock ? Promise.resolve(mockGetAnalytics().overview) : get<AnalyticsOverview>('/analytics/overview', query),
    mock ? Promise.resolve(mockGetAnalytics().complaints) : get<ComplaintStats>('/analytics/complaints', query),
    mock ? Promise.resolve(mockGetAnalytics().trends) : get<TrendData>('/analytics/trends', query),
  ])

  const hoursOf = (value: string): number => Number(value.replace(/[^0-9.]/g, '')) || 0

  return {
    totalComplaints: overview.totalComplaints,
    openComplaints: overview.openComplaints,
    resolvedComplaints: overview.resolvedComplaints,
    closedComplaints: overview.closedComplaints,
    resolutionRate: overview.resolutionRate,
    averageResponseTime: overview.averageResponseHours,
    averageResolutionTime: hoursOf(overview.averageResolutionTime),
    slaCompliance: overview.slaCompliance,
    customerSatisfaction: overview.customerSatisfaction,
    escalations: overview.escalatedComplaints,
    reopenedComplaints: overview.reopenedComplaints,
    complaintsByStatus: complaintStats.byStatus.map((s) => ({ status: s.status, count: s.count })),
    complaintsByCategory: complaintStats.byCategory.map((c) => ({ category: c.category, count: c.count })),
    complaintsByPriority: complaintStats.byPriority.map((p) => ({ priority: p.priority, count: p.count })),
    complaintsTrend: trendData.points.map((p) => ({ date: p.bucket, count: p.count })),
    agentPerformance: [] as AgentPerformance[],
  }
}

async function legacyGetAgentPerformance(): Promise<AgentPerformance[]> {
  if (isMockMode()) {
    const { mockGetAnalytics } = await import('./mock/mockAnalytics')
    return mockGetAnalytics().agents.leaderboard.map((row) => ({
      agentId: row.agentId,
      agentName: row.agentName,
      assigned: row.assigned,
      resolved: row.resolved,
      averageResolutionTime: row.averageResolutionHours,
      slaCompliance: row.slaCompliance,
      customerSatisfaction: row.customerRating ?? 0,
    }))
  }
  const data = await get<AgentAnalytics>('/analytics/agents')
  return data.leaderboard.map((row) => ({
    agentId: row.agentId,
    agentName: row.agentName,
    assigned: row.assigned,
    resolved: row.resolved,
    averageResolutionTime: row.averageResolutionHours,
    slaCompliance: row.slaCompliance,
    customerSatisfaction: row.customerRating ?? 0,
  }))
}

/* ------------------------------------------------------------------
 * New Analytics API
 * ------------------------------------------------------------------ */

export const analyticsApi = {
  // Legacy (used by old slice)
  async getAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsData> {
    return legacyGetAnalytics(filters)
  },
  async getAgentPerformance(): Promise<AgentPerformance[]> {
    return legacyGetAgentPerformance()
  },

  // New per-section endpoints
  async getOverview(filters?: AnalyticsFilters): Promise<AnalyticsOverview> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().overview
    }
    return get<AnalyticsOverview>('/analytics/overview', toQuery(filters))
  },
  async getComplaintStats(filters?: AnalyticsFilters): Promise<ComplaintStats> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().complaints
    }
    return get<ComplaintStats>('/analytics/complaints', toQuery(filters))
  },
  async getTrends(filters?: AnalyticsFilters): Promise<TrendData> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().trends
    }
    return get<TrendData>('/analytics/trends', toQuery(filters))
  },
  async getCategories(filters?: AnalyticsFilters): Promise<CategoryAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().categories
    }
    return get<CategoryAnalytics>('/analytics/categories', toQuery(filters))
  },
  async getStatus(filters?: AnalyticsFilters): Promise<StatusAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().status
    }
    return get<StatusAnalytics>('/analytics/status', toQuery(filters))
  },
  async getPriority(filters?: AnalyticsFilters): Promise<PriorityAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().priority
    }
    return get<PriorityAnalytics>('/analytics/priority', toQuery(filters))
  },
  async getResolution(filters?: AnalyticsFilters): Promise<ResolutionAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().resolution
    }
    return get<ResolutionAnalytics>('/analytics/resolution', toQuery(filters))
  },
  async getSla(filters?: AnalyticsFilters): Promise<SlaAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().sla
    }
    return get<SlaAnalytics>('/analytics/sla', toQuery(filters))
  },
  async getAgents(filters?: AnalyticsFilters): Promise<AgentAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().agents
    }
    return get<AgentAnalytics>('/analytics/agents', toQuery(filters))
  },
  async getDepartments(filters?: AnalyticsFilters): Promise<DepartmentAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().departments
    }
    return get<DepartmentAnalytics>('/analytics/departments', toQuery(filters))
  },
  async getLocations(filters?: AnalyticsFilters): Promise<LocationAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().locations
    }
    return get<LocationAnalytics>('/analytics/locations', toQuery(filters))
  },
  async getUsers(filters?: AnalyticsFilters): Promise<UserAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().users
    }
    return get<UserAnalytics>('/analytics/users', toQuery(filters))
  },
  async getMl(filters?: AnalyticsFilters): Promise<MlAnalytics> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().ml
    }
    return get<MlAnalytics>('/analytics/ml', toQuery(filters))
  },
  async getInsights(filters?: AnalyticsFilters): Promise<InsightsData> {
    if (isMockMode()) {
      const { mockGetAnalytics } = await import('./mock/mockAnalytics')
      return mockGetAnalytics().insights
    }
    return get<InsightsData>('/analytics/insights', toQuery(filters))
  },
  async getExportSections(): Promise<ExportSection[]> {
    if (isMockMode()) return []
    return get<ExportSection[]>('/analytics/sections')
  },
  async downloadExport(
    format: ExportFormat,
    section?: string[],
    filters?: AnalyticsFilters,
  ): Promise<Blob> {
    if (isMockMode()) {
      const text = 'AGENT,ASSIGNED,RESOLVED\nJane Agent,45,38'
      return new Blob([text], { type: 'text/csv;charset=utf-8' })
    }
    const response = await api.get('/analytics/export', {
      params: {
        format,
        section: section?.join(','),
        ...toQuery(filters),
      },
      responseType: 'blob',
    })
    return response.data as Blob
  },
}