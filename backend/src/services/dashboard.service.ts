import { prisma } from '../config/database'
import { complaintIsOverdue } from '../utils/http'
import { CACHE_TTL, Keys, cacheRemember } from './redis/cache.service'

export async function getDashboardSummary() {
  return cacheRemember(Keys.dashboardStats(), CACHE_TTL.dashboardStats, async () => {
    const total = await prisma.complaint.count()

    const [submitted, underReview, assigned, inProgress, resolved, rejected, closed] =
      await Promise.all(
        ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'].map(
          (status) => prisma.complaint.count({ where: { status: status as never } }),
        ),
      )

    const byCategory = await prisma.complaint.groupBy({
      by: ['category'],
      _count: { _all: true },
    })

    const byPriority = await prisma.complaint.groupBy({
      by: ['priority'],
      _count: { _all: true },
    })

    const allActive = await prisma.complaint.findMany({
      select: { id: true, complaintNumber: true, createdAt: true, status: true, priority: true, title: true, category: true },
    })

    const overdueCount = allActive.filter(complaintIsOverdue).length
    const recent = await prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true, department: true, assignedTo: true },
    })

    return {
      counts: { total, submitted, underReview, assigned, inProgress, resolved, rejected, closed },
      overdueCount,
      byCategory,
      byPriority,
      recent,
    }
  })
}

/**
 * Per-department statistics, cached in Redis for 2 minutes. Invalidated by
 * `invalidateComplaintCaches` whenever a complaint in the department changes.
 */
export async function getDepartmentStats(departmentId: string) {
  return cacheRemember(Keys.departmentStats(departmentId), CACHE_TTL.departmentStats, async () => {
    const [total, open, inProgress, resolved, critical, staffCount] = await Promise.all([
      prisma.complaint.count({ where: { departmentId } }),
      prisma.complaint.count({
        where: { departmentId, status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
      }),
      prisma.complaint.count({ where: { departmentId, status: 'IN_PROGRESS' } }),
      prisma.complaint.count({
        where: { departmentId, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      prisma.complaint.count({ where: { departmentId, priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } } }),
      prisma.user.count({ where: { departmentId, role: 'STAFF', isActive: true } }),
    ])

    return { departmentId, total, open, inProgress, resolved, critical, staffCount }
  })
}

export async function getAnalytics(startDate?: string, endDate?: string) {
  const gte = startDate ? new Date(startDate) : undefined
  const lte = endDate ? new Date(endDate) : undefined
  const dateFilter = { createdAt: { gte, lte } as never }

  const [byCategory, byPriority, byStatus, trend, breakthrough] = await Promise.all([
    prisma.complaint.groupBy({ by: ['category'], _count: { _all: true }, where: dateFilter }),
    prisma.complaint.groupBy({ by: ['priority'], _count: { _all: true }, where: dateFilter }),
    prisma.complaint.groupBy({ by: ['status'], _count: { _all: true }, where: dateFilter }),
    monthlyTrend(),
    averageResolutionDays(dateFilter),
  ])

  return {
    categoryDistribution: byCategory.map((r) => ({ category: r.category, count: r._count._all })),
    priorityDistribution: byPriority.map((r) => ({ priority: r.priority, count: r._count._all })),
    statusDistribution: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    monthlyTrend: trend,
    averageResolutionDays: breakthrough,
  }
}

async function monthlyTrend() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const rows = (await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
      COUNT(*)::int AS value
    FROM "Complaint"
    WHERE "createdAt" >= ${start}
    GROUP BY 1
    ORDER BY 1
  `) as Array<{ month: string; value: number }>

  return rows
}

async function averageResolutionDays(dateFilter: { createdAt: { gte?: Date; lte?: Date } }) {
  const resolved = await prisma.complaint.findMany({
    where: { resolvedAt: { not: null }, ...dateFilter },
    select: { createdAt: true, resolvedAt: true },
  })

  if (resolved.length === 0) return 0

  const totalMs = resolved.reduce((sum, r) => {
    const resolvedAt = r.resolvedAt as Date
    return sum + (resolvedAt.getTime() - r.createdAt.getTime())
  }, 0)

  return Math.round((totalMs / resolved.length) / (1000 * 60 * 60 * 24) * 100) / 100
}

export async function getAgentPerformance() {
  const staff = await prisma.user.findMany({
    where: { role: 'STAFF', isActive: true, departmentId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      departmentId: true,
      _count: { select: { assignedComplaints: true } },
    },
  })

  const staffIds = staff.map((s) => s.id)
  const statusCounts = await prisma.complaint.groupBy({
    by: ['assignedToId', 'status'],
    where: { assignedToId: { in: staffIds } },
    _count: { _all: true },
  })

  return staff.map((member) => {
    const resolved = statusCounts
      .filter((s) => s.assignedToId === member.id && s.status === 'RESOLVED')
      .reduce((sum, s) => sum + s._count._all, 0)
    const inProgress = statusCounts
      .filter((s) => s.assignedToId === member.id && s.status === 'IN_PROGRESS')
      .reduce((sum, s) => sum + s._count._all, 0)

    return {
      staffId: member.id,
      name: member.name,
      email: member.email,
      assignedCount: member._count.assignedComplaints,
      resolvedCount: resolved,
      inProgressCount: inProgress,
    }
  })
}

export async function listOverdueComplaints(page: number, limit: number) {
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: 'asc' },
    include: { user: true, department: true, assignedTo: true },
  })

  const overdue = complaints.filter(complaintIsOverdue)
  const total = overdue.length
  return {
    data: overdue.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}