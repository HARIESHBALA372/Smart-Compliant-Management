import type { Priority } from '@prisma/client'
import { prisma } from '../config/database'
import { SLA_HOURS_BY_PRIORITY } from '../utils/http'

/**
 * DB-backed SLA configuration per priority. When no SlaRule row exists for a
 * priority the API falls back to the hard-coded defaults so the system keeps
 * working for a fresh database (seeded or not).
 */

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const DEFAULT_RESPONSE_HOURS: Record<string, number> = {
  LOW: 24,
  MEDIUM: 12,
  HIGH: 4,
  CRITICAL: 1,
}

export interface SlaEntry {
  id?: string
  priority: string
  responseHours?: number
  resolutionHours?: number
  isActive?: boolean
}

export async function getSlaRules() {
  const rules = await prisma.slaRule.findMany({ orderBy: { priority: 'asc' } })
  const byPriority = new Map(rules.map((rule) => [rule.priority, rule]))

  return PRIORITIES.map((priority, index) => {
    const rule = byPriority.get(priority)
    return {
      id: rule?.id ?? String(index + 1),
      priority,
      responseHours: rule ? rule.responseHours : DEFAULT_RESPONSE_HOURS[priority],
      resolutionHours: rule ? rule.resolutionHours : SLA_HOURS_BY_PRIORITY[priority],
      isActive: rule ? rule.isActive : true,
    }
  })
}

/**
 * Upserts SLA entries. Entries not present in `entries` are left untouched,
 * so a partial update (single priority) keeps the other priorities intact.
 */
export async function upsertSlaRules(entries: SlaEntry[]) {
  for (const entry of entries) {
    const priority = String(entry.priority).toUpperCase() as Priority
    if (!PRIORITIES.includes(priority)) continue

    const existing = await prisma.slaRule.findUnique({ where: { priority } })
    if (existing) {
      await prisma.slaRule.update({
        where: { priority },
        data: {
          responseHours: entry.responseHours != null ? Number(entry.responseHours) : undefined,
          resolutionHours: entry.resolutionHours != null ? Number(entry.resolutionHours) : undefined,
          isActive: entry.isActive,
        },
      })
    } else {
      await prisma.slaRule.create({
        data: {
          priority,
          responseHours: Number(entry.responseHours ?? DEFAULT_RESPONSE_HOURS[priority]),
          resolutionHours: Number(entry.resolutionHours ?? SLA_HOURS_BY_PRIORITY[priority]),
          isActive: entry.isActive ?? true,
        },
      })
    }
  }

  return getSlaRules()
}

/** Resolution SLAs in hours for a priority (DB value or fallback default). */
export async function resolutionHoursFor(priority: Priority): Promise<number> {
  const rule = await prisma.slaRule.findUnique({ where: { priority } })
  return rule?.resolutionHours ?? SLA_HOURS_BY_PRIORITY[priority]
}

/** Deadline = start + SLA resolution hours. */
export function slaDeadlineFor(priority: Priority, start: Date = new Date(), hours?: number): Date {
  const h = hours ?? SLA_HOURS_BY_PRIORITY[priority]
  return new Date(start.getTime() + h * 60 * 60 * 1000)
}