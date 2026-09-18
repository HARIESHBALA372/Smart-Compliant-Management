import type { Category, ComplaintStatus, Priority } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'

const joinSegments = (segments: Prisma.Sql[]): Prisma.Sql => (segments.length ? Prisma.join(segments) : Prisma.empty)
import {
  AnalyticsFilters,
  OPEN_STATUSES,
  TERMINAL_STATUSES,
  bucketKey,
  trendBucketFor,
} from '../utils/analytics'

/**
 * Aggregation layer for the Analytics module.
 *
 * Every query is executed against PostgreSQL (groupBy / $queryRaw) so the
 * dashboard never pulls the whole table into application memory. Filters are
 * enforced via the shared `complaintWhere` / `whereSegments` builders, which
 * keeps the SQL parameterized and the scope rules identical across endpoints.
 */

export function complaintWhere(filters: AnalyticsFilters): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {}
  if (filters.startDate || filters.endDate) {
    where.createdAt = { gte: filters.startDate ?? undefined, lte: filters.endDate ?? undefined }
  }
  if (filters.statuses && filters.statuses.length) where.status = { in: filters.statuses }
  if (filters.categories && filters.categories.length) where.category = { in: filters.categories }
  if (filters.priorities && filters.priorities.length) where.priority = { in: filters.priorities }
  if (filters.departmentId) where.departmentId = filters.departmentId
  if (filters.agentId) where.assignedToId = filters.agentId
  if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' }
  if (filters.userId) where.userId = filters.userId
  if (filters.assignedToId) where.assignedToId = filters.assignedToId
  return where
}

/** SQL `AND ...` fragments for the same filters (used by $queryRaw). */
export function whereSegments(filters: AnalyticsFilters): Prisma.Sql[] {
  const segments: Prisma.Sql[] = []
  if (filters.startDate) segments.push(Prisma.sql`AND "createdAt" >= ${filters.startDate}`)
  if (filters.endDate) segments.push(Prisma.sql`AND "createdAt" <= ${filters.endDate}`)
  if (filters.statuses && filters.statuses.length) {
    segments.push(Prisma.sql`AND "status"::text IN (${Prisma.join(filters.statuses)})`)
  }
  if (filters.categories && filters.categories.length) {
    segments.push(Prisma.sql`AND "category"::text IN (${Prisma.join(filters.categories)})`)
  }
  if (filters.priorities && filters.priorities.length) {
    segments.push(Prisma.sql`AND "priority"::text IN (${Prisma.join(filters.priorities)})`)
  }
  if (filters.departmentId) segments.push(Prisma.sql`AND "departmentId" = ${filters.departmentId}`)
  if (filters.agentId) segments.push(Prisma.sql`AND "assignedToId" = ${filters.agentId}`)
  if (filters.userId) segments.push(Prisma.sql`AND "userId" = ${filters.userId}`)
  if (filters.assignedToId) segments.push(Prisma.sql`AND "assignedToId" = ${filters.assignedToId}`)
  if (filters.location) {
    segments.push(Prisma.sql`AND "location" ILIKE ${`%${filters.location}%`}`)
  }
  return segments
}

// ---------------------------------------------------------------------------
// KPI counts
// ---------------------------------------------------------------------------

export async function countComplaints(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({ where: complaintWhere(filters) })
}

export async function countOpenComplaints(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), status: { in: [...OPEN_STATUSES] } },
  })
}

export async function countInProgress(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), status: 'IN_PROGRESS' },
  })
}

export async function countResolved(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), status: { in: ['RESOLVED', 'CLOSED'] } },
  })
}

export async function countClosed(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), status: 'CLOSED' },
  })
}

export async function countEscalated(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), escalations: { some: {} } },
  })
}

export async function countReopened(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), reopenedAt: { not: null } },
  })
}

export async function countHighPriority(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({
    where: { ...complaintWhere(filters), priority: { in: ['HIGH', 'CRITICAL'] } },
  })
}

export interface StatusCount {
  status: ComplaintStatus
  count: number
}

export async function countsByStatus(filters: AnalyticsFilters): Promise<StatusCount[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: complaintWhere(filters),
  })
  return rows.map((row) => ({ status: row.status, count: row._count._all }))
}

export interface CategoryCount {
  category: Category
  count: number
}

export async function countsByCategory(filters: AnalyticsFilters): Promise<CategoryCount[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['category'],
    _count: { _all: true },
    where: complaintWhere(filters),
  })
  return rows.map((row) => ({ category: row.category, count: row._count._all }))
}

export interface PriorityCount {
  priority: Priority
  count: number
}

export async function countsByPriority(filters: AnalyticsFilters): Promise<PriorityCount[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['priority'],
    _count: { _all: true },
    where: complaintWhere(filters),
  })
  return rows.map((row) => ({ priority: row.priority, count: row._count._all }))
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export interface TrendPoint {
  bucket: string
  count: number
}

