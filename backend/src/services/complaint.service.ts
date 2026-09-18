import type { Category, Priority, ComplaintStatus, Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { departmentForCategory } from './classification.service'
import { generateComplaintNumber } from '../utils/complaintId'
import { createNotification, notifyMany, getAdminAndStaffIds } from './notification.service'
import {
  CACHE_TTL,
  Keys,
  cacheRemember,
  cacheSet,
  invalidateComplaintCaches,
} from './redis/cache.service'
import { QueueNames, enqueue } from './redis/queue.service'
import { recordAudit } from './audit.service'

export interface ComplaintIncludeFilters {
  userId?: string
  assignedToId?: string
  departmentId?: string
  status?: string
  category?: string
  priority?: string
  search?: string
}

export interface AttachmentInput {
  fileName: string
  fileUrl: string
  fileType?: string | null
  fileSize?: number
}

export async function findOrCreateDepartment(name: string) {
  const existing = await prisma.department.findUnique({ where: { name } })
  if (existing) return existing
  return prisma.department.create({ data: { name } })
}

export async function createComplaint(input: {
  userId: string
  title: string
  description: string
  category?: string
  priority?: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  imageUrl?: string | null
  documentUrl?: string | null
  attachments?: AttachmentInput[]
  classification?: { category: string; priority: string; confidence: number; keywords: string[]; suggestedDepartment: string }
}) {
  const number = await generateComplaintNumber()

  const classified = input.classification

  // Category: explicit user value wins, otherwise the auto-classified one.
  const category: Category = input.category ? (input.category as Category) : ((classified?.category as Category) ?? 'OTHER')
  const priority: Priority = (input.priority ? (input.priority as Priority) : ((classified?.priority as Priority) ?? 'MEDIUM')) as Priority

  const department = await findOrCreateDepartment(departmentForCategory(category))

  const interaction = await prisma.complaint.create({
    data: {
      complaintNumber: number,
      title: input.title,
      description: input.description,
      category,
      subcategory: null,
      priority,
      status: 'SUBMITTED' as ComplaintStatus,
      aiCategory: classified?.category as Category | undefined,
      aiPriority: classified?.priority as Priority | undefined,
      aiConfidence: classified?.confidence ?? null,
      severityScore: severityForPriority(priority),
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      imageUrl: input.imageUrl ?? null,
      documentUrl: input.documentUrl ?? null,
      userId: input.userId,
      departmentId: department.id,
      attachments: input.attachments?.length
        ? {
            create: input.attachments.map((a) => ({
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileType: a.fileType ?? null,
              fileSize: a.fileSize ?? 0,
              uploadedBy: input.userId,
            })),
          }
        : undefined,
    },
    include: {
      user: true,
      department: true,
    },
  })

  await prisma.complaintUpdate.create({
    data: {
      complaintId: interaction.id,
      userId: input.userId,
      oldStatus: null,
      newStatus: 'SUBMITTED',
      comment: 'Complaint submitted by user.',
    },
  })

  const staffAndAdmins = await getAdminAndStaffIds(department.id)
  await notifyMany([
    {
      userId: input.userId,
      title: 'Complaint registered',
      message: `Your complaint ${number} has been submitted and is under review.`,
      complaintId: interaction.id,
    },
    ...staffAndAdmins.map((id) => ({
      userId: id,
      title: 'New complaint received',
      message: `New complaint ${number} (${category}) has been registered and assigned to ${department.name}.`,
      complaintId: interaction.id,
    })),
  ])

  await invalidateComplaintCaches(interaction)

  // Fire-and-forget background processing (AI cache warm-up etc.). The API
  // never waits on Redis — if the queue is down the request already succeeded.
  void enqueue(QueueNames.complaints, { complaintId: interaction.id })

  if (classified) {
    await cacheSet(
      Keys.aiClassification(interaction.id),
      {
        category: classified.category,
        priority: classified.priority,
        confidence: classified.confidence,
        department: classified.suggestedDepartment,
      },
      CACHE_TTL.aiClassification,
    )
  }

  await recordAudit({
    userId: input.userId,
    action: 'CREATE_COMPLAINT',
    entityType: 'Complaint',
    entityId: interaction.id,
    newValue: { complaintNumber: number, category, priority, status: 'SUBMITTED' },
  })

  return interaction
}

export const COMPLAINT_INCLUDE = {
  user: true,
  assignedTo: true,
  department: true,
  attachments: true,
  assignments: { orderBy: { assignedAt: 'desc' as const } },
  updates: { orderBy: { createdAt: 'desc' as const } },
  notifications: true,
} as const

export async function listComplaints(filters: ComplaintIncludeFilters, page: number, limit: number) {
  const where: Record<string, unknown> = {}

  if (filters.userId) where.userId = filters.userId
  if (filters.assignedToId) where.assignedToId = filters.assignedToId
  if (filters.departmentId) where.departmentId = filters.departmentId
  if (filters.status) where.status = filters.status
  if (filters.category) where.category = filters.category
  if (filters.priority) where.priority = filters.priority
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { complaintNumber: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const total = await prisma.complaint.count({ where })
  const data = await prisma.complaint.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: COMPLAINT_INCLUDE,
  })

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getComplaintById(id: string) {
  const complaint = await cacheRemember(
    Keys.complaint(id),
    CACHE_TTL.complaint,
    async () =>
      prisma.complaint.findUnique({
        where: { id },
        include: {
          ...COMPLAINT_INCLUDE,
          feedback: true,
        },
      }),
  )
  if (!complaint) throw new ApiError(404, 'Complaint not found')
  return complaint
}

export async function getComplaintByNumber(complaintNumber: string) {
  return cacheRemember(
    Keys.complaintByNumber(complaintNumber),
    CACHE_TTL.complaintByNumber,
    async () => prisma.complaint.findUnique({ where: { complaintNumber } }),
  )
}

export async function updateComplaint(
  id: string,
  userId: string,
  role: string,
  data: {
    title?: string
    description?: string
    category?: string
    priority?: string
    location?: string
    latitude?: number | null
    longitude?: number | null
    expectedUpdatedAt?: Date
  },
) {
  const complaint = await getComplaintById(id)

  const isAdmin = role === 'ADMIN'
  if (complaint.userId !== userId && !isAdmin) {
    throw new ApiError(403, 'You are not allowed to edit this complaint')
  }
  if (complaint.status !== 'SUBMITTED' && complaint.status !== 'UNDER_REVIEW' && !isAdmin) {
    throw new ApiError(409, 'A complaint can only be edited before work starts')
  }

  let departmentId = complaint.departmentId
  if (data.category && data.category !== complaint.category) {
    const department = await findOrCreateDepartment(departmentForCategory(data.category as never))
    departmentId = department.id
  }

  const where = data.expectedUpdatedAt
    ? { id, updatedAt: new Date(data.expectedUpdatedAt) }
    : { id }

  let updated
  try {
    updated = await prisma.complaint.update({
      where,
      data: {
        title: data.title,
        description: data.description,
        category: data.category ? (data.category as Category) : undefined,
        priority: data.priority ? (data.priority as Priority) : undefined,
        location: data.location,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        ...(departmentId ? { departmentId } : {}),
      },
      include: COMPLAINT_INCLUDE,
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025' && data.expectedUpdatedAt) {
      throw new ApiError(409, 'This complaint was modified concurrently. Reload and retry.')
    }
    throw error
  }

  await invalidateComplaintCaches(updated)

  await recordAudit({
    userId,
    action: 'UPDATE_COMPLAINT',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { title: complaint.title, category: complaint.category, priority: complaint.priority },
    newValue: { title: updated.title, category: updated.category, priority: updated.priority },
  })

  return updated
}

export async function deleteComplaint(id: string, userId: string, role: string) {
  const complaint = await getComplaintById(id)

  const isAdmin = role === 'ADMIN'
  if (complaint.userId !== userId && !isAdmin) {
    throw new ApiError(403, 'You are not allowed to delete this complaint')
  }
  if (!isAdmin && ['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
    throw new ApiError(409, 'Resolved, closed or rejected complaints cannot be deleted')
  }

  await prisma.complaint.delete({ where: { id } })
  await invalidateComplaintCaches(complaint)

  await recordAudit({
    userId,
    action: 'DELETE_COMPLAINT',
    entityType: 'Complaint',
    entityId: id,
    newValue: { complaintNumber: complaint.complaintNumber },
  })
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'WAITING_FOR_USER', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'WAITING_FOR_USER'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  REJECTED: [],
  CLOSED: [],
}

export async function changeStatus(
  id: string,
  userId: string,
  role: string,
  newStatus: string,
  comment?: string,
) {
  const complaint = await getComplaintById(id)

  const requestingUser = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin = role === 'ADMIN'
  const isAssignee = complaint.assignedToId === userId
  const isDepartmentStaff =
    role === 'STAFF' && requestingUser != null && complaint.departmentId != null && requestingUser.departmentId === complaint.departmentId

  if (!isAdmin && !isAssignee && !isDepartmentStaff) {
    throw new ApiError(403, 'You are not allowed to change this complaint status')
  }

  if (newStatus === complaint.status) {
    throw new ApiError(409, `Complaint is already ${newStatus}`)
  }

  const allowed = STATUS_TRANSITIONS[complaint.status]
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      409,
      `Status transition from ${complaint.status} to ${newStatus} is not allowed. Allowed: ${allowed.join(', ')}`,
    )
  }

  if (newStatus === 'REJECTED' && !comment) {
    throw new ApiError(422, 'A reason is required when rejecting a complaint')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: newStatus as ComplaintStatus,
        resolvedAt: newStatus === 'RESOLVED' ? new Date() : complaint.resolvedAt,
        closedAt: newStatus === 'CLOSED' ? new Date() : complaint.closedAt,
      },
      include: COMPLAINT_INCLUDE,
    })

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        userId,
        oldStatus: complaint.status,
        newStatus: newStatus as ComplaintStatus,
        comment: comment ?? null,
      },
    })

    return result
  })

  await invalidateComplaintCaches(updated)

  if (newStatus === 'RESOLVED') {
    await createNotification({
      userId: complaint.userId,
      type: 'COMPLAINT_RESOLVED',
      title: 'Complaint resolved',
      message: `Your complaint ${complaint.complaintNumber} has been resolved. Please provide feedback.`,
      complaintId: id,
      priority: 'IMPORTANT',
    })
  } else if (newStatus === 'REJECTED') {
    await createNotification({
      userId: complaint.userId,
      type: 'COMPLAINT_REJECTED',
      title: 'Complaint rejected',
      message: `Your complaint ${complaint.complaintNumber} was rejected${comment ? `: ${comment}` : ''}.`,
      complaintId: id,
      priority: 'IMPORTANT',
    })
  } else if (newStatus === 'CLOSED') {
    await maybeRequestFeedback(id, complaint.userId, complaint.complaintNumber)
  } else if (complaint.userId !== userId) {
    await createNotification({
      userId: complaint.userId,
      type: 'STATUS_UPDATED',
      title: 'Status update',
      message: `Your complaint ${complaint.complaintNumber} has moved to ${newStatus}.`,
      complaintId: id,
    })
  }

  await recordAudit({
    userId,
    action: 'CHANGE_STATUS',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { status: complaint.status },
    newValue: { status: newStatus },
  })

  return updated
}

