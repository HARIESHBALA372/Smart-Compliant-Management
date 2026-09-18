import { Router } from 'express'
import { create } from '../controllers/feedback.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { feedbackSchema } from '../validators/feedback.validator'

const router = Router()

router.post('/', authenticate, validate(feedbackSchema), create)

export default router