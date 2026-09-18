import type { Request, Response, NextFunction } from 'express'
import {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  sanitize,
} from '../services/auth.service'
import { sendSuccess } from '../utils/http'
import { isProduction } from '../config/env'
import { recordAudit } from '../services/audit.service'

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, token } = await registerUser(req.body)
    await recordAudit({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'Registration successful', { user, token }, 201)
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body
    const { user, token } = await loginUser(email, password)
    await recordAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'Login successful', { user, token })
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.user!.id)
    const sanitized = sanitize(user)
    sendSuccess(res, 'Profile fetched', sanitized)
  } catch (error) {
    next(error)
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await updateProfile(req.user!.id, req.body)
    sendSuccess(res, 'Profile updated', sanitize(user))
  } catch (error) {
    next(error)
  }
}

export async function changeMyPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body
    await changePassword(req.user!.id, currentPassword, newPassword)
    sendSuccess(res, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { resetToken } = await forgotPassword(req.body.email)
    const message = isProduction
      ? 'If an account exists for that email, a reset link has been sent.'
      : 'Password reset token generated (dev mode).'
    sendSuccess(res, message, isProduction ? null : { resetToken })
  } catch (error) {
    next(error)
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body
    await resetPassword(token, password)
    sendSuccess(res, 'Password has been reset. You can now log in.')
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await recordAudit({
    userId: req.user?.id ?? null,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: req.user?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  })
  sendSuccess(res, 'Logged out successfully')
}