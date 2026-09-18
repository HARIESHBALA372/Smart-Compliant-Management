import { Router } from 'express'
import {
  agents,
  categories,
  complaints,
  departments,
  exportReport,
  exportSections,
  insights,
  locations,
  ml,
  overview,
  priority,
  resolution,
  sla,
  status,
  trends,
  users,
} from '../controllers/analytics.controller'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// Admin + staff can view analytics (scope is enforced per role).
router.get('/sections', authenticate, authorize('ADMIN', 'STAFF'), exportSections)
router.get('/export', authenticate, authorize('ADMIN', 'STAFF'), exportReport)

router.use(authenticate, authorize('ADMIN', 'STAFF'))

router.get('/overview', overview)
router.get('/complaints', complaints)
router.get('/trends', trends)
router.get('/categories', categories)
router.get('/status', status)
router.get('/priority', priority)
router.get('/resolution', resolution)
router.get('/sla', sla)
router.get('/agents', agents)
router.get('/departments', departments)
router.get('/locations', locations)
router.get('/users', users)
router.get('/ml', ml)
router.get('/insights', insights)

export default router