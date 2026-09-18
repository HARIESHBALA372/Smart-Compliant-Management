/**
 * Seed script — creates a realistic dataset for local development and
 * testing: departments, complaint categories, admin, staff (one per
 * department), users, complaints with full status history, notifications
 * and feedback.
 *
 * Usage:
 *   npm run db:seed      (or)    npm run seed
 */
import {
  PrismaClient,
  Role,
  ComplaintStatus,
  Priority,
  Category,
  NotificationType,
} from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function clearDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
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

const daysAgo = (n: number): Date => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const daysFromNow = (n: number): Date => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

async function main(): Promise<void> {
  console.log('🌱 Seeding database...')
  await clearDatabase()

  const hashedPassword = await bcrypt.hash('Password123!', 10)

  // ---------------------------------------------------------------
  // Departments (7)
  // ---------------------------------------------------------------
  const departmentData = [
    { name: 'Water Supply', description: 'Water distribution, pipelines and leak repairs', contactEmail: 'water@city.gov.in', contactPhone: '1800-100-100' },
    { name: 'Electricity', description: 'Street lighting, power lines and electrical faults', contactEmail: 'electricity@city.gov.in', contactPhone: '1800-100-101' },
    { name: 'Roads', description: 'Road maintenance, potholes and infrastructure', contactEmail: 'roads@city.gov.in', contactPhone: '1800-100-102' },
    { name: 'Sanitation', description: 'Garbage collection, waste management and sewage', contactEmail: 'sanitation@city.gov.in', contactPhone: '1800-100-103' },
    { name: 'Public Safety', description: 'Security, lighting and public area safety', contactEmail: 'safety@city.gov.in', contactPhone: '1800-100-104' },
    { name: 'Transportation', description: 'Public transport and traffic management', contactEmail: 'transport@city.gov.in', contactPhone: '1800-100-105' },
    { name: 'General', description: 'Uncategorized or other complaints', contactEmail: null, contactPhone: null },
  ]

  const departments = new Map<string, { id: string; name: string }>()
  for (const d of departmentData) {
    const created = await prisma.department.create({ data: d })
    departments.set(created.name, { id: created.id, name: created.name })
  }
  console.log(`  • Created ${departments.size} departments`)

  // ---------------------------------------------------------------
  // Complaint categories (12)
  // ---------------------------------------------------------------
  const categoryData: {
    name: string
    description: string
    department: string
    defaultPriority: Priority
  }[] = [
    { name: 'Water Leakage', description: 'Leaking pipelines, valves and meter boxes', department: 'Water Supply', defaultPriority: Priority.HIGH },
    { name: 'Water Supply Disruption', description: 'No water / irregular supply in an area', department: 'Water Supply', defaultPriority: Priority.CRITICAL },
    { name: 'Power Failure', description: 'Unplanned outages and transformer faults', department: 'Electricity', defaultPriority: Priority.HIGH },
    { name: 'Street Light Fault', description: 'Street lights not working or damaged', department: 'Electricity', defaultPriority: Priority.MEDIUM },
    { name: 'Voltage Fluctuation', description: 'Unstable voltage damaging appliances', department: 'Electricity', defaultPriority: Priority.MEDIUM },
    { name: 'Road Damage', description: 'Potholes, cracks and damaged surface', department: 'Roads', defaultPriority: Priority.HIGH },
    { name: 'Missing Road Signs', description: 'Damaged or missing signage and signals', department: 'Roads', defaultPriority: Priority.LOW },
    { name: 'Garbage Collection', description: 'Scheduled garbage collection issues', department: 'Sanitation', defaultPriority: Priority.MEDIUM },
    { name: 'Drainage / Sewage Blockage', description: 'Blocked drains and sewage overflow', department: 'Sanitation', defaultPriority: Priority.HIGH },
    { name: 'Public Transport Issue', description: 'Buses, metro and commute problems', department: 'Transportation', defaultPriority: Priority.LOW },
    { name: 'Street Safety Hazard', description: 'Unsafe structures, dark zones, hazards', department: 'Public Safety', defaultPriority: Priority.CRITICAL },
    { name: 'General Complaint', description: 'Anything not covered by the above', department: 'General', defaultPriority: Priority.LOW },
  ]
  for (const c of categoryData) {
    await prisma.complaintCategory.create({
      data: {
        name: c.name,
        description: c.description,
        departmentId: departments.get(c.department)!.id,
        defaultPriority: c.defaultPriority,
      },
    })
  }
  console.log(`  • Created ${categoryData.length} complaint categories`)

  // ---------------------------------------------------------------
  // SLA rules (one per priority)
  // ---------------------------------------------------------------
  const slaRules = [
    { priority: Priority.LOW, responseHours: 24, resolutionHours: 7 * 24 },
    { priority: Priority.MEDIUM, responseHours: 12, resolutionHours: 5 * 24 },
    { priority: Priority.HIGH, responseHours: 4, resolutionHours: 2 * 24 },
    { priority: Priority.CRITICAL, responseHours: 1, resolutionHours: 24 },
  ]
  for (const rule of slaRules) {
    await prisma.slaRule.create({ data: rule })
  }
  console.log(`  • Created ${slaRules.length} SLA rules`)

  // ---------------------------------------------------------------
  // Admin + one staff member per department
  // ---------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@test.com',
      phone: '9000000001',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const staffSpecs = [
    { name: 'Priya Sharma', email: 'staff@test.com', phone: '9000000002', dept: 'Water Supply' },
    { name: 'Rahul Verma', email: 'staff2@test.com', phone: '9000000003', dept: 'Electricity' },
    { name: 'Arjun Reddy', email: 'staff.roads@test.com', phone: '9000000004', dept: 'Roads' },
    { name: 'Kavya Nair', email: 'staff.sanitation@test.com', phone: '9000000005', dept: 'Sanitation' },
    { name: 'Farhan Ali', email: 'staff.safety@test.com', phone: '9000000006', dept: 'Public Safety' },
    { name: 'Divya Menon', email: 'staff.transport@test.com', phone: '9000000007', dept: 'Transportation' },
    { name: 'Suresh Kumar', email: 'staff.general@test.com', phone: '9000000008', dept: 'General' },
  ]
  const staffById = new Map<string, { id: string; name: string }>()
  const staffByDept = new Map<string, { id: string; name: string }>()
  const staffDeptById = new Map<string, string>()
  for (const spec of staffSpecs) {
    const user = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        phone: spec.phone,
        password: hashedPassword,
        role: Role.STAFF,
        departmentId: departments.get(spec.dept)!.id,
      },
    })
    staffById.set(user.id, { id: user.id, name: user.name })
    staffByDept.set(spec.dept, { id: user.id, name: user.name })
    staffDeptById.set(user.id, spec.dept)
  }

  // ---------------------------------------------------------------
  // Regular users
  // ---------------------------------------------------------------
  const users = []
  const userSpecs = [
    { name: 'Aarav Patel', email: 'user@test.com', phone: '9000000010' },
    { name: 'Sneha Iyer', email: 'user2@test.com', phone: '9000000011' },
    { name: 'Vikram Singh', email: 'user3@test.com', phone: '9000000012' },
    { name: 'Meera Nair', email: 'user4@test.com', phone: '9000000013' },
  ]
  for (const spec of userSpecs) {
    const user = await prisma.user.create({
      data: { ...spec, password: hashedPassword, role: Role.USER },
    })
    users.push(user)
  }
  console.log(
    `  • Created ${users.length + staffSpecs.length + 1} users (1 admin, ${staffSpecs.length} staff, ${users.length} users)`,
  )

  // ---------------------------------------------------------------
  // Complaints
  // ---------------------------------------------------------------
  const byDept = (dept: string) => staffByDept.get(dept)!

  const complaintSpecs = [
    {
      title: 'No water supply in Krishna Nagar for 3 days',
      description:
        'Residents of Krishna Nagar have not received water for the past three days. This is a major outage affecting the whole block.',
      category: Category.WATER,
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      userId: users[0].id,
      staff: byDept('Water Supply'),
      location: 'Krishna Nagar, Sector 12',
      createdAtOffset: 4,
      resolved: false,
    },
    {
      title: 'Street light not working near Main Market',
      description:
        'The street light facing the Main Market entrance has not worked for a week. The area is completely dark after sunset.',
      category: Category.ELECTRICITY,
      priority: Priority.MEDIUM,
      status: ComplaintStatus.ASSIGNED,
      userId: users[1].id,
      staff: byDept('Electricity'),
      location: 'Main Market Road',
      createdAtOffset: 6,
      resolved: false,
    },
    {
      title: 'Large pothole damaged my vehicle',
      description:
        'A deep pothole on Ring Road caused damage to my car suspension. Repairs are needed urgently before someone gets hurt.',
      category: Category.ROADS,
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      userId: users[2].id,
      staff: byDept('Roads'),
      location: 'Ring Road, near Flyover',
      createdAtOffset: 14,
      resolved: true,
    },
    {
      title: 'Garbage not collected on Monday',
      description:
        'Garbage was not collected from Gandhi Street this week. Bags are piled up and there is a bad smell.',
      category: Category.SANITATION,
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      userId: users[0].id,
      staff: null,
      location: 'Gandhi Street, Block C',
      createdAtOffset: 1,
      resolved: false,
    },
    {
      title: 'Bus #42 frequently delayed in the morning',
      description:
        'Bus number 42 has been running 20-30 minutes late every morning this week, causing commuters to miss work.',
      category: Category.TRANSPORT,
      priority: Priority.LOW,
      status: ComplaintStatus.UNDER_REVIEW,
      userId: users[3].id,
      staff: null,
      location: 'Central Bus Station',
      createdAtOffset: 3,
      resolved: false,
    },
    {
      title: 'Dangerous abandoned building near school',
      description:
        'An abandoned building behind the city school is open and children play inside. This is a serious public safety issue.',
      category: Category.SAFETY,
      priority: Priority.CRITICAL,
      status: ComplaintStatus.RESOLVED,
      userId: users[1].id,
      staff: byDept('Public Safety'),
      location: 'Near City Public School',
      createdAtOffset: 20,
      resolved: true,
    },
    {
      title: 'Water leakage from main pipeline',
      description:
        'A main water pipeline is leaking continuously near the bus stop, wasting water and flooding the footpath.',
      category: Category.WATER,
      priority: Priority.MEDIUM,
      status: ComplaintStatus.CLOSED,
      userId: users[2].id,
      staff: byDept('Water Supply'),
      location: 'Jubilee Bus Stop',
      createdAtOffset: 25,
      resolved: true,
    },
    {
      title: 'Request to install speed bumps',
      description:
        'Suggestion: install speed bumps on Lake View Road to slow down speeding vehicles near the park.',
      category: Category.OTHER,
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      userId: users[3].id,
      staff: null,
      location: 'Lake View Road',
      createdAtOffset: 8,
      resolved: false,
    },
  ]

  const complaints = []
  for (const spec of complaintSpecs) {
    const created = await createComplaintWithHistory(spec)
    complaints.push(created)
  }
  console.log(`  • Created ${complaints.length} complaints`)

  // ---------------------------------------------------------------
  // Assignment history for assigned/resolved complaints
  // ---------------------------------------------------------------
  for (const spec of complaintSpecs) {
    if (!spec.staff) continue
    const complaint = complaints[complaintSpecs.indexOf(spec)]
    await prisma.complaintAssignment.create({
      data: {
        complaintId: complaint.id,
        assignedTo: spec.staff.id,
        assignedBy: admin.id,
        departmentId: departments.get(staffDeptById.get(spec.staff.id)!)!.id,
        reason: 'Auto-assigned by category routing.',
        assignedAt: daysAgo(spec.createdAtOffset - 2),
        unassignedAt: null,
      },
    })
  }
  console.log(`  • Created assignment history`)

  // ---------------------------------------------------------------
  // Feedback for resolved complaints
  // ---------------------------------------------------------------
  const feedbackSpecs = [
    { complaintIndex: 2, rating: 5, comment: 'The team repaired the road quickly and professionally.' },
    { complaintIndex: 5, rating: 4, comment: 'Building was inspected and secured. Thank you!' },
    { complaintIndex: 6, rating: 5, comment: 'Pipeline fixed within two days. Great service.' },
  ]
  for (const spec of feedbackSpecs) {
    const complaint = complaints[spec.complaintIndex]
    await prisma.feedback.create({
      data: {
        complaintId: complaint.id,
        userId: complaint.userId,
        rating: spec.rating,
        comment: spec.comment,
      },
    })
    console.log(`  • Feedback added for ${complaint.complaintNumber}`)
  }

  // ---------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------
  const notifications = [
    {
      userId: users[0].id,
      complaintId: complaints[0].id,
      type: NotificationType.COMPLAINT_CREATED,
      title: 'Complaint submitted',
      message: `Your complaint ${complaints[0].complaintNumber} has been registered and is under review.`,
    },
    {
      userId: users[0].id,
      complaintId: complaints[0].id,
      type: NotificationType.STATUS_UPDATED,
      title: 'Status update',
      message: `Complaint ${complaints[0].complaintNumber} is now being worked on.`,
    },
    {
      userId: waterStaffId(),
      complaintId: complaints[0].id,
      type: NotificationType.COMPLAINT_ASSIGNED,
      title: 'New complaint assigned',
      message: `Complaint ${complaints[0].complaintNumber} has been assigned to your department.`,
    },
    {
      userId: users[3].id,
      complaintId: complaints[7].id,
      type: NotificationType.STATUS_UPDATED,
      title: 'Complaint rejected',
      message: `Complaint ${complaints[7].complaintNumber} was rejected. Please contact support if you have questions.`,
    },
  ]
  for (const n of notifications) {
    await prisma.notification.create({ data: n })
  }
  console.log(`  • Created ${notifications.length} notifications`)

  // ---------------------------------------------------------------
  // Audit logs
  // ---------------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'LOGIN', entityType: 'User', entityId: admin.id, ipAddress: '127.0.0.1', userAgent: 'seed' },
      { userId: users[0].id, action: 'CREATE_COMPLAINT', entityType: 'Complaint', entityId: complaints[0].id, ipAddress: '127.0.0.1', userAgent: 'seed' },
    ],
  })
  console.log(`  • Created audit logs`)

  console.log('\n✅ Seed completed successfully!')
  console.log('\nLogin credentials (password for all: Password123!):')
  console.log('  admin@test.com            → ADMIN')
  console.log('  staff@test.com            → STAFF (Water Supply)')
  console.log('  staff2@test.com           → STAFF (Electricity)')
  console.log('  staff.roads@test.com      → STAFF (Roads)')
  console.log('  staff.sanitation@test.com → STAFF (Sanitation)')
  console.log('  staff.safety@test.com     → STAFF (Public Safety)')
  console.log('  staff.transport@test.com  → STAFF (Transportation)')
  console.log('  user@test.com / user2@test.com / user3@test.com / user4@test.com → USER')

  function waterStaffId(): string {
    return staffByDept.get('Water Supply')!.id
  }
}

