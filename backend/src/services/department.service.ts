import { prisma } from '../config/database'
import { ApiError } from '../utils/http'

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { complaints: true, users: true } } },
  })
}

export async function createDepartment(data: {
  name: string
  description?: string
  contactEmail?: string
  contactPhone?: string
}) {
  const existing = await prisma.department.findUnique({ where: { name: data.name } })
  if (existing) throw new ApiError(409, 'Department already exists')

  return prisma.department.create({
    data: {
      name: data.name,
      description: data.description,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    },
  })
}

export async function updateDepartment(id: string, data: {
  name?: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  isActive?: boolean
}) {
  const department = await prisma.department.findUnique({ where: { id } })
  if (!department) throw new ApiError(404, 'Department not found')

  return prisma.department.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      isActive: data.isActive,
    },
  })
}

export async function deleteDepartment(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true, complaints: true } } },
  })
  if (!department) throw new ApiError(404, 'Department not found')
  if (department._count.users > 0 || department._count.complaints > 0) {
    throw new ApiError(409, 'Cannot delete a department that still has users or complaints')
  }

  await prisma.department.delete({ where: { id } })
}

export async function getDepartmentStaff(departmentId: string) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      users: {
        where: { role: { in: ['STAFF'] }, isActive: true },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' },
      },
    },
  })
  if (!department) throw new ApiError(404, 'Department not found')
  return { department: { id: department.id, name: department.name }, staff: department.users }
}