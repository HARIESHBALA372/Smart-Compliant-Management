import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { ApiError, sendSuccess } from '../utils/http'
import { hashPassword } from '../utils/password'
import { parsePagination } from '../middleware/validation'
import { recordAudit } from '../services/audit.service'
import { getSlaRules, upsertSlaRules } from '../services/sla.service'
import { listAgents } from '../services/agent.service'
import { listEscalations } from '../services/escalation.service'
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../services/department.service'

export async function dashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [users, complaints, resolved, open] = await Promise.all([
      prisma.user.count(),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.complaint.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } } }),
    ])

    sendSuccess(res, 'Admin dashboard fetched', { users, complaints, resolved, open })
  } catch (error) {
    next(error)
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const role = req.query.role as string | undefined
    const search = req.query.search as string | undefined

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.user.count({ where })
    const data = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true,
        department: true, departmentId: true, createdAt: true, updatedAt: true,
      },
    })

    sendSuccess(res, 'Users fetched', data, 200, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true,
        departmentId: true, department: true, createdAt: true, updatedAt: true,
      },
    })
    if (!user) throw new ApiError(404, 'User not found')
    sendSuccess(res, 'User fetched', user)
  } catch (error) {
    next(error)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, password, role, departmentId } = req.body
    const emailLower = String(email).toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: emailLower } })
    if (existing) throw new ApiError(409, 'Email already registered')

    const hashed = await hashPassword(String(password))
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: emailLower,
        phone: phone || null,
        password: hashed,
        role,
        departmentId: departmentId || null,
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true, departmentId: true, createdAt: true,
      },
    })

    await recordAudit({
      userId: req.user!.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role, departmentId: user.departmentId },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })

    sendSuccess(res, 'User created', user, 201)
  } catch (error) {
    next(error)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'User not found')

    const data: Record<string, unknown> = {}
    if (req.body.name !== undefined) data.name = String(req.body.name).trim()
    if (req.body.phone !== undefined) data.phone = req.body.phone || null
    if (req.body.role !== undefined) data.role = req.body.role
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive
    if (req.body.departmentId !== undefined) data.departmentId = req.body.departmentId || null
    if (req.body.password) data.password = await hashPassword(String(req.body.password))

    if (req.body.email !== undefined) {
      const email = String(req.body.email).toLowerCase().trim()
      const dup = await prisma.user.findFirst({ where: { email, NOT: { id } } })
      if (dup) throw new ApiError(409, 'Email already registered')
      data.email = email
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true,
        departmentId: true, createdAt: true, updatedAt: true,
      },
    })

    await recordAudit({
      userId: req.user!.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      oldValue: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        isActive: existing.isActive,
        departmentId: existing.departmentId,
      },
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        departmentId: user.departmentId,
      },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })

    sendSuccess(res, 'User updated', user)
  } catch (error) {
    next(error)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id
    if (id === req.user!.id) throw new ApiError(409, 'You cannot delete your own account')

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ApiError(404, 'User not found')
    if (user.role === 'ADMIN') throw new ApiError(409, 'Admin accounts cannot be deleted')

    const loads = await prisma.complaint.count({ where: { userId: id } })
    if (loads > 0) {
      await prisma.user.update({ where: { id }, data: { isActive: false } })
      await recordAudit({
        userId: req.user!.id,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: id,
        newValue: { deactivated: true, reason: 'has existing records' },
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      })
      sendSuccess(res, 'User has existing records and was deactivated instead of deleted')
      return
    }

    await prisma.user.delete({ where: { id } })
    await recordAudit({
      userId: req.user!.id,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      newValue: { deleted: true },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'User deleted')
  } catch (error) {
    next(error)
  }
}

export async function getSLA(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSlaRules()
    sendSuccess(res, 'SLA configuration fetched', data)
  } catch (error) {
    next(error)
  }
}

