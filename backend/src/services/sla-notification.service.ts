import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { resolutionHoursFor, slaDeadlineFor } from './sla.service'
import { notifyMany } from './notification.service'

/**
 * SLA watcher notifications.
 *
 * For every open complaint, warns the involved parties as its resolution
 * deadline approaches:
 *   75% elapsed  -> SLA_WARNING  (metadata.threshold = "75")
 *   90% elapsed  -> SLA_WARNING  (metadata.threshold = "90")
 *   100% elapsed -> SLA_BREACHED (metadata.threshold = "100")
 *
 * Each threshold is emitted exactly once per complaint (deduplicated against
 * existing notification rows), so the sweep is safe to run repeatedly.
 */

export const SLA_WARNING_THRESHOLDS: Array<{ pct: number; label: string }> = [
  { pct: 0.75, label: '75' },
  { pct: 0.9, label: '90' },
  { pct: 1.0, label: '100' },
]

interface SlaCandidate {
  id: string
  complaintNumber: string
  userId: string
  assignedToId: string | null
  departmentId: string | null
  createdAt: Date
  status: string
  priority: string
}

/**
 * Returns the thresholds already notified for a complaint by inspecting its
 * existing SLA notification rows (works without Redis — dedup is DB-backed).
 */
async function notifiedThresholds(complaintId: string): Promise<Set<string>> {
  const rows = await prisma.notification.findMany({
    where: { complaintId, type: { in: ['SLA_WARNING', 'SLA_BREACHED'] } },
    select: { type: true, metadata: true },
  })
  const notified = new Set<string>()
  for (const row of rows) {
    if (row.type === 'SLA_BREACHED') {
      notified.add('100')
      continue
    }
    if (row.metadata && typeof row.metadata === 'object') {
      const threshold = (row.metadata as Record<string, unknown>).threshold
      if (typeof threshold === 'string') notified.add(threshold)
    }
  }
  return notified
}

/**
 * Emits the earliest not-yet-sent threshold notification for a single complaint.
 * Returns `true` when a notification was created.
 */
export async function notifySlaThresholdForComplaint(complaint: SlaCandidate, now: Date): Promise<boolean> {
  const priority = complaint.priority as never
  const hours = await resolutionHoursFor(priority)
  const deadline = slaDeadlineFor(priority, complaint.createdAt, hours)
  const totalMs = Math.max(deadline.getTime() - complaint.createdAt.getTime(), 1)
  const elapsed = Math.max((now.getTime() - complaint.createdAt.getTime()) / totalMs, 0)

  const notified = await notifiedThresholds(complaint.id)

  let target: { pct: number; label: string } | null = null
  for (const threshold of SLA_WARNING_THRESHOLDS) {
    if (elapsed >= threshold.pct && !notified.has(threshold.label)) {
      target = threshold
      break
    }
  }
  if (!target) return false

  const ageHours = Math.round((now.getTime() - complaint.createdAt.getTime()) / (60 * 60 * 1000))
  const metadata = {
    threshold: target.label,
    hoursElapsed: ageHours,
    deadlineEpochMs: deadline.getTime(),
  }

  const recipients = await slaRecipients(complaint)
  const isBreach = target.pct >= 1

  const payloads = recipients.map((userId) => ({
    userId,
    complaintId: complaint.id,
    type: isBreach ? ('SLA_BREACHED' as const) : ('SLA_WARNING' as const),
    priority: isBreach ? ('CRITICAL' as const) : ('IMPORTANT' as const),
    metadata,
    title: isBreach ? 'SLA breached' : 'SLA deadline approaching',
    message: isBreach
      ? `Complaint ${complaint.complaintNumber} has breached its resolution deadline (${
          Math.max(hours, 1)
        }h for ${priority}). Immediate action is required.`
      : `Complaint ${complaint.complaintNumber} is ${target.label}% through its resolution SLA (${
          hours
        }h for ${priority}). The deadline is approaching.`,
  }))

  const created = await notifyMany(payloads)
  if (created > 0) {
    logger.info({
      message: `SLA notification dispatched (${isBreach ? 'breached' : 'warning'} ${target.label}%)`,
      complaintId: complaint.id,
      complaintNumber: complaint.complaintNumber,
      recipients: recipients.length,
    })
    return true
  }
  return false
}

async function slaRecipients(complaint: SlaCandidate): Promise<string[]> {
  const departmentStaff = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ role: 'ADMIN' }, complaint.departmentId ? { role: 'STAFF', departmentId: complaint.departmentId } : { role: 'STAFF' }],
    },
    select: { id: true },
  })
  const ids = new Set<string>(departmentStaff.map((u) => u.id))
  if (complaint.userId) ids.add(complaint.userId)
  if (complaint.assignedToId) ids.add(complaint.assignedToId)
  // Keep the citizen reachable with its own row: the deduplicated recipient list
  // already contains the user; the loop below adds every recipient once.
  return [...ids]
}

/**
 * Sweeps all non-terminal complaints and dispatches any missing SLA threshold
 * notifications. Returns the number of notifications created.
 */
export async function sweepSlaNotifications(now: Date = new Date()): Promise<number> {
  const complaints = (await prisma.complaint.findMany({
    where: { status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
    select: {
      id: true,
      complaintNumber: true,
      userId: true,
      assignedToId: true,
      departmentId: true,
      createdAt: true,
      status: true,
      priority: true,
    },
  })) as unknown as SlaCandidate[]

  let created = 0
  for (const complaint of complaints) {
    try {
      if (await notifySlaThresholdForComplaint(complaint, now)) created += 1
    } catch (err) {
      logger.error({ message: 'SLA notification sweep error', complaintId: complaint.id, error: err })
    }
  }
  return created
}