import { prisma } from '../config/database'
import { ApiError, SLA_HOURS_BY_PRIORITY, isTerminalStatus } from '../utils/http'

/**
 * Agent/STAFF management: workload metrics for the admin module, the
 * per-agent dashboard and smart agent recommendation for a complaint.
 */

interface AgentWithWorkload {
  id: string
  name: string
  email: string
  phone: string | null
  departmentId: string | null
  department: { id: string; name: string } | null
  assigned: number
  open: number
  inProgress: number
  waiting: number
  resolved: number
  critical: number
  overdue: number
  avgResolutionHours: number
  slaCompliance: number
}

const TERMINAL = ['RESOLVED', 'CLOSED', 'REJECTED'] as const

export async function listAgents(filters: {
  departmentId?: string
  search?: string
  page: number
  limit: number
}) {
  const where: Record<string, unknown> = { role: 'STAFF', isActive: true }
  if (filters.departmentId) where.departmentId = filters.departmentId
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const total = await prisma.user.count({ where })
  const staff = await prisma.user.findMany({
    where,
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  })

  const data = await Promise.all(staff.map((agent) => loadAgentWorkload(agent)))

  return {
    data,
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.ceil(total / filters.limit),
  }
}

async function loadAgentWorkload(agent: {
  id: string
  name: string
  email: string
  phone: string | null
  departmentId: string | null
  department: { id: string; name: string } | null
}): Promise<AgentWithWorkload> {
  const assigned = await prisma.complaint.count({ where: { assignedToId: agent.id } })
  const open = await prisma.complaint.count({
    where: { assignedToId: agent.id, status: { notIn: [...TERMINAL] } },
  })
  const inProgress = await prisma.complaint.count({
    where: { assignedToId: agent.id, status: 'IN_PROGRESS' },
  })
  const waiting = await prisma.complaint.count({
    where: { assignedToId: agent.id, status: 'WAITING_FOR_USER' },
  })
  const resolved = await prisma.complaint.count({
    where: { assignedToId: agent.id, status: { in: ['RESOLVED', 'CLOSED'] } },
  })
  const critical = await prisma.complaint.count({
    where: { assignedToId: agent.id, priority: 'CRITICAL', status: { notIn: [...TERMINAL] } },
  })

  const openAssigned = await prisma.complaint.findMany({
    where: { assignedToId: agent.id, status: { notIn: [...TERMINAL] } },
    select: { createdAt: true, priority: true },
  })
  const overdue = openAssigned.filter((c) => isComplaintOverdueFor(c, SLA_HOURS_BY_PRIORITY[c.priority])).length

  const resolvedRows = await prisma.complaint.findMany({
    where: { assignedToId: agent.id, resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true, priority: true },
  })

  const avgResolutionHours =
    resolvedRows.length > 0
      ? resolvedRows.reduce((sum, c) => sum + (c.resolvedAt!.getTime() - c.createdAt.getTime()), 0) /
        resolvedRows.length /
        (60 * 60 * 1000)
      : 0

  const withinSla = resolvedRows.filter(
    (c) => c.resolvedAt!.getTime() - c.createdAt.getTime() < SLA_HOURS_BY_PRIORITY[c.priority] * 60 * 60 * 1000,
  ).length
  const slaCompliance = resolvedRows.length > 0 ? Math.round((withinSla / resolvedRows.length) * 100) : 100

  return {
    ...agent,
    assigned,
    open,
    inProgress,
    waiting,
    resolved,
    critical,
    overdue,
    avgResolutionHours: Math.round(avgResolutionHours * 100) / 100,
    slaCompliance,
  }
}

function isComplaintOverdueFor(
  complaint: { createdAt: Date; priority: string },
  hours: number,
): boolean {
  const deadline = new Date(complaint.createdAt.getTime() + hours * 60 * 60 * 1000)
  return new Date() > deadline
}

export interface AgentRecommendation {
  agentId: string
  name: string
  email: string
  departmentId: string | null
  departmentName: string | null
  openComplaints: number
  resolvedCount: number
  score: number
  reason: string
}