/** Complaint volume bucketed by day/week/month/year using DB aggregation. */
export async function trendSeries(filters: AnalyticsFilters): Promise<TrendPoint[]> {
  const bucket = trendBucketFor(filters.startDate, filters.endDate)
  const segments = whereSegments(filters)
  const rows = (await prisma.$queryRaw`
    SELECT
      to_char(date_trunc(${bucket}, "createdAt"), 'YYYY-MM-DD') AS bucket,
      COUNT(*)::int AS count
    FROM "Complaint"
    WHERE 1 = 1
    ${joinSegments(segments)}
    GROUP BY 1
    ORDER BY 1
  `) as Array<{ bucket: string; count: number }>
  return rows
}

/** Average resolution duration (hours) over time for resolved complaints. */
export async function resolutionTrendSeries(filters: AnalyticsFilters) {
  const bucket = trendBucketFor(filters.startDate, filters.endDate)
  const segments = whereSegments({
    ...filters,
    statuses: ['RESOLVED', 'CLOSED'],
  })
  const dateFilter = filters.startDate || filters.endDate
    ? Prisma.sql`AND "resolvedAt" >= ${filters.startDate ?? new Date(0)} AND "resolvedAt" <= ${filters.endDate ?? new Date()}`
    : Prisma.empty

  const rows = (await prisma.$queryRaw`
    SELECT
      to_char(date_trunc(${bucket}, "resolvedAt"), 'YYYY-MM-DD') AS bucket,
      AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0)::float AS avg_hours,
      COUNT(*)::int AS count
    FROM "Complaint"
    WHERE "resolvedAt" IS NOT NULL
    ${joinSegments(segments)}
    ${dateFilter}
    GROUP BY 1
    ORDER BY 1
  `) as Array<{ bucket: string; avg_hours: number; count: number }>

  return rows.map((row) => ({
    bucket: normalizeBucket(row.bucket, bucket),
    averageResolutionHours: Math.round(row.avg_hours * 100) / 100,
    count: row.count,
  }))
}

function normalizeBucket(bucket: string, kind: 'day' | 'week' | 'month' | 'year'): string {
  if (kind === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(bucket)) return bucket
  if (kind === 'week' && /^\d{4}-\d{2}-\d{2}$/.test(bucket)) return bucket
  return bucket
}

/** Produces a zero-filled series between start and end for clean charts. */
export async function fillTrend(trend: TrendPoint[], start: Date, end: Date): Promise<TrendPoint[]> {
  const bucket = trendBucketFor(start, end)
  const map = new Map(trend.map((t) => [t.bucket, t.count]))
  const out: TrendPoint[] = []
  const cursor = new Date(start)
  const endTime = end.getTime()

  let guard = 0
  while (cursor.getTime() <= endTime && guard < 4000) {
    guard += 1
    const key = bucketKey(cursor, bucket)
    out.push({ bucket: key, count: map.get(key) ?? 0 })
    if (bucket === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1)
    else if (bucket === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7)
    else if (bucket === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1)
  }
  return out
}

// ---------------------------------------------------------------------------
// Resolution + response
// ---------------------------------------------------------------------------

export interface ResolvedComplaintRow {
  createdAt: Date
  resolvedAt: Date | null
  priority: Priority
}

export async function resolvedRows(filters: AnalyticsFilters): Promise<ResolvedComplaintRow[]> {
  return prisma.complaint.findMany({
    where: { ...complaintWhere(filters), resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true, priority: true },
  })
}

export interface ResponseRow {
  createdAt: Date
  assignedAt: Date | null
  firstUpdateAt: Date | null
}

export async function responseRows(filters: AnalyticsFilters): Promise<ResponseRow[]> {
  const complaints = await prisma.complaint.findMany({
    where: {
      ...complaintWhere(filters),
      OR: [{ assignedAt: { not: null } }, { updates: { some: {} } }],
    },
    select: {
      createdAt: true,
      assignedAt: true,
      updates: { select: { createdAt: true }, take: 1, orderBy: { createdAt: 'asc' } },
    },
  })
  return complaints.map((c) => ({
    createdAt: c.createdAt,
    assignedAt: c.assignedAt,
    firstUpdateAt: c.updates[0]?.createdAt ?? null,
  }))
}

export interface CurrentSlaRow {
  createdAt: Date
  status: ComplaintStatus
  priority: Priority
}

export async function openComplaintRows(filters: AnalyticsFilters): Promise<CurrentSlaRow[]> {
  return prisma.complaint.findMany({
    where: { ...complaintWhere(filters), status: { in: [...OPEN_STATUSES] } },
    select: { createdAt: true, status: true, priority: true },
  })
}

export interface AvgRatingRow {
  complaintId: string
  rating: number
}

