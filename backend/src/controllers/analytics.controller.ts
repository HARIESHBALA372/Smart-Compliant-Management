import type { NextFunction, Request, Response } from 'express'
import { AuthUser } from '../types'
import { sendSuccess } from '../utils/http'
import { parseFiltersQuery, parseExportQuery } from '../validators/analytics.validator'
import { resolveAnalyticsTarget } from '../services/analytics-access.service'
import {
  buildExportPayload,
  getAgentAnalytics,
  getCategoryAnalytics,
  getComplaintStats,
  getDepartmentAnalytics,
  getLocationAnalytics,
  getMlAnalytics,
  getOverview,
  getPriorityAnalytics,
  getResolutionAnalytics,
  getSlaAnalytics,
  getStatusAnalytics,
  getTrendInsights,
  getTrends,
  getUserAnalytics,
} from '../services/analytics.service'
import {
  buildSheets,
  exportFilename,
  renderCsv,
  renderPdf,
  renderSpreadsheet,
} from '../services/export.service'

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<void>

function userOf(req: Request): AuthUser {
  return req.user as AuthUser
}

function wrap(handler: (target: Awaited<ReturnType<typeof resolveAnalyticsTarget>>) => Promise<unknown>): AsyncController {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = userOf(req)
      const filters = parseFiltersQuery(req.query as Record<string, unknown>)
      const target = await resolveAnalyticsTarget(user, filters)
      const data = await handler(target)
      sendSuccess(res, 'Analytics fetched', data)
    } catch (error) {
      next(error)
    }
  }
}

export const overview = wrap((target) => getOverview(target))
export const complaints = wrap((target) => getComplaintStats(target))
export const trends = wrap((target) => getTrends(target))
export const categories = wrap((target) => getCategoryAnalytics(target))
export const status = wrap((target) => getStatusAnalytics(target))
export const priority = wrap((target) => getPriorityAnalytics(target))
export const resolution = wrap((target) => getResolutionAnalytics(target))
export const sla = wrap((target) => getSlaAnalytics(target))
export const agents = wrap((target) => getAgentAnalytics(target))
export const departments = wrap((target) => getDepartmentAnalytics(target))
export const locations = wrap((target) => getLocationAnalytics(target))
export const users = wrap((target) => getUserAnalytics(target))
export const ml = wrap((target) => getMlAnalytics(target))
export const insights = wrap((target) => getTrendInsights(target))

/** Streams a report as CSV, Excel (.xls) or PDF, scoped to the caller. */
export async function exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userOf(req)
    const filters = parseFiltersQuery(req.query as Record<string, unknown>)
    const target = await resolveAnalyticsTarget(user, filters)
    const parsed = parseExportQuery(req.query as Record<string, unknown>)
    const { format, section } = parsed

    if (format === 'xlsx') {
      const payload = await buildExportPayload(target, {})
      const sheets = buildSheets(payload, section?.join(','))
      const buffer = Buffer.from(renderSpreadsheet(sheets), 'latin1')
      res.setHeader('Content-Type', 'application/vnd.ms-excel')
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(section?.[0], format)}"`)
      res.send(buffer)
      return
    }

    if (format === 'pdf') {
      const payload = await buildExportPayload(target, {})
      const { buffer } = renderPdf(payload)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(section?.[0], format)}"`)
      res.send(buffer)
      return
    }

    // CSV: a single section table (default: agents).
    const payload = await buildExportPayload(target, {})
    const sheets = buildSheets(payload, section?.join(',') ?? 'agents')
    const csv = sheets[0] ? renderCsv(sheets[0]) : 'No data'
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(section?.[0], 'csv')}"`)
    res.send(Buffer.from('\uFEFF' + csv, 'utf8'))
  } catch (error) {
    next(error)
  }
}

/** Returns the list of exportable sections (for the UI dropdown). */
export async function exportSections(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, 'Export sections fetched', [
      { id: 'overview', label: 'KPI Overview' },
      { id: 'complaints', label: 'Complaints Breakdown' },
      { id: 'trends', label: 'Volume Trend' },
      { id: 'agents', label: 'Agent Performance' },
      { id: 'departments', label: 'Department Performance' },
      { id: 'locations', label: 'Location Analysis' },
      { id: 'resolution', label: 'Resolution Analytics' },
      { id: 'sla', label: 'SLA Analytics' },
    ])
  } catch (error) {
    next(error)
  }
}