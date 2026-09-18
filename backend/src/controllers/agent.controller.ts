import type { Request, Response, NextFunction } from 'express'
import { getAgentDashboard } from '../services/agent.service'
import { sendSuccess } from '../utils/http'

export async function agentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await getAgentDashboard(req.user!.id)
    sendSuccess(res, 'Agent dashboard fetched', dashboard)
  } catch (error) {
    next(error)
  }
}