/**
 * Prompts the citizen for feedback when a complaint is closed without one yet.
 * Quietly skips when feedback already exists.
 */
async function maybeRequestFeedback(complaintId: string, ownerId: string, complaintNumber: string): Promise<void> {
  const existing = await prisma.feedback.findFirst({ where: { complaintId } })
  if (existing) return

  await createNotification({
    userId: ownerId,
    type: 'FEEDBACK_REQUEST',
    title: 'Tell us what you think',
    message: `Your complaint ${complaintNumber} has been closed. Please share your feedback on how it was handled.`,
    complaintId,
    priority: 'NORMAL',
  })
}

export async function assignComplaint(
  id: string,
  adminUserId: string,
  role: string,
  assignedToId?: string,
  departmentId?: string,
) {
  const complaint = await getComplaintById(id)

  let targetId: string | null = complaint.assignedToId
  let targetDepartmentId: string | null = complaint.departmentId

  if (assignedToId) {
    const target = await prisma.user.findUnique({ where: { id: assignedToId } })
    if (!target || target.role !== 'STAFF') {
      throw new ApiError(422, 'Assignee must be an active STAFF member')
    }
    targetId = target.id
    if (target.departmentId) targetDepartmentId = target.departmentId
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!department) throw new ApiError(422, 'Department does not exist')
    targetDepartmentId = department.id
  }

  const prevAssigneeId = complaint.assignedToId
  const prevDepartmentId = complaint.departmentId
  const newStatus = complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW' ? 'ASSIGNED' : complaint.status

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        assignedToId: targetId,
        departmentId: targetDepartmentId,
        assignedAt: targetId ? new Date() : complaint.assignedAt,
        status: newStatus,
      },
      include: COMPLAINT_INCLUDE,
    })

    await tx.complaintAssignment.create({
      data: {
        complaintId: id,
        assignedTo: targetId,
        assignedBy: adminUserId,
        departmentId: targetDepartmentId,
        reason: assignedToId ? 'Assigned to a specific staff member.' : 'Complaint moved to assigned department.',
        unassignedAt: !targetId ? new Date() : null,
      },
    })

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        userId: adminUserId,
        oldStatus: complaint.status,
        newStatus: result.status,
        comment: assignedToId
          ? `Assigned to ${await staffNameTx(tx, assignedToId)}`
          : 'Complaint moved to assigned department.',
      },
    })

    return result
  })

  await invalidateComplaintCaches(updated)

  if (targetId && targetId !== prevAssigneeId) {
    await createNotification({
      userId: targetId,
      type: 'COMPLAINT_ASSIGNED',
      title: 'Complaint assigned',
      message: `Complaint ${complaint.complaintNumber} has been assigned to you.`,
      complaintId: id,
      priority: 'IMPORTANT',
      metadata: { reassigned: prevAssigneeId != null },
    })
  }

  // Let the previous assignee know they are no longer responsible.
  if (prevAssigneeId && prevAssigneeId !== targetId) {
    await createNotification({
      userId: prevAssigneeId,
      type: 'STATUS_UPDATED',
      title: 'Complaint reassigned',
      message: `Complaint ${complaint.complaintNumber} is no longer assigned to you.`,
      complaintId: id,
    })
  }

  void role
  void prevDepartmentId

  await recordAudit({
    userId: adminUserId,
    action: 'ASSIGN_COMPLAINT',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { assignedToId: prevAssigneeId, departmentId: prevDepartmentId },
    newValue: { assignedToId: targetId, departmentId: targetDepartmentId, status: newStatus },
  })

  return updated
}

