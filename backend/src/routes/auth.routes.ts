import { Router } from 'express'
import {
  register,
  login,
  me,
  updateMe,
  changeMyPassword,
  forgotPasswordHandler,
  resetPasswordHandler,
  logout,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validation'
import {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler)
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler)
router.post('/logout', authenticate, logout)

router.get('/me', authenticate, me)
router.get('/profile', authenticate, me)
router.put('/profile', authenticate, validate(profileUpdateSchema), updateMe)
router.put('/change-password', authenticate, validate(changePasswordSchema), changeMyPassword)

export default router