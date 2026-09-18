import { prisma } from '../config/database'
import { env } from '../config/env'
import {
  AnalyticsFilters,
  PRIORITY_ORDER,
  STATUS_ORDER,
  TERMINAL_STATUSES,
  formatDuration,
  mean,
  median,
  round2,
  resolutionStats,
} from '../utils/analytics'
import { AnalyticsTarget, getSlaHoursMap } from './analytics-access.service'
import { ANALYTICS_TTL, analyticsRemember } from './analytics-cache.service'
import * as repo from '../repositories/analytics.repository'
import { logger } from '../utils/logger'

/**
 * Business layer for the Analytics module. Every function receives an already
 * scope-resolved `AnalyticsTarget` (see analytics-access.service) and caches
 * its payload under a versioned Redis namespace that is invalidated whenever
 * complaint data changes. All functions fall back to PostgreSQL when Redis is
 * unavailable.
 */

const DEFAULT_WINDOW_DAYS = 30

function windowFilters(filters: AnalyticsFilters): { start: Date; end: Date } {
  const end = filters.endDate ?? new Date()
  const start = filters.startDate ?? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return { start, end }
}

function orderByPriority<T extends { priority: string }>(rows: T[]): T[] {
  const rank = new Map<string, number>(PRIORITY_ORDER.map((p, i) => [p, i]))
  return [...rows].sort((a, b) => (rank.get(a.priority) ?? 99) - (rank.get(b.priority) ?? 99))
}

function orderByStatus<T extends { status: string }>(rows: T[]): T[] {
  const rank = new Map<string, number>(STATUS_ORDER.map((s, i) => [s, i]))
  return [...rows].sort((a, b) => (rank.get(a.status) ?? 99) - (rank.get(b.status) ?? 99))
}

// ---------------------------------------------------------------------------
// KPI overview
// ---------------------------------------------------------------------------

export async function getOverview(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'overview', filters, ANALYTICS_TTL.overview, async () => {
    const { resolutionHours } = await getSlaHoursMap()
    const [total, open, inProgress, resolved, closed, escalated, highPriority, reopened] =
      await Promise.all([
        repo.countComplaints(filters),
        repo.countOpenComplaints(filters),
        repo.countInProgress(filters),
        repo.countResolved(filters),
        repo.countClosed(filters),
        repo.countEscalated(filters),
        repo.countHighPriority(filters),
        repo.countReopened(filters),
      ])

    const resolvedRows = await repo.resolvedRows(filters)
    const feedback = await repo.feedbackRows(filters)
    const response = await repo.responseRows(filters)

    const durationMs = resolvedRows.map((r) => r.resolvedAt!.getTime() - r.createdAt.getTime())
    const withinSla = resolvedRows.filter(
      (r) => r.resolvedAt!.getTime() - r.createdAt.getTime() <= resolutionHours[r.priority] * 60 * 60 * 1000,
    ).length

    const responseHours = response.map((r) => {
      const at = r.assignedAt ?? r.firstUpdateAt
      return at ? (at.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000) : null
    }).filter((v): v is number => v !== null && v >= 0)

    const avgRating = feedback.length ? mean(feedback.map((f) => f.rating)) : 0

    return {
      totalComplaints: total,
      openComplaints: open,
      pendingComplaints: open,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
      closedComplaints: closed,
      rejectedComplaints: resolved + closed + reopened,
      escalatedComplaints: escalated,
      reopenedComplaints: reopened,
      highPriorityComplaints: highPriority,
      averageResolutionHours: round2(mean(durationMs) / (60 * 60 * 1000)),
      averageResolutionTime: formatDuration(mean(durationMs)),
      averageResponseHours: round2(mean(responseHours)),
      resolutionRate: total > 0 ? round2((resolved / total) * 100) : 0,
      slaCompliance: resolvedRows.length > 0 ? round2((withinSla / resolvedRows.length) * 100) : 100,
      customerSatisfaction: round2(avgRating),
      escalatedCount: escalated,
      reopenedCount: reopened,
    }
  })
}