async function staffNameTx(tx: Prisma.TransactionClient, userId: string): Promise<string> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
  return user?.name ?? 'staff'
}

export async function addComment(
  complaintId: string,
  userId: string,
  role: string,
  content: string,
) {
  const complaint = await getComplaintById(complaintId)
  const isOwner = complaint.userId === userId
  const isAdmin = role === 'ADMIN'
  const isAssigned = complaint.assignedToId === userId

  if (!isOwner && !isAdmin && !isAssigned) {
    throw new ApiError(403, 'You are not allowed to comment on this complaint')
  }

  const update = await prisma.complaintUpdate.create({
    data: {
      complaintId,
      userId,
      oldStatus: complaint.status,
      newStatus: complaint.status,
      comment: content,
    },
  })

  await invalidateComplaintCaches(complaint)

  const recipient = isOwner ? complaint.assignedToId : complaint.userId
  if (recipient && recipient !== userId) {
    await createNotification({
      userId: recipient,
      type: 'COMMENT_ADDED',
      title: 'New comment',
      message: `A new comment was added to complaint ${complaint.complaintNumber}.`,
      complaintId,
    })
  }

  return update
}

export async function listOverdue(page: number, limit: number) {
  const data = await prisma.complaint.findMany({ include: COMPLAINT_INCLUDE })
  const overdue = data.filter(isOverdueLoose)
  const total = overdue.length
  const paginated = overdue.slice((page - 1) * limit, page * limit)

  return { data: paginated, page, limit, total, totalPages: Math.ceil(total / limit) }
}

