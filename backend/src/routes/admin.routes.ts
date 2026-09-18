import { Router } from 'express'
import {
  dashboard,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getSLA,
  updateSLA,
  getAuditLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  agents,
  escalations,
} from '../controllers/admin.controller'
import { listDepartments } from '../services/department.service'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { categorySchema, departmentSchema, slaUpdateSchema } from '../validators/admin.validator'

const router = Router()

router.use(authenticate)

// Shared STAFF/ADMIN endpoints (managers are STAFF in the backend model).
router.get('/categories', authorize('ADMIN', 'STAFF'), listCategories)
router.get('/departments', authorize('ADMIN', 'STAFF'), async (req, res, next) => {
  try {
    const departments = await listDepartments()
    res.json({ success: true, message: 'Departments fetched', data: departments })
  } catch (error) {
    next(error)
  }
})

// ADMIN-only endpoints.
router.get('/dashboard', authorize('ADMIN'), dashboard)
router.get('/users', authorize('ADMIN'), listUsers)
router.get('/users/:id', authorize('ADMIN'), getUser)
router.post('/users', authorize('ADMIN'), createUser)
router.put('/users/:id', authorize('ADMIN'), updateUser)
router.delete('/users/:id', authorize('ADMIN'), deleteUser)

router.get('/sla', authorize('ADMIN'), getSLA)
router.put('/sla', authorize('ADMIN'), validate(slaUpdateSchema), updateSLA)
router.get('/audit-logs', authorize('ADMIN'), getAuditLogs)

router.get('/agents', authorize('ADMIN'), agents)
router.get('/escalations', authorize('ADMIN'), escalations)

router.post('/categories', authorize('ADMIN'), validate(categorySchema), createCategory)
router.put('/categories/:id', authorize('ADMIN'), validate(categorySchema.partial()), updateCategory)
router.delete('/categories/:id', authorize('ADMIN'), deleteCategory)

router.post('/departments', authorize('ADMIN'), validate(departmentSchema), createDepartmentAction)
router.put('/departments/:id', authorize('ADMIN'), validate(departmentSchema.partial()), updateDepartmentAction)
router.delete('/departments/:id', authorize('ADMIN'), deleteDepartmentAction)

export default router