// ---------------------------------------------------------------------------
// Complaint statistics
// ---------------------------------------------------------------------------

export async function getComplaintStats(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'complaints', filters, ANALYTICS_TTL.complaints, async () => {
    const [total, byStatus, byCategory, byPriority] = await Promise.all([
      repo.countComplaints(filters),
      repo.countsByStatus(filters),
      repo.countsByCategory(filters),
      repo.countsByPriority(filters),
    ])
    const pct = (n: number) => (total > 0 ? round2((n / total) * 100) : 0)

    return {
      total,
      byStatus: orderByStatus(byStatus).map((s) => ({ status: s.status, count: s.count, percentage: pct(s.count) })),
      byCategory: byCategory
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((c) => ({ category: c.category, count: c.count, percentage: pct(c.count) })),
      byPriority: orderByPriority(byPriority).map((p) => ({ priority: p.priority, count: p.count, percentage: pct(p.count) })),
    }
  })
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export async function getTrends(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'trends', filters, ANALYTICS_TTL.trends, async () => {
    const { start, end } = windowFilters(filters)
    const raw = await repo.trendSeries(filters)
    const points = await repo.fillTrend(raw, start, end)
    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      points,
      total: points.reduce((sum, p) => sum + p.count, 0),
    }
  })
}

// ---------------------------------------------------------------------------
// Categories / status / priority
// ---------------------------------------------------------------------------

export async function getCategoryAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'categories', filters, ANALYTICS_TTL.categories, async () => {
    const [byCategory, total, openByCategory] = await Promise.all([
      repo.countsByCategory(filters),
      repo.countComplaints(filters),
      repo.countsByCategory({ ...filters, statuses: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER'] }),
    ])
    const counts = byCategory.slice().sort((a, b) => b.count - a.count)
    return {
      total,
      categories: counts.map((c) => ({
        category: c.category,
        count: c.count,
        percentage: total > 0 ? round2((c.count / total) * 100) : 0,
        open: openByCategory.find((o) => o.category === c.category)?.count ?? 0,
      })),
    }
  })
}

export async function getStatusAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'status', filters, ANALYTICS_TTL.status, async () => {
    const [byStatus, total] = await Promise.all([repo.countsByStatus(filters), repo.countComplaints(filters)])
    return {
      total,
      statuses: orderByStatus(byStatus).map((s) => ({
        status: s.status,
        count: s.count,
        percentage: total > 0 ? round2((s.count / total) * 100) : 0,
      })),
    }
  })
}

export async function getPriorityAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'priority', filters, ANALYTICS_TTL.priority, async () => {
    const [byPriority, total, openByPriority, resolvedByPriority, resolvedRows] = await Promise.all([
      repo.countsByPriority(filters),
      repo.countComplaints(filters),
      repo.countsByPriority({ ...filters, statuses: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER'] }),
      repo.countsByPriority({ ...filters, statuses: ['RESOLVED', 'CLOSED'] }),
      repo.resolvedRows(filters),
    ])

    const durationsByPriority = new Map<string, number[]>()
    for (const row of resolvedRows) {
      const list = durationsByPriority.get(row.priority) ?? []
      list.push(row.resolvedAt!.getTime() - row.createdAt.getTime())
      durationsByPriority.set(row.priority, list)
    }

    const items = orderByPriority(byPriority).map((p) => {
      const durations = durationsByPriority.get(p.priority) ?? []
      return {
        priority: p.priority,
        count: p.count,
        percentage: total > 0 ? round2((p.count / total) * 100) : 0,
        pending: openByPriority.find((o) => o.priority === p.priority)?.count ?? 0,
        resolved: resolvedByPriority.find((r) => r.priority === p.priority)?.count ?? 0,
        averageResolutionHours: durations.length ? round2(mean(durations) / (60 * 60 * 1000)) : 0,
      }
    })

    return { total, priorities: items }
  })
}

// ---------------------------------------------------------------------------
// Resolution analytics
// ---------------------------------------------------------------------------