function isOverdueLoose(complaint: {
  createdAt: Date
  status: string
  priority: string
}): boolean {
  if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) return false
  const hours = SLA_HOURS[complaint.priority]
  const deadline = new Date(complaint.createdAt.getTime() + hours * 60 * 60 * 1000)
  return new Date() > deadline
}

const SLA_HOURS: Record<string, number> = {
  LOW: 7 * 24,
  MEDIUM: 5 * 24,
  HIGH: 2 * 24,
  CRITICAL: 24,
}

export function severityForPriority(priority: Priority): number {
  switch (priority) {
    case 'LOW':
      return 1
    case 'MEDIUM':
      return 2
    case 'HIGH':
      return 3
    case 'CRITICAL':
      return 5
    default:
      return 2
  }
}

export async function changePriority(
  id: string,
  userId: string,
  role: string,
  newPriority: Priority,
) {
  const complaint = await getComplaintById(id)
  const requestingUser = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin = role === 'ADMIN'
  const isAssignee = complaint.assignedToId === userId
  const isDepartmentStaff =
    role === 'STAFF' &&
    requestingUser != null &&
    complaint.departmentId != null &&
    requestingUser.departmentId === complaint.departmentId

  if (!isAdmin && !isAssignee && !isDepartmentStaff) {
    throw new ApiError(403, 'You are not allowed to change this complaint priority')
  }
  if (complaint.priority === newPriority) return complaint

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      priority: newPriority,
      severityScore: severityForPriority(newPriority),
    },
    include: COMPLAINT_INCLUDE,
  })

  await prisma.complaintUpdate.create({
    data: {
      complaintId: id,
      userId,
      oldStatus: complaint.status,
      newStatus: complaint.status,
      comment: `Priority changed from ${complaint.priority} to ${newPriority}.`,
    },
  })

  await invalidateComplaintCaches(updated)

  // Notify the citizen and the assigned agent when the priority changes.
  const recipients = [...new Set([complaint.userId, complaint.assignedToId].filter((id): id is string => !!id))]
  await Promise.all(
    recipients
      .filter((recipientId) => recipientId !== userId)
      .map((recipientId) =>
        createNotification({
          userId: recipientId,
          type: 'COMPLAINT_PRIORITY_CHANGED',
          title: 'Priority updated',
          message: `Priority of complaint ${complaint.complaintNumber} changed from ${complaint.priority} to ${newPriority}.`,
          complaintId: id,
          priority: 'IMPORTANT',
          metadata: { from: complaint.priority, to: newPriority },
        }),
      ),
  )

  await recordAudit({
    userId,
    action: 'CHANGE_PRIORITY',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { priority: complaint.priority },
    newValue: { priority: newPriority },
  })

  return updated
}

/**
 * Resolves a complaint in one step (RESOLVED + resolution comment). The actor
 * must be ADMIN, the assigned agent, or a member of the complaint's department.
 */
export async function resolveComplaint(
  id: string,
  userId: string,
  role: string,
  comment: string,
) {
  const complaint = await getComplaintById(id)
  if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
    throw new ApiError(409, 'Complaint is already resolved, closed or rejected')
  }
  if (['SUBMITTED', 'UNDER_REVIEW'].includes(complaint.status)) {
    throw new ApiError(409, 'Complaint must be assigned and under work before it can be resolved')
  }

  const requestingUser = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin = role === 'ADMIN'
  const isAssignee = complaint.assignedToId === userId
  const isDepartmentStaff =
    role === 'STAFF' &&
    requestingUser != null &&
    complaint.departmentId != null &&
    requestingUser.departmentId === complaint.departmentId

  if (!isAdmin && !isAssignee && !isDepartmentStaff) {
    throw new ApiError(403, 'You are not allowed to resolve this complaint')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
      include: COMPLAINT_INCLUDE,
    })

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        userId,
        oldStatus: complaint.status,
        newStatus: 'RESOLVED',
        comment,
      },
    })

    return result
  })

  await invalidateComplaintCaches(updated)

  await createNotification({
    userId: complaint.userId,
    type: 'COMPLAINT_RESOLVED',
    title: 'Complaint resolved',
    message: `Your complaint ${complaint.complaintNumber} has been resolved. Please provide feedback.`,
    complaintId: id,
  })

  await recordAudit({
    userId,
    action: 'RESOLVE_COMPLAINT',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { status: complaint.status },
    newValue: { status: 'RESOLVED', comment },
  })

  return updated
}

