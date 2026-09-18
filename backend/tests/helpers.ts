import { prisma } from '../src/config/database'

export async function clearDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.notificationPreferences.deleteMany()
  await prisma.complaintEscalation.deleteMany()
  await prisma.slaRule.deleteMany()
  await prisma.complaintAssignment.deleteMany()
  await prisma.complaintAttachment.deleteMany()
  await prisma.complaintUpdate.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.user.deleteMany()
  await prisma.complaintCategory.deleteMany()
  await prisma.department.deleteMany()
}

export async function createTestUser(overrides: Partial<{
  name: string
  email: string
  phone: string
  password: string
  role: 'USER' | 'STAFF' | 'ADMIN'
  departmentId: string | null
}>) {
  const bcrypt = await import('bcrypt')
  const hashed = await bcrypt.hash(overrides.password ?? 'Test1234!', 10)

  const departmentId = overrides.departmentId !== undefined ? overrides.departmentId : null
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`,
      phone: overrides.phone ?? '9000000000',
      password: hashed,
      role: overrides.role ?? 'USER',
      departmentId,
    },
  })
}

export async function getOrCreateDepartment(name: string) {
  const existing = await prisma.department.findUnique({ where: { name } })
  if (existing) return existing
  return prisma.department.create({ data: { name } })
}