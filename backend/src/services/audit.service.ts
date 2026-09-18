import type { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'CREATE_COMPLAINT'
  | 'UPDATE_COMPLAINT'
  | 'ASSIGN_COMPLAINT'
  | 'CHANGE_STATUS'
  | 'CHANGE_PRIORITY'
  | 'RESOLVE_COMPLAINT'
  | 'REOPEN_COMPLAINT'
  | 'ESCALATE_COMPLAINT'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'CREATE_DEPARTMENT'
  | 'UPDATE_DEPARTMENT'
  | 'DELETE_DEPARTMENT'
  | 'UPDATE_SLA'
  | 'DELETE_COMPLAINT'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'

interface AuditEntry {
  userId?: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Writes an audit log row. Failures are swallowed (and logged) so audit
 * capture can never break the primary request.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      oldValue: entry.oldValue !== undefined ? (entry.oldValue as Prisma.InputJsonValue) : undefined,
      newValue: entry.newValue !== undefined ? (entry.newValue as Prisma.InputJsonValue) : undefined,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    }
    await prisma.auditLog.create({ data })
  } catch (err) {
    logger.warn({
      message: 'Failed to record audit log entry',
      action: entry.action,
      entityType: entry.entityType,
      error: err,
    })
  }
}