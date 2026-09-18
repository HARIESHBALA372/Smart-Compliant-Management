import { Router } from 'express'
import {
  create,
  list,
  getById,
  update,
  remove,
  status,
  assign,
  listAssigned,
  stats,
  comment,
  overdue,
  escalate,
  priority,
  resolve,
  reopen,
  recommend,
} from '../controllers/complaint.controller'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { upload } from '../middleware/upload'
import { redisRateLimiter } from '../middleware/redis-rate-limit'
import { RateLimitKeys } from '../services/redis/rate-limit.service'
import {
  createComplaintSchema,
  updateComplaintSchema,
  changeStatusSchema,
  assignSchema,
  commentSchema,
  escalateSchema,
  changePrioritySchema,
  resolveComplaintSchema,
  reopenComplaintSchema,
} from '../validators/complaint.validator'

const router = Router()

router.use(authenticate)

router.get('/', list)
router.get('/stats', stats)
router.get('/assigned', authorize('STAFF', 'ADMIN'), listAssigned)
router.get('/overdue', authorize('ADMIN'), overdue)
router.get('/:id', getById)

router.post(
  '/',
  redisRateLimiter({
    keyBuilder: (req) => RateLimitKeys.complaintSubmission(req.user!.id),
    limit: 10,
    windowSeconds: 3600,
    message: 'Complaint submission limit reached. Please try again later.',
  }),
  upload.fields([
    { name: 'image', maxCount: 5 },
    { name: 'document', maxCount: 5 },
    { name: 'attachments', maxCount: 10 },
  ]),
  validate(createComplaintSchema),
  create,
)

router.put('/:id', validate(updateComplaintSchema), update)
router.put('/:id/priority', authorize('STAFF', 'ADMIN'), validate(changePrioritySchema), priority)
router.post('/:id/status', authorize('STAFF', 'ADMIN'), validate(changeStatusSchema), status)
router.post('/:id/assign', authorize('ADMIN', 'STAFF'), validate(assignSchema), assign)
router.post('/:id/comments', validate(commentSchema), comment)
router.post('/:id/escalate', authorize('STAFF', 'ADMIN'), validate(escalateSchema), escalate)
router.post('/:id/resolve', authorize('STAFF', 'ADMIN'), validate(resolveComplaintSchema), resolve)
router.post('/:id/reopen', authorize('STAFF', 'ADMIN'), validate(reopenComplaintSchema), reopen)
router.get('/:id/recommend-agents', authorize('STAFF', 'ADMIN'), recommend)
router.delete('/:id', remove)

export default router