export async function updateSLA(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body]
    const data = await upsertSlaRules(entries)
    await recordAudit({
      userId: req.user!.id,
      action: 'UPDATE_SLA',
      entityType: 'SlaRule',
      newValue: entries,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'SLA configuration updated', data)
  } catch (error) {
    next(error)
  }
}

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.complaintCategory.findMany({
      orderBy: { createdAt: 'asc' },
      include: { department: { select: { id: true, name: true } } },
    })
    sendSuccess(res, 'Categories fetched', categories)
  } catch (error) {
    next(error)
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, departmentId, defaultPriority, isActive } = req.body
    const exists = await prisma.complaintCategory.findUnique({ where: { name: String(name).trim() } })
    if (exists) throw new ApiError(409, 'A category with this name already exists')

    const department = departmentId
      ? await prisma.department.findUnique({ where: { id: departmentId } })
      : null
    if (departmentId && !department) throw new ApiError(404, 'Department not found')

    const category = await prisma.complaintCategory.create({
      data: {
        name: String(name).trim(),
        description: description || null,
        departmentId: departmentId || null,
        defaultPriority: defaultPriority ?? 'MEDIUM',
        isActive: isActive ?? true,
      },
      include: { department: { select: { id: true, name: true } } },
    })

    await recordAudit({
      userId: req.user!.id,
      action: 'CREATE_CATEGORY',
      entityType: 'ComplaintCategory',
      entityId: category.id,
      newValue: { name: category.name, departmentId: category.departmentId, defaultPriority: category.defaultPriority },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })

    sendSuccess(res, 'Category created', category, 201)
  } catch (error) {
    next(error)
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id
    const existing = await prisma.complaintCategory.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Category not found')

    if (req.body.name) {
      const dup = await prisma.complaintCategory.findFirst({
        where: { name: String(req.body.name).trim(), NOT: { id } },
      })
      if (dup) throw new ApiError(409, 'A category with this name already exists')
    }

    const data: Record<string, unknown> = {}
    if (req.body.name !== undefined) data.name = String(req.body.name).trim()
    if (req.body.description !== undefined) data.description = req.body.description || null
    if (req.body.departmentId !== undefined) {
      if (req.body.departmentId) {
        const department = await prisma.department.findUnique({ where: { id: req.body.departmentId } })
        if (!department) throw new ApiError(404, 'Department not found')
        data.departmentId = req.body.departmentId
      } else {
        data.departmentId = null
      }
    }
    if (req.body.defaultPriority !== undefined) data.defaultPriority = req.body.defaultPriority
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive

    const category = await prisma.complaintCategory.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    })

    await recordAudit({
      userId: req.user!.id,
      action: 'UPDATE_CATEGORY',
      entityType: 'ComplaintCategory',
      entityId: id,
      oldValue: { name: existing.name, departmentId: existing.departmentId },
      newValue: data,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })

    sendSuccess(res, 'Category updated', category)
  } catch (error) {
    next(error)
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id
    const existing = await prisma.complaintCategory.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Category not found')

    await prisma.complaintCategory.delete({ where: { id } })

    await recordAudit({
      userId: req.user!.id,
      action: 'DELETE_CATEGORY',
      entityType: 'ComplaintCategory',
      entityId: id,
      newValue: { name: existing.name },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })

    sendSuccess(res, 'Category deleted')
  } catch (error) {
    next(error)
  }
}

export async function createDepartmentAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await createDepartment({
      name: req.body.name,
      description: req.body.description || undefined,
      ...(req.body.contactEmail ? { contactEmail: req.body.contactEmail } : {}),
      ...(req.body.contactPhone ? { contactPhone: req.body.contactPhone } : {}),
    })
    await recordAudit({
      userId: req.user!.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: data.id,
      newValue: { name: data.name },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'Department created', data, 201)
  } catch (error) {
    next(error)
  }
}

export async function updateDepartmentAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateDepartment(req.params.id, {
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description } : {}),
      ...(req.body.contactEmail !== undefined ? { contactEmail: req.body.contactEmail } : {}),
      ...(req.body.contactPhone !== undefined ? { contactPhone: req.body.contactPhone } : {}),
      ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
    })
    await recordAudit({
      userId: req.user!.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: req.params.id,
      newValue: data,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'Department updated', data)
  } catch (error) {
    next(error)
  }
}

export async function deleteDepartmentAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existed = await prisma.department.findUnique({ where: { id: req.params.id } })
    await deleteDepartment(req.params.id)
    await recordAudit({
      userId: req.user!.id,
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: req.params.id,
      newValue: existed ? { name: existed.name } : {},
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
    sendSuccess(res, 'Department deleted')
  } catch (error) {
    next(error)
  }
}

export async function agents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listAgents({
      departmentId: (req.query.departmentId as string | undefined) || undefined,
      search: (req.query.search as string | undefined) || undefined,
      page,
      limit,
    })
    sendSuccess(res, 'Agents fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}

export async function escalations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const status = req.query.status === 'resolved' ? 'resolved' : req.query.status === 'open' ? 'open' : undefined
    const result = await listEscalations(page, limit, status)
    sendSuccess(res, 'Escalations fetched', result.data, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    next(error)
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const search = (req.query.search as string | undefined)?.toLowerCase()
    const action = req.query.action as string | undefined

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (search) {
      where.OR = [
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const total = await prisma.auditLog.count({ where })
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    })

    const data = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user?.name ?? null,
      action: l.action,
      resource: l.entityType,
      resourceId: l.entityId,
      details: { ...(l.oldValue as Record<string, unknown> | undefined), ...(l.newValue as Record<string, unknown> | undefined) },
      oldValue: l.oldValue,
      newValue: l.newValue,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
    }))

    sendSuccess(res, 'Audit logs fetched', data, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
}