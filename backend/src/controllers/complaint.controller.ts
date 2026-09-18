import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  changeStatus,
  assignComplaint,
  addComment,
  listOverdue,
  changePriority,
  resolveComplaint,
  reopenComplaint,
} from '../services/complaint.service'
import { escalateComplaint } from '../services/escalation.service'
import { recommendAgents } from '../services/agent.service'
import { classifyComplaint } from '../services/classification.service'
import { classifyWithML } from '../services/ml.service'
import { prisma } from '../config/database'
import { sendSuccess, ApiError } from '../utils/http'
import { parsePagination } from '../middleware/validation'
import { publicUrl } from '../middleware/upload'

function extractFiles(req: Request) {
  const image = req.files && (req.files as { image?: Express.Multer.File[] }).image?.[0]
  const document = req.files && (req.files as { document?: Express.Multer.File[] }).document?.[0]

  const allFiles: Express.Multer.File[] = []
  if (req.files) {
    for (const group of Object.values(req.files as Record<string, Express.Multer.File[]>)) {
      allFiles.push(...group)
    }
  }

  // The first image/document become imageUrl/documentUrl; the rest are stored
  // as structured ComplaintAttachment rows.
  const attachments = allFiles
    .filter((f) => !(f === image || f === document))
    .map((f) => ({
      fileName: f.originalname || f.filename,
      fileUrl: publicUrl(f.filename),
      fileType: f.mimetype,
      fileSize: f.size,
    }))

  return {
    imageUrl: image ? publicUrl(image.filename) : null,
    documentUrl: document ? publicUrl(document.filename) : null,
    attachments,
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = extractFiles(req)
    const { title = '', description = '' } = req.body
    const ml = await classifyWithML({
      text: `${title} ${description}`,
      location: req.body.location,
      userId: req.user!.id,
    })
    const classification = ml ?? classifyComplaint(title, description)

    const complaint = await createComplaint({
      userId: req.user!.id,
      title,
      description,
      category: req.body.category,
      priority: req.body.priority,
      location: req.body.location,
      latitude: req.body.latitude ?? null,
      longitude: req.body.longitude ?? null,
      imageUrl: files.imageUrl,
      documentUrl: files.documentUrl,
      attachments: files.attachments,
      classification: {
        category: classification.category,
        priority: classification.priority,
        confidence: classification.confidence,
        keywords: classification.keywords,
        suggestedDepartment: classification.suggestedDepartment,
      },
    })

    sendSuccess(res, 'Complaint submitted successfully', complaint, 201)
  } catch (error) {
    next(error)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)

    const role = req.user!.role
    const filters: Record<string, unknown> = {
      status: req.query.status as string | undefined,
      category: req.query.category as string | undefined,
      priority: req.query.priority as string | undefined,
      search: req.query.search as string | undefined,
    }

    if (role === 'USER') {
      filters.userId = req.user!.id
    } else if (role === 'STAFF') {
      const staff = await prisma.user.findUnique({ where: { id: req.user!.id } })
      const departmentId = staff?.departmentId ?? undefined
      if (req.query.onlyAssigned === 'true') {
        filters.assignedToId = req.user!.id
      } else {
        filters.departmentId = departmentId
      }
    }

    const result = await listComplaints(filters as never, page, limit)
    sendSuccess(res, 'Complaints fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await getComplaintById(req.params.id)
    const role = req.user!.role
    const isOwner = complaint.userId === req.user!.id
    const isAssigned = complaint.assignedToId === req.user!.id

    if (role === 'USER' && !isOwner) {
      throw new ApiError(403, 'You can only view your own complaints')
    }
    if (role === 'STAFF' && !isAssigned && !isOwner) {
      const staff = await prisma.user.findUnique({ where: { id: req.user!.id } })
      if (complaint.departmentId && staff?.departmentId !== complaint.departmentId) {
        throw new ApiError(403, 'This complaint is not in your department')
      }
    }

    sendSuccess(res, 'Complaint fetched', complaint)
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await updateComplaint(req.params.id, req.user!.id, req.user!.role, req.body)
    sendSuccess(res, 'Complaint updated', complaint)
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteComplaint(req.params.id, req.user!.id, req.user!.role)
    sendSuccess(res, 'Complaint deleted')
  } catch (error) {
    next(error)
  }
}

export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await changeStatus(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.status,
      req.body.comment,
    )
    sendSuccess(res, `Complaint status changed to ${req.body.status}`, updated)
  } catch (error) {
    next(error)
  }
}

export async function assign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await assignComplaint(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.assignedToId,
      req.body.departmentId,
    )
    sendSuccess(res, 'Complaint assignment updated', updated)
  } catch (error) {
    next(error)
  }
}

export async function listAssigned(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listComplaints(
      { assignedToId: req.user!.id, search: req.query.search as string | undefined },
      page,
      limit,
    )
    sendSuccess(res, 'Assigned complaints fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.user!.role as Role
    const userId = req.user!.id

    const where =
      role === 'USER'
        ? { userId }
        : role === 'STAFF'
          ? {
              OR: [{ assignedToId: userId }, { department: { users: { some: { id: userId } } } }],
            }
          : {}

    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({ where: { ...where, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'] } } }),
      prisma.complaint.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.complaint.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.complaint.count({ where: { ...where, status: 'REJECTED' } }),
    ])

    sendSuccess(res, 'Complaint stats fetched', { total, pending, inProgress, resolved, rejected })
  } catch (error) {
    next(error)
  }
}

export async function comment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await addComment(req.params.id, req.user!.id, req.user!.role, req.body.content)
    sendSuccess(res, 'Comment added', result, 201)
  } catch (error) {
    next(error)
  }
}

export async function overdue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listOverdue(page, limit)
    sendSuccess(res, 'Overdue complaints fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}

export async function escalate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await escalateComplaint({
      complaintId: req.params.id,
      escalatedBy: req.user!.id,
      reason: req.body.reason,
      toLevel: req.body.toLevel,
      escalatedToId: req.body.escalatedToId,
    })
    sendSuccess(res, 'Complaint escalated', result, 201)
  } catch (error) {
    next(error)
  }
}

export async function priority(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await changePriority(req.params.id, req.user!.id, req.user!.role, req.body.priority)
    sendSuccess(res, `Complaint priority changed to ${req.body.priority}`, updated)
  } catch (error) {
    next(error)
  }
}

export async function resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await resolveComplaint(req.params.id, req.user!.id, req.user!.role, req.body.comment)
    sendSuccess(res, 'Complaint resolved', updated)
  } catch (error) {
    next(error)
  }
}

export async function reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await reopenComplaint(req.params.id, req.user!.id, req.user!.role, req.body.comment)
    sendSuccess(res, 'Complaint reopened', updated)
  } catch (error) {
    next(error)
  }
}

export async function recommend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await recommendAgents(req.params.id)
    sendSuccess(res, 'Agent recommendations fetched', result)
  } catch (error) {
    next(error)
  }
}