export async function getResolutionAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'resolution', filters, ANALYTICS_TTL.resolution, async () => {
    const { resolutionHours } = await getSlaHoursMap()
    const [total, resolvedRows, reopened, resolvedByStatus] = await Promise.all([
      repo.countComplaints(filters),
      repo.resolvedRows(filters),
      repo.countReopened(filters),
      repo.countsByStatus({ ...filters, statuses: ['RESOLVED', 'CLOSED'] }),
    ])

    const stats = resolutionStats(
      resolvedRows.filter((r) => r.resolvedAt),
      resolutionHours,
    )
    const resolved = resolvedByStatus.reduce((sum, s) => sum + s.count, 0)
    const resolutionTrend = await repo.resolutionTrendSeries(filters)

    return {
      ...stats,
      resolutionRate: total > 0 ? round2((resolved / total) * 100) : 0,
      reopenedRate: resolved > 0 ? round2((reopened / resolved) * 100) : 0,
      trend: resolutionTrend,
      averageResolutionTime: formatDuration(stats.averageResolutionHours * 60 * 60 * 1000),
    }
  })
}

function meanOf(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

// ---------------------------------------------------------------------------
// SLA analytics
// ---------------------------------------------------------------------------

export async function getSlaAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'sla', filters, ANALYTICS_TTL.sla, async () => {
    const { responseHours, resolutionHours } = await getSlaHoursMap()
    const [resolvedRows, openRows, total] = await Promise.all([
      repo.resolvedRows(filters),
      repo.openComplaintRows(filters),
      repo.countComplaints(filters),
    ])

    const now = Date.now()
    const byPriority = PRIORITY_ORDER.map((priority) => {
      const rows = resolvedRows.filter((r) => r.priority === priority)
      const within = rows.filter(
        (r) => r.resolvedAt!.getTime() - r.createdAt.getTime() <= resolutionHours[priority] * 60 * 60 * 1000,
      ).length
      return {
        priority,
        resolved: rows.length,
        withinSla: within,
        compliance: rows.length > 0 ? round2((within / rows.length) * 100) : 100,
        targetResolutionHours: resolutionHours[priority],
      }
    })

    const openSla = openRows.map((row) => {
      const limit = resolutionHours[row.priority] * 60 * 60 * 1000
      const deadline = row.createdAt.getTime() + limit
      const elapsed = now - row.createdAt.getTime()
      let status: 'WITHIN_SLA' | 'APPROACHING_SLA' | 'SLA_BREACHED'
      if (elapsed >= limit) status = 'SLA_BREACHED'
      else if (elapsed / limit >= 0.75) status = 'APPROACHING_SLA'
      else status = 'WITHIN_SLA'
      return {
        status,
        remainingHours: round2((deadline - now) / (60 * 60 * 1000)),
      }
    })

    const breachedOpen = openSla.filter((s) => s.status === 'SLA_BREACHED').length
    const approaching = openSla.filter((s) => s.status === 'APPROACHING_SLA').length
    const exceededResolved = resolvedRows.filter(
      (r) => r.resolvedAt!.getTime() - r.createdAt.getTime() > resolutionHours[r.priority] * 60 * 60 * 1000,
    ).length

    const response = await repo.responseRows(filters)
    const responseTimes = response.map((r) => {
      const at = r.assignedAt ?? r.firstUpdateAt
      return at ? (at.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000) : null
    }).filter((v): v is number => v !== null && v >= 0)

    const resolutionDurations = resolvedRows.map((r) => (r.resolvedAt!.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000))
    const compliance = resolvedRows.length > 0 ? round2(((resolvedRows.length - exceededResolved) / resolvedRows.length) * 100) : 100

    return {
      compliance,
      breachCount: breachedOpen + exceededResolved,
      openBreached: breachedOpen,
      resolvedExceeded: exceededResolved,
      nearDeadline: approaching,
      withinSla: openRows.length - breachedOpen - approaching,
      openTotal: openRows.length,
      averageResponseHours: round2(meanOf(responseTimes)),
      averageResponseTime: formatDuration(meanOf(responseTimes) * 60 * 60 * 1000),
      averageResolutionHours: round2(meanOf(resolutionDurations)),
      averageResolutionTime: formatDuration(meanOf(resolutionDurations) * 60 * 60 * 1000),
      byPriority,
      total,
    }
  })
}

