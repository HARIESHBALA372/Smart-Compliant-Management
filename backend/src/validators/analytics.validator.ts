import { z } from 'zod'
import {
  isCategory,
  isPriority,
  isValidDate,
  isStatus,
  AnalyticsFilters,
  parseAnalyticsFilters,
  splitList,
} from '../utils/analytics'

/**
 * Request-level validation for the analytics API. Query filters are parsed
 * leniently (invalid enums/dates are dropped rather than rejected) so the
 * dashboard stays resilient, while the export format/section are validated
 * strictly.
 */

const FORMATS = ['csv', 'xlsx', 'pdf'] as const
export type ExportFormat = (typeof FORMATS)[number]

export const exportQuerySchema = z.object({
  format: z.enum(FORMATS).default('csv'),
  section: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
})

/** Parses the export query params, defaulting format to CSV. */
export function parseExportQuery(
  query: Record<string, unknown>,
): { format: ExportFormat; section: string[] | undefined } {
  const result = exportQuerySchema.safeParse({
    format: typeof query.format === 'string' ? query.format : 'csv',
    section: typeof query.section === 'string' ? query.section : undefined,
  })
  if (!result.success) return { format: 'csv', section: undefined }
  const { format, section } = result.data
  return { format, section: section ?? undefined }
}

export const insightsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

/** Parses & validates common analytics query filters. */
export function parseFiltersQuery(query: Record<string, unknown>): AnalyticsFilters {
  const filters = parseAnalyticsFilters(query)

  if (typeof query.department === 'string' && query.department) {
    const list = splitList(query.department)
    if (list.length === 1) filters.departmentId = list[0]
  }
  if (typeof query.agent === 'string' && query.agent) {
    const list = splitList(query.agent)
    if (list.length === 1) filters.agentId = list[0]
  }

  // Strict re-validation happens at the access layer (scope enforcement).
  return filters
}

export { isStatus, isCategory, isPriority, isValidDate }