/**
 * Ranks active STAFF members for a complaint. Badges preference order:
 * available > same department > lighter current load > proven track record.
 */
export async function recommendAgents(complaintId: string, limit = 5): Promise<AgentRecommendation[]> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { departmentId: true, assignedToId: true },
  })
  if (!complaint) throw new ApiError(404, 'Complaint not found')

  const candidates = await prisma.user.findMany({
    where: { role: 'STAFF', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  })

  const recommendations: AgentRecommendation[] = []
  for (const candidate of candidates) {
    const openCount = await prisma.complaint.count({
      where: { assignedToId: candidate.id, status: { notIn: [...TERMINAL] } },
    })
    const resolvedCount = await prisma.complaint.count({
      where: { assignedToId: candidate.id, status: { in: ['RESOLVED', 'CLOSED'] } },
    })

    let score = 0
    const reasons: string[] = []

    if (candidate.id === complaint.assignedToId) {
      score += 20
      reasons.push('currently assigned')
    }
    if (complaint.departmentId && candidate.departmentId === complaint.departmentId) {
      score += 10
      reasons.push('same department')
    } else {
      score -= 4
      reasons.push('different department')
    }
    if (openCount <= 3) {
      score += 5
      reasons.push('available')
    } else if (openCount <= 6) {
      score += 2
    } else {
      score -= 5
    }
    score += Math.min(resolvedCount, 10) * 0.5

    recommendations.push({
      agentId: candidate.id,
      name: candidate.name,
      email: candidate.email,
      departmentId: candidate.departmentId,
      departmentName: candidate.department?.name ?? null,
      openComplaints: openCount,
      resolvedCount,
      score: Math.round(score * 10) / 10,
      reason: reasons.join(', ') || `light workload (${openCount} open)`,
    })
  }

  recommendations.sort((a, b) => b.score - a.score)
  return recommendations.slice(0, limit)
}

export async function getAgentDashboard(userId: string) {
  const agent = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  })
  if (!agent) throw new ApiError(404, 'Agent not found')

  const whereAssigned = { assignedToId: userId }
  const [assignedTotal, open, inProgress, waiting, resolved, critical] = await Promise.all([
    prisma.complaint.count({ where: whereAssigned }),
    prisma.complaint.count({ where: { ...whereAssigned, status: { notIn: [...TERMINAL] } } }),
    prisma.complaint.count({ where: { ...whereAssigned, status: 'IN_PROGRESS' } }),
    prisma.complaint.count({ where: { ...whereAssigned, status: 'WAITING_FOR_USER' } }),
    prisma.complaint.count({ where: { ...whereAssigned, status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.complaint.count({ where: { ...whereAssigned, priority: 'CRITICAL', status: { notIn: [...TERMINAL] } } }),
  ])

  const openRows = await prisma.complaint.findMany({
    where: { ...whereAssigned, status: { notIn: [...TERMINAL] } },
    select: { createdAt: true, priority: true },
  })
  const overdue = openRows.filter((c) => isComplaintOverdueFor(c, SLA_HOURS_BY_PRIORITY[c.priority])).length

  const resolvedRows = await prisma.complaint.findMany({
    where: { ...whereAssigned, resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true, priority: true },
  })
  const withinSla = resolvedRows.filter(
    (c) => c.resolvedAt!.getTime() - c.createdAt.getTime() < SLA_HOURS_BY_PRIORITY[c.priority] * 60 * 60 * 1000,
  ).length
  const slaCompliance = resolvedRows.length > 0 ? Math.round((withinSla / resolvedRows.length) * 100) : 100

  const recentComplaints = await prisma.complaint.findMany({
    where: whereAssigned,
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: { user: { select: { id: true, name: true } } },
  })

  return {
    agent: { id: agent.id, name: agent.name, email: agent.email, department: agent.department },
    counts: { assigned: assignedTotal, open, inProgress, waiting, resolved, critical, overdue },
    slaCompliance,
    recentComplaints,
  }
}

