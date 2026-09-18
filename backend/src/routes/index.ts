import { Router } from 'express'
import { Request, Response } from 'express'
import { sendSuccess } from '../utils/http'
import { prisma } from '../config/database'
import { pingRedis } from '../config/redis'
import authRoutes from './auth.routes'
import complaintRoutes from './complaint.routes'
import notificationRoutes from './notification.routes'
import feedbackRoutes from './feedback.routes'
import departmentRoutes from './department.routes'
import adminRoutes from './admin.routes'
import dashboardRoutes from './dashboard.routes'
import analyticsRoutes from './analytics.routes'
import agentRoutes from './agent.routes'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, 'Service is healthy', {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

router.get('/health/database', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    sendSuccess(res, 'Database is healthy', { status: 'ok' })
  } catch {
    res.status(503).json({ success: false, message: 'Database is unreachable' })
  }
})

router.get('/health/redis', async (_req: Request, res: Response) => {
  try {
    const ok = await pingRedis()
    if (ok) {
      sendSuccess(res, 'Redis is healthy', { status: 'ok' })
    } else {
      res.status(503).json({ success: false, message: 'Redis is unreachable or disabled' })
    }
  } catch {
    res.status(503).json({ success: false, message: 'Redis is unreachable or disabled' })
  }
})

router.use('/auth', authRoutes)
router.use('/complaints', complaintRoutes)
router.use('/notifications', notificationRoutes)
router.use('/feedback', feedbackRoutes)
router.use('/departments', departmentRoutes)
router.use('/admin', adminRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/agent', agentRoutes)

export default router