// ---------------------------------------------------------------------------
// Agent performance
// ---------------------------------------------------------------------------

export async function getAgentAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'agents', filters, ANALYTICS_TTL.agents, async () => {
    const { resolutionHours } = await getSlaHoursMap()
    const agents = await repo.agentRows(filters)
    const ids = agents.map((a) => a.id)

    const [statusAggs, resolvedRows, reopened, escalated, feedback] = await Promise.all([
      repo.agentStatusAggs(ids, filters),
      repo.agentResolvedRows(ids, filters),
      repo.agentReopenedCounts(ids, filters),
      repo.agentEscalatedCounts(ids, filters),
      repo.agentFeedbackAverages(ids, filters),
    ])

    const statusByAgent = new Map<string, Map<string, number>>()
    for (const agg of statusAggs) {
      const map = statusByAgent.get(agg.assignedToId) ?? new Map()
      map.set(agg.status, (map.get(agg.status) ?? 0) + agg.count)
      statusByAgent.set(agg.assignedToId, map)
    }

    const durationsByAgent = new Map<string, number[]>()
    for (const row of resolvedRows) {
      const list = durationsByAgent.get(row.assignedToId) ?? []
      list.push(row.resolvedAt!.getTime() - row.createdAt.getTime())
      durationsByAgent.set(row.assignedToId, list)
    }

    const rows = agents.map((agent) => {
      const status = statusByAgent.get(agent.id) ?? new Map<string, number>()
      const total = [...status.values()].reduce((a, b) => a + b, 0)
      const resolved = (status.get('RESOLVED') ?? 0) + (status.get('CLOSED') ?? 0)
      const pending = [...status.entries()].filter(([s]) => !TERMINAL_STATUSES.includes(s as never)).reduce((a, [, c]) => a + c, 0)
      const durations = durationsByAgent.get(agent.id) ?? []
      const withinSla = resolvedRows.filter(
        (r) => r.assignedToId === agent.id && r.resolvedAt!.getTime() - r.createdAt.getTime() <= resolutionHours[r.priority] * 60 * 60 * 1000,
      ).length

      const resolutionPerformance = resolved > 0 ? round2((resolved / Math.max(total, 1)) * 100) : 0
      const slaCompliance = durations.length > 0 ? round2((withinSla / durations.length) * 100) : 100
      const score = round2(
        resolutionPerformance * 0.3 +
          slaCompliance * 0.3 +
          (durations.length ? Math.max(0, 100 - round2(mean(durations) / (60 * 60 * 1000))) : 50) * 0.3 +
          (feedback.get(agent.id) ?? 4) * 10 * 0.1,
      )

      return {
        agentId: agent.id,
        agentName: agent.name,
        departmentId: agent.departmentId,
        departmentName: agent.departmentName,
        assigned: total,
        resolved,
        pending,
        escalated: escalated.get(agent.id) ?? 0,
        reopened: reopened.get(agent.id) ?? 0,
        averageResolutionHours: durations.length ? round2(mean(durations) / (60 * 60 * 1000)) : 0,
        averageResolutionTime: durations.length ? formatDuration(mean(durations)) : '0m',
        slaCompliance,
        customerRating: feedback.get(agent.id) ?? null,
        score,
      }
    })

    const leaderboard = [...rows].sort((a, b) => b.score - a.score)

    return {
      agents: rows,
      leaderboard: leaderboard.map((row, index) => ({ rank: index + 1, ...row })),
    }
  })
}

// ---------------------------------------------------------------------------
// Department analytics
// ---------------------------------------------------------------------------