interface Spec {
  title: string
  description: string
  category: Category
  priority: Priority
  status: ComplaintStatus
  userId: string
  staff: { id: string; name: string } | null
  location?: string
  createdAtOffset: number
  resolved: boolean
}

async function createComplaintWithHistory(spec: Spec) {
  const year = new Date().getFullYear()
  const count = await prisma.complaint.count({
    where: { complaintNumber: { startsWith: `SCM-${year}-` } },
  })

  const complaint = await prisma.complaint.create({
    data: {
      complaintNumber: `SCM-${year}-${String(count + 1).padStart(6, '0')}`,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      priority: spec.priority,
      severityScore: severityFor(spec.priority),
      status: spec.status,
      aiCategory: spec.category,
      aiPriority: spec.priority,
      aiConfidence: 0.92,
      location: spec.location,
      userId: spec.userId,
      assignedToId: spec.staff?.id ?? null,
      departmentId: spec.staff
        ? (
            await prisma.user.findUniqueOrThrow({
              where: { id: spec.staff.id },
              select: { departmentId: true },
            })
          ).departmentId
        : null,
      createdAt: daysAgo(spec.createdAtOffset),
      updatedAt: spec.resolved ? daysAgo(1) : daysAgo(spec.createdAtOffset - 1),
      assignedAt: spec.staff ? daysAgo(spec.createdAtOffset - 2) : null,
      resolvedAt: spec.resolved ? daysAgo(1) : null,
      closedAt: spec.status === ComplaintStatus.CLOSED ? daysAgo(1) : null,
      expectedResolutionTime: daysFromNow(3),
    },
  })

  const transitionOrder: ComplaintStatus[] = [
    ComplaintStatus.SUBMITTED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.RESOLVED,
  ]
  const toIndex = transitionOrder.indexOf(spec.status)

  for (let i = 0; i <= toIndex; i++) {
    const oldStatus = i === 0 ? null : transitionOrder[i - 1]
    const newStatus = transitionOrder[i]
    const comment =
      i === 0
        ? 'Complaint submitted by user.'
        : i === 1
          ? 'Complaint verified and moved to review.'
          : i === 2
            ? 'Complaint assigned to the responsible staff member.'
            : i === 3
              ? 'Work has started on this complaint.'
              : 'Complaint resolved. Awaiting customer feedback.'

    await prisma.complaintUpdate.create({
      data: {
        complaintId: complaint.id,
        userId: i === 0 ? spec.userId : spec.staff?.id ?? null,
        oldStatus,
        newStatus,
        comment,
        createdAt: daysAgo(Math.max(spec.createdAtOffset - i, 1)),
      },
    })
  }

  return complaint
}

function severityFor(priority: Priority): number {
  switch (priority) {
    case Priority.LOW:
      return 1
    case Priority.MEDIUM:
      return 2
    case Priority.HIGH:
      return 3
    case Priority.CRITICAL:
      return 5
  }
}

main()
  .catch((error) => {
    console.error('Error while seeding:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })