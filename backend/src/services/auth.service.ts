import { Role } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { hashPassword, comparePassword } from '../utils/password'
import { signToken, verifyToken } from '../utils/jwt'

export interface RegisterInput {
  name: string
  email: string
  phone?: string
  password: string
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const password = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      password,
      role: Role.USER,
    },
  })

  return {
    user: sanitize(user),
    token: signToken({ userId: user.id }),
  }
}

export async function loginUser(email: string, password: string) {
  const normalized = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalized } })

  if (!user || !(await comparePassword(password, user.password))) {
    throw new ApiError(401, 'Invalid email or password')
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.')
  }

  return {
    user: sanitize(user),
    token: signToken({ userId: user.id }),
  }
}

export function sanitize<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...rest } = user
  void _password
  return rest
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { department: true },
  })
  if (!user) throw new ApiError(404, 'User not found')
  return user
}

export async function updateProfile(id: string, data: { name?: string; phone?: string }) {
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      phone: data.phone?.trim() || null,
    },
    include: { department: true },
  })
  return user
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new ApiError(404, 'User not found')
  if (!(await comparePassword(currentPassword, user.password))) {
    throw new ApiError(401, 'Current password is incorrect')
  }
  const password = await hashPassword(newPassword)
  await prisma.user.update({ where: { id }, data: { password } })
}

export async function forgotPassword(email: string): Promise<{ resetToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) throw new ApiError(404, 'No account found for this email')

  const resetToken = signToken({ userId: user.id })
  return { resetToken }
}

export async function resetPassword(token: string, newPassword: string) {
  let payload: { userId: string }
  try {
    payload = verifyToken(token)
  } catch {
    throw new ApiError(400, 'Invalid or expired reset token')
  }

  const password = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: payload.userId }, data: { password } })
}

export function verifyResetToken(token: string): unknown {
  return verifyToken(token)
}