/**
 * Reopens a terminal complaint (RESOLVED / CLOSED / REJECTED) back to
 * IN_PROGRESS so further work can continue. Allowed for the admin, the current
 * assignee or a member of the owning department. The citizen and the assignee
 * are notified with a COMPLAINT_REOPENED notification.
 */
export async function reopenComplaint(
  id: string,
  userId: string,
  role: string,
  comment?: string,
) {
  const complaint = await getComplaintById(id)

  if (!['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
    throw new ApiError(409, 'Only resolved, closed or rejected complaints can be reopened')
  }

  const requestingUser = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin = role === 'ADMIN'
  const isAssignee = complaint.assignedToId === userId
  const isDepartmentStaff =
    role === 'STAFF' &&
    requestingUser != null &&
    complaint.departmentId != null &&
    requestingUser.departmentId === complaint.departmentId

  if (!isAdmin && !isAssignee && !isDepartmentStaff) {
    throw new ApiError(403, 'You are not allowed to reopen this complaint')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS' as ComplaintStatus,
        reopenedAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
      include: COMPLAINT_INCLUDE,
    })

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        userId,
        oldStatus: complaint.status,
        newStatus: 'IN_PROGRESS',
        comment: comment ?? 'Complaint reopened for further action.',
      },
    })

    return result
  })

  await invalidateComplaintCaches(updated)

  // Notify the citizen + assignee (privacy: separate rows for each).
  const recipientIds = [...new Set([complaint.userId, complaint.assignedToId].filter((id): id is string => !!id))]
  await Promise.all(
    recipientIds.map((recipientId) =>
      createNotification({
        userId: recipientId,
        type: 'COMPLAINT_REOPENED',
        title: 'Complaint reopened',
        message: `Complaint ${complaint.complaintNumber} has been reopened for further action.`,
        complaintId: id,
        priority: 'IMPORTANT',
      }),
    ),
  )

  // Also notify department staff + admins so the reopen is visible.
  const staffAndAdmins = await getAdminAndStaffIds(complaint.departmentId)
  const staffRecipients = staffAndAdmins.filter((staffId) => !recipientIds.includes(staffId))
  if (staffRecipients.length > 0) {
    await notifyMany(
      staffRecipients.map((staffId) => ({
        userId: staffId,
        type: 'COMPLAINT_REOPENED' as const,
        title: 'Complaint reopened',
        message: `Complaint ${complaint.complaintNumber} has been reopened for further action.`,
        complaintId: id,
        priority: 'IMPORTANT' as const,
      })),
    )
  }

  await recordAudit({
    userId,
    action: 'REOPEN_COMPLAINT',
    entityType: 'Complaint',
    entityId: id,
    oldValue: { status: complaint.status },
    newValue: { status: 'IN_PROGRESS', reopenedAt: updated.reopenedAt, comment: comment ?? null },
  })

  return updated
}