export async function getDepartmentAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'departments', filters, ANALYTICS_TTL.departments, async () => {
    const { resolutionHours } = await getSlaHoursMap()
    const departments = await repo.departmentRows()
    const ids = departments.map((d) => d.id)

    const [statusAggs, resolvedRows, escalated] = await Promise.all([
      repo.departmentStatusAggs(ids, filters),
      repo.departmentResolvedRows(ids, filters),
      repo.departmentEscalatedCounts(ids, filters),
    ])

    const statusByDept = new Map<string, Map<string, number>>()
    for (const agg of statusAggs) {
      const map = statusByDept.get(agg.departmentId) ?? new Map()
      map.set(agg.status, (map.get(agg.status) ?? 0) + agg.count)
      statusByDept.set(agg.departmentId, map)
    }

    const durationsByDept = new Map<string, number[]>()
    for (const row of resolvedRows) {
      const list = durationsByDept.get(row.departmentId) ?? []
      list.push(row.resolvedAt!.getTime() - row.createdAt.getTime())
      durationsByDept.set(row.departmentId, list)
    }

    const rows = departments.map((dept) => {
      const status = statusByDept.get(dept.id) ?? new Map<string, number>()
      const total = [...status.values()].reduce((a, b) => a + b, 0)
      const resolved = (status.get('RESOLVED') ?? 0) + (status.get('CLOSED') ?? 0)
      const pending = [...status.entries()].filter(([s]) => !TERMINAL_STATUSES.includes(s as never)).reduce((a, [, c]) => a + c, 0)
      const durations = durationsByDept.get(dept.id) ?? []
      const withinSla = resolvedRows.filter(
        (r) => r.departmentId === dept.id && r.resolvedAt!.getTime() - r.createdAt.getTime() <= resolutionHours[r.priority] * 60 * 60 * 1000,
      ).length

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        total,
        pending,
        resolved,
        escalated: escalated.get(dept.id) ?? 0,
        resolutionRate: total > 0 ? round2((resolved / total) * 100) : 0,
        averageResolutionHours: durations.length ? round2(mean(durations) / (60 * 60 * 1000)) : 0,
        averageResolutionTime: durations.length ? formatDuration(mean(durations)) : '0m',
        slaCompliance: durations.length > 0 ? round2((withinSla / durations.length) * 100) : 100,
      }
    })

    return {
      departments: rows.sort((a, b) => b.total - a.total),
      total: rows.reduce((sum, r) => sum + r.total, 0),
    }
  })
}

// ---------------------------------------------------------------------------
// Location analytics
// ---------------------------------------------------------------------------

export async function getLocationAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'locations', filters, ANALYTICS_TTL.locations, async () => {
    const [counts, markers, total] = await Promise.all([
      repo.locationCounts(filters),
      repo.locationMarkers(filters),
      repo.countComplaints(filters),
    ])

    const { start, end } = windowFilters(filters)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))

    return {
      locations: counts,
      totalLocations: counts.length,
      complaintCount: total,
      densityPerDay: round2(total / days),
      markers,
    }
  })
}

// ---------------------------------------------------------------------------
// User analytics
// ---------------------------------------------------------------------------

export async function getUserAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'users', filters, ANALYTICS_TTL.users, async () => {
    const [summary, topComplainants] = await Promise.all([
      repo.userSummary(filters),
      repo.topComplainants(filters),
    ])
    return {
      totals: summary,
      topComplainants,
    }
  })
}

// ---------------------------------------------------------------------------
// ML analytics
// ---------------------------------------------------------------------------

export async function getMlAnalytics(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'ml', filters, ANALYTICS_TTL.ml, async () => {
    const [categoryDistribution, priorityDistribution, classified, total] = await Promise.all([
      repo.mlCategoryDistribution(filters),
      repo.mlPriorityDistribution(filters),
      repo.mlClassifiedCount(filters),
      repo.countComplaints(filters),
    ])

    return {
      classifiedCount: classified,
      total,
      coverage: total > 0 ? round2((classified / total) * 100) : 0,
      categoryDistribution,
      priorityDistribution,
      averageConfidence: Math.round(
        (categoryDistribution.reduce((sum, c) => sum + c.averageConfidence * c.count, 0) / Math.max(1, classified)) * 100,
      ) / 100,
      sentimentAvailable: false,
      metrics: await fetchMlModelInfo(),
    }
  })
}

