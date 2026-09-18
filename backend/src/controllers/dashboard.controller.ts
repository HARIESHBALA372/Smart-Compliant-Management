import type { Request, Response, NextFunction } from 'express'
import {
  getDashboardSummary,
  getDepartmentStats,
  getAnalytics,
  getAgentPerformance,
  listOverdueComplaints,
} from '../services/dashboard.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../middleware/validation'

export async function summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDashboardSummary()
    sendSuccess(res, 'Dashboard summary fetched', data)
  } catch (error) {
    next(error)
  }
}

export async function departmentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDepartmentStats(req.params.id)
    sendSuccess(res, 'Department statistics fetched', data)
  } catch (error) {
    next(error)
  }
}

export async function analytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getAnalytics(req.query.startDate as string | undefined, req.query.endDate as string | undefined)
    sendSuccess(res, 'Analytics fetched', data)
  } catch (error) {
    next(error)
  }
}

export async function agentPerformance(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getAgentPerformance()
    sendSuccess(res, 'Agent performance fetched', data)
  } catch (error) {
    next(error)
  }
}

export async function overdue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listOverdueComplaints(page, limit)
    sendSuccess(res, 'Overdue complaints fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}