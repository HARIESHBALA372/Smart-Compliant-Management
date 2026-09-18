import type { Complaint, ComplaintStatus } from '@prisma/client'

/**
 * Centralized HTTP helpers and error type used across controllers,
 * middleware and the final error handler.
 */

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly errors?: { field?: string; message: string }[]

  constructor(statusCode: number, message: string, errors?: { field?: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errors = errors
    Error.captureStackTrace(this, this.constructor)
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  [key: string]: unknown
}

export function sendSuccess(
  res: import('express').Response,
  message: string,
  data: unknown = null,
  statusCode = 200,
  pagination?: Pagination,
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  })
}

export function sendError(
  res: import('express').Response,
  statusCode: number,
  message: string,
  error: unknown = null,
): void {
  res.status(statusCode).json({
    success: false,
    message,
    error,
  })
}

/**
 * Wraps async controllers so thrown errors are forwarded to Express' error
 * middleware instead of producing unhandled promise rejections.
 */
export const asyncHandler =
  (
    fn: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>,
  ) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

/**
 * Whether a complaint is currently overdue per its priority SLA.
 * Terminal statuses (RESOLVED/CLOSED/REJECTED) are never overdue.
 */
export function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...rest } = user
  void _password
  return rest
}

export function isTerminalStatus(status: ComplaintStatus): boolean {
  return status === 'RESOLVED' || status === 'CLOSED' || status === 'REJECTED'
}

export function complaintIsOverdue(complaint: Pick<Complaint, 'createdAt' | 'status' | 'priority'>): boolean {
  if (isTerminalStatus(complaint.status)) return false

  const hours = SLA_HOURS_BY_PRIORITY[complaint.priority]
  const deadline = new Date(complaint.createdAt.getTime() + hours * 60 * 60 * 1000)
  return new Date() > deadline
}

export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  LOW: 7 * 24,
  MEDIUM: 5 * 24,
  HIGH: 2 * 24,
  CRITICAL: 24,
}