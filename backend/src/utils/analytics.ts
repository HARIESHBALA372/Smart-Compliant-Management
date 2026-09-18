import type { ComplaintStatus, Priority, Category } from '@prisma/client'

/**
 * Shared helpers for the Analytics module: query normalization, date-range
 * handling, trend bucketing and resolution/SLA math.
 */

export type TrendBucket = 'day' | 'week' | 'month' | 'year'

export interface AnalyticsFilters {
  startDate?: Date | null
  endDate?: Date | null
  statuses?: ComplaintStatus[]
  categories?: Category[]
  priorities?: Priority[]
  departmentId?: string
  agentId?: string
  location?: string
  /** Row-level scope: only complaints owned by this user (USER role). */
  userId?: string
  /** Row-level scope: only complaints assigned to this agent (STAFF w/o dept). */
  assignedToId?: string
}

export const STATUS_ORDER: ComplaintStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
]

export const PRIORITY_ORDER: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const TERMINAL_STATUSES: ComplaintStatus[] = ['RESOLVED', 'CLOSED', 'REJECTED']

export const OPEN_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
]

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  return !Number.isNaN(new Date(value).getTime())
}

export function isStatus(value: unknown): value is ComplaintStatus {
  return typeof value === 'string' && STATUS_ORDER.includes(value as ComplaintStatus)
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITY_ORDER.includes(value as Priority)
}

export function isCategory(value: unknown): value is Category {
  const categories: Category[] = ['WATER', 'ELECTRICITY', 'ROADS', 'SANITATION', 'TRANSPORT', 'SAFETY', 'OTHER']
  return typeof value === 'string' && categories.includes(value as Category)
}

/** Splits "A,B,C" query strings into a validated, de-duplicated array. */
export function splitList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(',').map((v) => v.trim()).filter(Boolean))]
}

/**
 * Parses the common analytics query parameters into a typed filter object.
 * Invalid enum values are silently dropped; invalid dates are ignored so the
 * dashboard never fails because of a stray filter parameter.
 */
export function parseAnalyticsFilters(query: Record<string, unknown>): AnalyticsFilters {
  const filters: AnalyticsFilters = {}

  if (isValidDate(query.startDate)) filters.startDate = new Date(query.startDate as string)
  if (isValidDate(query.endDate)) {
    const end = new Date(query.endDate as string)
    // Make endDate inclusive of the whole day.
    end.setHours(23, 59, 59, 999)
    filters.endDate = end
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    ;[filters.startDate, filters.endDate] = [filters.endDate, filters.startDate]
  }

  const statuses = splitList(query.status).filter(isStatus)
  if (statuses.length) filters.statuses = statuses as ComplaintStatus[]

  const categories = splitList(query.category).filter(isCategory)
  if (categories.length) filters.categories = categories as Category[]

  const priorities = splitList(query.priority).filter(isPriority)
  if (priorities.length) filters.priorities = priorities as Priority[]

  if (typeof query.department === 'string' && query.department) filters.departmentId = query.department
  if (typeof query.agent === 'string' && query.agent) filters.agentId = query.agent
  if (typeof query.location === 'string' && query.location.trim()) filters.location = query.location.trim()

  return filters
}

/** Chooses the SQL truncation bucket from the requested date span. */
export function trendBucketFor(start?: Date | null, end?: Date | null): TrendBucket {
  const from = start ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = end ?? new Date()
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)))
  if (days <= 35) return 'day'
  if (days <= 190) return 'week'
  if (days <= 760) return 'month'
  return 'year'
}

export function bucketKey(date: Date, bucket: TrendBucket): string {
  if (bucket === 'year') return `${date.getUTCFullYear()}`
  if (bucket === 'month') return date.toISOString().slice(0, 7)
  if (bucket === 'week') {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    return d.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function addMs(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function formatDuration(durationMs: number): string {
  const hours = durationMs / (60 * 60 * 1000)
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return addMs(durationMs)
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Mean of a number array (returns 0 for empty input). */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface ResolutionRow {
  createdAt: Date
  resolvedAt: Date | null
  priority: Priority
  closedAt?: Date | null
}

/**
 * Computes avg / min / max / median resolution duration (hours) plus the
 * count of rows that were resolved within their priority SLA.
 */
export function resolutionStats(rows: ResolutionRow[], slaHoursByPriority: Record<string, number>) {
  const durations = rows.map((row) => (row.resolvedAt!.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000))
  const withinSla = rows.filter((row) => {
    const limit = slaHoursByPriority[row.priority] ?? Infinity
    return row.resolvedAt!.getTime() - row.createdAt.getTime() <= limit * 60 * 60 * 1000
  }).length

  return {
    averageResolutionHours: round2(mean(durations)),
    minResolutionHours: durations.length ? round2(Math.min(...durations)) : 0,
    maxResolutionHours: durations.length ? round2(Math.max(...durations)) : 0,
    medianResolutionHours: round2(median(durations)),
    resolvedCount: rows.length,
    withinSla,
    exceededSla: rows.length - withinSla,
  }
}