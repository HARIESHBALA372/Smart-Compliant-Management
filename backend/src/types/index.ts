import type { Role } from '@prisma/client'

export interface AuthUser {
  id: string
  role: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      file?: Express.Multer.File
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }
    }
  }
}

export {};