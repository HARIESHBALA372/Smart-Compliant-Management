import { Router } from 'express'
import {
  list,
  readOne,
  completeOne,
  readAll,
  remove,
  unreadCount,
  preferencesGet,
  preferencesPut,
  announce,
} from '../controllers/notification.controller'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { notificationPreferencesSchema, announceSchema } from '../validators/notification.validator'

const router = Router()

router.use(authenticate)
router.get('/', list)
router.get('/unread-count', unreadCount)
router.get('/preferences', preferencesGet)
router.put('/preferences', validate(notificationPreferencesSchema), preferencesPut)
router.post('/announce', authorize('ADMIN'), validate(announceSchema), announce)
router.put('/read-all', readAll)
router.put('/:id/read', readOne)
router.put('/:id/complete', completeOne)
router.delete('/:id', remove)

export default router