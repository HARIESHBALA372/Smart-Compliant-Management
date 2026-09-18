import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { verifyToken } from '../utils/jwt'

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Provide a Bearer token.')
    }

    const token = header.split(' ')[1]
    let payload: { userId: string }
    try {
      payload = verifyToken(token)
    } catch {
      throw new ApiError(401, 'Invalid or expired token')
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) throw new ApiError(401, 'User account no longer exists')
    if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated')

    req.user = { id: user.id, role: user.role }
    next()
  } catch (error) {
    next(error)
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action'))
      return
    }
    next()
  }
}