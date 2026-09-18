import { Router } from 'express'
import { agentDashboard } from '../controllers/agent.controller'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

router.use(authenticate, authorize('STAFF'))

router.get('/dashboard', agentDashboard)

export default router