export async function feedbackRows(filters: AnalyticsFilters): Promise<AvgRatingRow[]> {
  const rows = await prisma.feedback.findMany({
    where: { complaint: complaintWhere(filters) },
    select: { complaintId: true, rating: true },
  })
  return rows
}

// ---------------------------------------------------------------------------
// Agents / departments / locations / users / ML
// ---------------------------------------------------------------------------

export interface AgentWorkloadRow {
  id: string
  name: string
  departmentId: string | null
  departmentName: string | null
}

export async function agentRows(filters: AnalyticsFilters): Promise<AgentWorkloadRow[]> {
  const staff = await prisma.user.findMany({
    where: {
      role: 'STAFF',
      isActive: true,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })
  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    departmentId: s.departmentId,
    departmentName: s.department?.name ?? null,
  }))
}

export interface AgentComplaintAgg {
  assignedToId: string
  status: ComplaintStatus
  count: number
}

export async function agentStatusAggs(agentIds: string[], filters: AnalyticsFilters): Promise<AgentComplaintAgg[]> {
  if (agentIds.length === 0) return []
  const rows = await prisma.complaint.groupBy({
    by: ['assignedToId', 'status'],
    where: { ...complaintWhere(filters), assignedToId: { in: agentIds } },
    _count: { _all: true },
  })
  return rows.map((row) => ({
    assignedToId: row.assignedToId!,
    status: row.status,
    count: row._count._all,
  }))
}

export interface AgentDetailRow extends ResolvedComplaintRow {
  assignedToId: string
}

export async function agentResolvedRows(agentIds: string[], filters: AnalyticsFilters): Promise<AgentDetailRow[]> {
  if (agentIds.length === 0) return []
  const rows = await prisma.complaint.findMany({
    where: { ...complaintWhere(filters), resolvedAt: { not: null }, assignedToId: { in: agentIds } },
    select: { createdAt: true, resolvedAt: true, priority: true, assignedToId: true },
  })
  return rows.map((row) => ({ createdAt: row.createdAt, resolvedAt: row.resolvedAt, priority: row.priority, assignedToId: row.assignedToId ?? '' }))
}

export async function agentReopenedCounts(agentIds: string[], filters: AnalyticsFilters): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map()
  const rows = await prisma.complaint.groupBy({
    by: ['assignedToId'],
    where: { ...complaintWhere(filters), reopenedAt: { not: null }, assignedToId: { in: agentIds } },
    _count: { _all: true },
  })
  return new Map(rows.filter((r) => r.assignedToId).map((r) => [r.assignedToId!, r._count._all]))
}

export async function agentEscalatedCounts(agentIds: string[], filters: AnalyticsFilters): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map()
  const rows = await prisma.complaint.findMany({
    where: { ...complaintWhere(filters), escalations: { some: {} }, assignedToId: { in: agentIds } },
    select: { assignedToId: true },
  })
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!row.assignedToId) continue
    map.set(row.assignedToId, (map.get(row.assignedToId) ?? 0) + 1)
  }
  return map
}

export async function agentFeedbackAverages(agentIds: string[], filters: AnalyticsFilters): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map()
  const rows = await prisma.feedback.findMany({
    where: {
      complaint: { ...complaintWhere(filters), assignedToId: { in: agentIds } },
    },
    select: { rating: true, complaint: { select: { assignedToId: true } } },
  })
  const totals = new Map<string, { sum: number; count: number }>()
  for (const row of rows) {
    const id = row.complaint?.assignedToId
    if (!id) continue
    const acc = totals.get(id) ?? { sum: 0, count: 0 }
    acc.sum += row.rating
    acc.count += 1
    totals.set(id, acc)
  }
  const map = new Map<string, number>()
  for (const [id, acc] of totals) map.set(id, Math.round((acc.sum / acc.count) * 10) / 10)
  return map
}

export interface DepartmentRow {
  id: string
  name: string
}

export async function departmentRows(): Promise<DepartmentRow[]> {
  return prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export interface DepartmentAgg {
  departmentId: string
  status: ComplaintStatus
  count: number
}

export async function departmentStatusAggs(departmentIds: string[], filters: AnalyticsFilters): Promise<DepartmentAgg[]> {
  if (departmentIds.length === 0) return []
  const rows = await prisma.complaint.groupBy({
    by: ['departmentId', 'status'],
    where: { ...complaintWhere(filters), departmentId: { in: departmentIds } },
    _count: { _all: true },
  })
  return rows.map((row) => ({ departmentId: row.departmentId!, status: row.status, count: row._count._all }))
}

export async function departmentResolvedRows(departmentIds: string[], filters: AnalyticsFilters): Promise<Array<ResolvedComplaintRow & { departmentId: string }>> {
  if (departmentIds.length === 0) return []
  const rows = await prisma.complaint.findMany({
    where: { ...complaintWhere(filters), resolvedAt: { not: null }, departmentId: { in: departmentIds } },
    select: { createdAt: true, resolvedAt: true, priority: true, departmentId: true },
  })
  return rows.map((row) => ({ createdAt: row.createdAt, resolvedAt: row.resolvedAt, priority: row.priority, departmentId: row.departmentId ?? '' }))
}

export async function departmentEscalatedCounts(departmentIds: string[], filters: AnalyticsFilters): Promise<Map<string, number>> {
  if (departmentIds.length === 0) return new Map()
  const rows = await prisma.complaint.findMany({
    where: { ...complaintWhere(filters), escalations: { some: {} }, departmentId: { in: departmentIds } },
    select: { departmentId: true },
  })
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!row.departmentId) continue
    map.set(row.departmentId, (map.get(row.departmentId) ?? 0) + 1)
  }
  return map
}

