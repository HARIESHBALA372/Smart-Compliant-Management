import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { ApiError } from '../utils/http'

/**
 * Validates req.body against a Zod schema. Has partial support for
 * `req.params` and `req.query` validation through the same schema.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || (issue.code === 'custom' ? issue.message : 'body'),
        message: issue.message,
      }))
      throw new ApiError(422, 'Validation failed', errors)
    }
    req.body = result.data
    next()
  }
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit ?? 10) || 10, 1), 100)
  return { page, limit }
}