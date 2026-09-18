import { z } from 'zod'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('A valid email is required').toLowerCase(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')).nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(PASSWORD_REGEX, 'Password must contain upper, lower, digit and special character'),
})

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8).regex(PASSWORD_REGEX, 'Password must contain upper, lower, digit and special character'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8).regex(PASSWORD_REGEX, 'Password must contain upper, lower, digit and special character'),
})