export interface LocationMarker {
  complaintNumber: string
  title: string
  status: ComplaintStatus
  priority: Priority
  latitude: number
  longitude: number
  createdAt: Date
}

export async function locationCounts(filters: AnalyticsFilters): Promise<Array<{ location: string; count: number }>> {
  const rows = await prisma.complaint.groupBy({
    by: ['location'],
    _count: { _all: true },
    where: {
      ...complaintWhere(filters),
      location: { not: null },
    },
  })
  return rows
    .filter((row) => row.location)
    .map((row) => ({ location: row.location as string, count: row._count._all }))
    .sort((a, b) => b.count - a.count)
}

export async function locationMarkers(filters: AnalyticsFilters, limit = 500): Promise<LocationMarker[]> {
  return prisma.complaint.findMany({
    where: { ...complaintWhere(filters), latitude: { not: null }, longitude: { not: null } },
    select: {
      complaintNumber: true,
      title: true,
      status: true,
      priority: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  }) as Promise<LocationMarker[]>
}

export interface UserSummary {
  totalUsers: number
  activeUsers: number
  newUsers: number
  complaintsSubmitted: number
  averageComplaintsPerUser: number
  repeatComplainants: number
}

export async function userSummary(filters: AnalyticsFilters): Promise<UserSummary> {
  const [totalUsers, activeUsers, newUsers, submitted] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: filters.startDate ?? undefined, lte: filters.endDate ?? undefined } } }),
    prisma.complaint.count({ where: complaintWhere(filters) }),
  ])
  const perUser = await prisma.complaint.groupBy({
    by: ['userId'],
    _count: { _all: true },
    where: complaintWhere(filters),
  })
  const repeat = perUser.filter((row) => row._count._all >= 2).length
  const complainants = perUser.length

  return {
    totalUsers,
    activeUsers,
    newUsers,
    complaintsSubmitted: submitted,
    averageComplaintsPerUser:
      complainants > 0 ? Math.round((submitted / complainants) * 100) / 100 : 0,
    repeatComplainants: repeat,
  }
}

export interface TopComplaintUser {
  userId: string
  name: string
  complaints: number
}

export async function topComplainants(filters: AnalyticsFilters, limit = 10): Promise<TopComplaintUser[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['userId'],
    _count: { _all: true },
    where: complaintWhere(filters),
    orderBy: { _count: { userId: 'desc' } },
    take: limit,
  })
  const ids = rows.map((r) => r.userId)
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  const nameById = new Map(users.map((u) => [u.id, u.name]))
  return rows.map((row) => ({
    userId: row.userId,
    name: nameById.get(row.userId) ?? 'Unknown',
    complaints: row._count._all,
  }))
}

export interface MlDistribution {
  label: string
  count: number
  averageConfidence: number
}

export async function mlCategoryDistribution(filters: AnalyticsFilters): Promise<MlDistribution[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['aiCategory'],
    _count: { _all: true },
    _avg: { aiConfidence: true },
    where: { ...complaintWhere(filters), aiCategory: { not: null } },
  })
  return rows
    .filter((row) => row.aiCategory)
    .map((row) => ({
      label: row.aiCategory as Category,
      count: row._count._all,
      averageConfidence: Math.round((row._avg.aiConfidence ?? 0) * 100) / 100,
    }))
}

export async function mlPriorityDistribution(filters: AnalyticsFilters): Promise<MlDistribution[]> {
  const rows = await prisma.complaint.groupBy({
    by: ['aiPriority'],
    _count: { _all: true },
    where: { ...complaintWhere(filters), aiPriority: { not: null } },
  })
  return rows
    .filter((row) => row.aiPriority)
    .map((row) => ({ label: row.aiPriority as Priority, count: row._count._all, averageConfidence: 0 }))
}

export async function mlClassifiedCount(filters: AnalyticsFilters): Promise<number> {
  return prisma.complaint.count({ where: { ...complaintWhere(filters), aiCategory: { not: null } } })
}