async function fetchMlModelInfo(): Promise<Record<string, unknown> | null> {
  const baseUrl = env.ML_SERVICE_URL.trim()
  if (!baseUrl) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/model-info`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch (error) {
    logger.warn({ message: 'ML model-info unavailable', error: (error as Error).message })
    return null
  }
}

// ---------------------------------------------------------------------------
// Trend insights
// ---------------------------------------------------------------------------

export async function getTrendInsights(target: AnalyticsTarget): Promise<Record<string, unknown>> {
  const { filters } = target
  return analyticsRemember(target.scopeKey, 'insights', filters, ANALYTICS_TTL.insights, async () => {
    const { start, end } = windowFilters(filters)
    const span = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - span)
    const prevEnd = new Date(start.getTime() - 1)

    const current: AnalyticsFilters = { ...filters, startDate: start, endDate: end }
    const previous: AnalyticsFilters = { ...filters, startDate: prevStart, endDate: prevEnd }

    const [categoriesNow, categoriesPrev, openLocations, totalsNow, totalsPrev, criticalNow, criticalPrev] = await Promise.all([
      repo.countsByCategory(current),
      repo.countsByCategory(previous),
      repo.locationCounts({ ...current, statuses: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER'] }),
      repo.countComplaints(current),
      repo.countComplaints(previous),
      repo.countHighPriority({ ...current, priorities: ['CRITICAL'] }),
      repo.countHighPriority({ ...previous, priorities: ['CRITICAL'] }),
    ])

    const alerts: Array<{ severity: 'info' | 'warning' | 'critical'; message: string; key: string }> = []
    const nowCount = new Map(categoriesNow.map((c) => [c.category, c.count]))
    const prevCount = new Map(categoriesPrev.map((c) => [c.category, c.count]))

    for (const [category, count] of nowCount) {
      const before = prevCount.get(category) ?? 0
      if (before >= 3 && count >= 3) {
        const change = ((count - before) / before) * 100
        if (change >= 20) {
          alerts.push({
            severity: 'warning',
            key: `category-${category}`,
            message: `${category} complaints increased by ${Math.round(change)}% this period (${count} vs ${before}).`,
          })
        }
      }
    }

    const weeklyAvgPrev = Math.max(1, criticalPrev)
    if (criticalNow > weeklyAvgPrev * 1.5) {
      alerts.push({
        severity: 'critical',
        key: 'critical-burst',
        message: `Critical complaints (${criticalNow}) are above the previous period's level (${criticalPrev}).`,
      })
    }

    if (totalsNow > 0 && totalsPrev > 0 && totalsNow > totalsPrev * 1.5) {
      alerts.push({
        severity: 'warning',
        key: 'volume-spike',
        message: `Overall complaint volume rose by ${Math.round(((totalsNow - totalsPrev) / totalsPrev) * 100)}% this period.`,
      })
    }

    if (openLocations.length > 0) {
      const top = openLocations[0]
      alerts.push({
        severity: 'info',
        key: 'area-focus',
        message: `${top.location} has the highest number of unresolved complaints (${top.count}).`,
      })
    }

    return { alerts, period: { start: start.toISOString(), end: end.toISOString() } }
  })
}

// ---------------------------------------------------------------------------
// Export aggregation
// ---------------------------------------------------------------------------

export async function buildExportPayload(target: AnalyticsTarget, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
  const [overview, complaints, trends, categories, status, priority, resolution, sla, agents, departments, locations, generatedAt] =
    await Promise.all([
      getOverview(target),
      getComplaintStats(target),
      getTrends(target),
      getCategoryAnalytics(target),
      getStatusAnalytics(target),
      getPriorityAnalytics(target),
      getResolutionAnalytics(target),
      getSlaAnalytics(target),
      getAgentAnalytics(target),
      getDepartmentAnalytics(target),
      getLocationAnalytics(target),
      new Date().toISOString(),
    ])

  return {
    generatedAt,
    filters,
    overview,
    complaints,
    trends,
    categories,
    status,
    priority,
    resolution,
    sla,
    agents,
    departments,
    locations,
  }
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
}

export { meanOf }

void median