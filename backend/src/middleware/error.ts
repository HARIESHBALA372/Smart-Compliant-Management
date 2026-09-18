import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import multer from 'multer'
import { ZodError } from 'zod'
import { ApiError } from '../utils/http'
import { logger } from '../utils/logger'
import { isProduction } from '../config/env'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: null,
  })
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errors ?? null,
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 5MB.'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files. Maximum is 2.'
          : `Upload error: ${err.message}`
    res.status(413).json({ success: false, message, error: null })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A record with this value already exists', error: null })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found', error: null })
      return
    }
  }

  logger.error({ message: 'Unhandled error', route: `${req.method} ${req.originalUrl}`, error: err })

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: isProduction ? null : err instanceof Error ? err.message : String(err),
  })
}