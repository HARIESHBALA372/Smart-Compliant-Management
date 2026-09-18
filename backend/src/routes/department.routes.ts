import { Router, Response, NextFunction } from 'express'
import { listDepartments } from '../services/department.service'
import { departmentStats } from '../controllers/dashboard.controller'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const departments = await listDepartments()
    res.json({ success: true, message: 'Departments fetched', data: departments })
  } catch (error) {
    next(error)
  }
})
router.get('/:id/stats', authenticate, authorize('ADMIN', 'STAFF'), departmentStats)

export default router