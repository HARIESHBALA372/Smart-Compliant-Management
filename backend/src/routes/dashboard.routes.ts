import { Router } from 'express'
import { summary, overdue } from '../controllers/dashboard.controller'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, authorize('ADMIN', 'STAFF'), summary)
router.get('/overdue', authenticate, authorize('ADMIN'), overdue)

export default router