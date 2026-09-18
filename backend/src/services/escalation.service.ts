import type { EscalationLevel } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError, isTerminalStatus } from '../utils/http'
import { notifyMany } from './notification.service'
import { invalidateComplaintCaches } from './redis/cache.service'
import { recordAudit } from './audit.service'
import { resolutionHoursFor } from './sla.service'

const LEVELS: EscalationLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3']

/** Hours an unresolved escalation is allowed to stay at a level before auto-escalating higher. */
export const AUTO_ESCALATION_HOURS: Record<EscalationLevel, number> = {
  LEVEL_1: 24,
  LEVEL_2: 48,
  LEVEL_3: 9999,
}

export interface EscalateInput {
  complaintId: string
  escalatedBy: string | null
  reason?: string
  toLevel?: EscalationLevel
  escalatedToId?: string
}

function levelIndex(level: EscalationLevel): number {
  return LEVELS.indexOf(level)
}

async function escalationTargets(
  complaint: { departmentId?: string | null },
  level: EscalationLevel,
  escalatedToId?: string,
): Promise<string[]> {
  if (escalatedToId) return [escalatedToId]

  const admins = (
    await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })
  ).map((u) => u.id)

  if (level === 'LEVEL_3') return admins

  const staff = (
    await prisma.user.findMany({
      where: {
        role: 'STAFF',
        isActive: true,
        ...(complaint.departmentId ? { departmentId: complaint.departmentId } : {}),
      },
      select: { id: true },
    })
  ).map((u) => u.id)

  if (level === 'LEVEL_1') return staff
  return [...new Set([...staff, ...admins])]
}

/**
 * Records a manual escalation (route or admin action) and notifies the
 * responsible parties for the target level. `escalatedBy` is the acting user
 * id; pass `null` for system/automatic escalations.
 */
export async function escalateComplaint(input: EscalateInput) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: input.complaintId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  })
  if (!complaint) throw new ApiError(404, 'Complaint not found')
  if (isTerminalStatus(complaint.status)) {
    throw new ApiError(409, 'Cannot escalate a resolved, closed or rejected complaint')
  }

  const toLevel: EscalationLevel = input.toLevel ?? 'LEVEL_2'

  let escalateeId: string | null = null
  if (input.escalatedToId) {
    const escalatee = await prisma.user.findUnique({ where: { id: input.escalatedToId } })
    if (!escalatee || !['STAFF', 'ADMIN'].includes(escalatee.role) || !escalatee.isActive) {
      throw new ApiError(422, 'Escalation target must be an active STAFF or ADMIN user')
    }
    escalateeId = escalatee.id
  }

  const latest = await latestEscalation(input.complaintId)
  if (latest && !latest.isResolved && levelIndex(toLevel) <= levelIndex(latest.toLevel)) {
    throw new ApiError(409, `Complaint is already escalated to ${latest.toLevel}`)
  }

  const escalation = await prisma.$transaction(async (tx) => {
    const created = await tx.complaintEscalation.create({
      data: {
        complaintId: input.complaintId,
        escalatedBy: input.escalatedBy,
        escalatedTo: escalateeId,
        fromLevel: latest?.toLevel ?? null,
        toLevel,
        reason: input.reason ?? null,
      },
      include: { complaint: true },
    })

    await tx.complaintUpdate.create({
      data: {
        complaintId: input.complaintId,
        userId: input.escalatedBy,
        oldStatus: complaint.status,
        newStatus: complaint.status,
        comment: `Complaint escalated to ${toLevel.replace('_', ' ').toLowerCase()}.`,
        isInternal: true,
      },
    })

    return created
  })

  const levelLabel = toLevel.replace('_', ' ').toLowerCase()
  const reasonText = input.reason ? ` Reason: ${input.reason}` : ''

  const targets = await escalationTargets(complaint, toLevel, escalateeId ?? undefined)
  await notifyMany(
    targets.map((targetId) => ({
      userId: targetId,
      type: 'COMPLAINT_ESCALATED' as const,
      title: 'Complaint escalated',
      message: `Complaint ${complaint.complaintNumber} has been escalated to ${levelLabel}.${reasonText}`,
      complaintId: input.complaintId,
    })),
  )

  if (complaint.userId && !targets.includes(complaint.userId)) {
    await notifyMany([
      {
        userId: complaint.userId,
        type: 'COMPLAINT_ESCALATED',
        title: 'Complaint escalated',
        message: `Your complaint ${complaint.complaintNumber} has been escalated for faster attention.`,
        complaintId: input.complaintId,
      },
    ])
  }

  await invalidateComplaintCaches(complaint)

  await recordAudit({
    userId: input.escalatedBy,
    action: 'ESCALATE_COMPLAINT',
    entityType: 'Complaint',
    entityId: input.complaintId,
    newValue: { toLevel, escalatedToId: escalateeId, reason: input.reason ?? null },
  })

  return { ...escalation, complaintNumber: complaint.complaintNumber }
}

