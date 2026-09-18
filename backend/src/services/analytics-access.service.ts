import type { Priority, Role } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { AnalyticsFilters } from '../utils/analytics'
import { SLA_HOURS_BY_PRIORITY } from '../utils/http'

/**
 * Role-based scope resolution for analytics.
 *
 * Admins see everything. STAFF members are pinned to their own department (or,
 * when they don't belong to one, to the complaints assigned to them) and may
 * narrow a report to themselves but never to another agent. Regular users only
 * ever see statistics about complaints they submitted.
 *
 * All scope constraints are merged into the shared `AnalyticsFilters` object
 * before any query runs, so a forged `?agent=`/`?department=` parameter can
 * never widen a caller's view.
 */

export interface AnalyticsTarget {
  scopeKey: string
  filters: AnalyticsFilters
}

const ERR_SCOPE = 'You are not allowed to view analytics for that scope'

export async function resolveAnalyticsTarget(
  user: { id: string; role: Role },
  incoming: AnalyticsFilters,
  opts: { requireStaff?: boolean } = {},
): Promise<AnalyticsTarget> {
  const filters: AnalyticsFilters = { ...incoming }

  if (user.role === 'ADMIN') {
    return { scopeKey: 'admin', filters }
  }

  if (incoming.departmentId && incoming.departmentId !== (await staffDepartment(user.id))) {
    throw new ApiError(403, ERR_SCOPE)
  }

  if (user.role === 'STAFF') {
    const departmentId = await staffDepartment(user.id)
    if (opts.requireStaff) {
      if (incoming.agentId && incoming.agentId !== user.id) {
        throw new ApiError(403, ERR_SCOPE)
      }
      filters.agentId = incoming.agentId ?? user.id
      filters.departmentId = departmentId ?? undefined
      return { scopeKey: `staff:${user.id}`, filters }
    }
    // Department-scoped analytics (default for agents/managers).
    if (departmentId) {
      if (incoming.agentId && incoming.agentId !== user.id) {
        throw new ApiError(403, ERR_SCOPE)
      }
      if (departmentId) filters.departmentId = departmentId
      return { scopeKey: `department:${departmentId}`, filters }
    }
    // Agents without a department only see their own work.
    filters.assignedToId = user.id
    return { scopeKey: `own:${user.id}`, filters }
  }

  // Regular USER: their own complaints only.
  if (
    incoming.userId !== undefined ||
    incoming.agentId !== undefined ||
    incoming.departmentId !== undefined
  ) {
    throw new ApiError(403, ERR_SCOPE)
  }
  filters.userId = user.id
  return { scopeKey: `user:${user.id}`, filters }
}

async function staffDepartment(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } })
  return user?.departmentId ?? null
}

export interface SlaHoursMap {
  responseHours: Record<string, number>
  resolutionHours: Record<string, number>
}

/** Resolution/response SLA limits per priority (DB rules with enum defaults). */
export async function getSlaHoursMap(): Promise<SlaHoursMap> {
  const rules = await prisma.slaRule.findMany()
  const map = new Map(rules.map((rule) => [rule.priority, rule]))

  const responseHours: Record<string, number> = {}
  const resolutionHours: Record<string, number> = {}
  for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]) {
    const rule = map.get(priority)
    responseHours[priority] = rule?.responseHours ?? DEFAULT_RESPONSE_HOURS[priority]
    resolutionHours[priority] = rule?.resolutionHours ?? SLA_HOURS_BY_PRIORITY[priority]
  }
  return { responseHours, resolutionHours }
}

const DEFAULT_RESPONSE_HOURS: Record<string, number> = {
  LOW: 24,
  MEDIUM: 12,
  HIGH: 4,
  CRITICAL: 1,
}

export type { Priority }