export async function latestEscalation(complaintId: string) {
  return prisma.complaintEscalation.findFirst({
    where: { complaintId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function listEscalations(
  page: number,
  limit: number,
  status?: 'open' | 'resolved',
) {
  const where = status ? { isResolved: status === 'resolved' } : {}

  const total = await prisma.complaintEscalation.count({ where })
  const data = await prisma.complaintEscalation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      complaint: {
        include: {
          user: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
      escalator: { select: { id: true, name: true } },
      escalatee: { select: { id: true, name: true } },
    },
  })

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function resolveEscalation(escalationId: string, userId: string) {
  const escalation = await prisma.complaintEscalation.findUnique({ where: { id: escalationId } })
  if (!escalation) throw new ApiError(404, 'Escalation not found')

  return prisma.complaintEscalation.update({
    where: { id: escalationId },
    data: { isResolved: true, resolvedAt: new Date(), resolvedBy: userId },
  })
}

/**
 * SLA-driven automatic escalation sweep. Non-terminal complaints older than
 * their priority's resolution SLA are escalated one level at a time:
 *   none        -> LEVEL_1
 *   LEVEL_1 (24h) -> LEVEL_2
 *   LEVEL_2 (48h) -> LEVEL_3
 * Duplicate escalations are prevented by checking the latest open escalation.
 */
export async function sweepEscalations(now: Date = new Date()) {
  const complaints = await prisma.complaint.findMany({
    where: { status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
    select: {
      id: true,
      complaintNumber: true,
      departmentId: true,
      userId: true,
      createdAt: true,
      status: true,
      priority: true,
    },
  })

  const escalated: Array<{ complaintId: string; complaintNumber: string; toLevel: EscalationLevel }> = []

  for (const complaint of complaints) {
    const hours = await resolutionHoursFor(complaint.priority)
    const deadline = slaDeadline(complaint.createdAt, hours)
    if (now < deadline) continue

    const latest = await latestEscalation(complaint.id)

    let toLevel: EscalationLevel | null = null
    if (!latest || latest.isResolved) {
      toLevel = 'LEVEL_1'
    } else {
      const ageHours = (now.getTime() - latest.createdAt.getTime()) / (60 * 60 * 1000)
      if (latest.toLevel === 'LEVEL_1' && ageHours >= AUTO_ESCALATION_HOURS.LEVEL_1) toLevel = 'LEVEL_2'
      else if (latest.toLevel === 'LEVEL_2' && ageHours >= AUTO_ESCALATION_HOURS.LEVEL_2) toLevel = 'LEVEL_3'
    }

    if (!toLevel) continue

    await escalateComplaint({
      complaintId: complaint.id,
      escalatedBy: null,
      reason: 'Automatic escalation — SLA deadline passed.',
      toLevel,
    })
    escalated.push({ complaintId: complaint.id, complaintNumber: complaint.complaintNumber, toLevel })
  }

  return escalated
}

function slaDeadline(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 60 * 60 * 1000)
}