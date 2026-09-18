import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { prisma } from '../src/config/database'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'

async function registerUser(app: express.Express, email: string, name = 'Customer') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Passw0rd!' })
    .expect(201)
  return res.body.data.token
}

async function loginToken(app: express.Express, email: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Test1234!' })
    .expect(200)
  return res.body.data.token
}

async function createStaffUser(overrides: Partial<{ departmentId: string | null }> = {}) {
  return createTestUser({
    name: 'Staff Agent',
    email: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`,
    role: 'STAFF',
    departmentId: overrides.departmentId ?? null,
  })
}

async function createComplaint(app: express.Express, token: string, title = 'Burst water pipeline', description = 'The pipeline is leaking heavily and flooding the street since morning.') {
  const res = await request(app)
    .post('/api/complaints')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, description })
    .expect(201)
  return res.body.data
}

describe('Escalation module', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  it('lets a STAFF member escalate an assigned complaint', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const userToken = await registerUser(app, 'escalate-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    const res = await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'No response from assigned team', toLevel: 'LEVEL_2' })
      .expect(201)

    expect(res.body.data.toLevel).toBe('LEVEL_2')
    expect(res.body.data.escalatedBy).toBe(staff.id)

    const row = await prisma.complaintEscalation.findUnique({
      where: { id: res.body.data.id },
      include: { complaint: true },
    })
    expect(row).not.toBeNull()
    expect(row!.reason).toBe('No response from assigned team')

    const update = await prisma.complaintUpdate.findFirst({
      where: { complaintId: complaint.id, isInternal: true },
    })
    expect(update).not.toBeNull()
    expect(update!.comment).toMatch(/escalated/i)
  })

  it('blocks a USER from escalating', async () => {
    const userToken = await registerUser(app, 'plain-user@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'test' })
      .expect(403)
  })

  it('rejects redundant escalation to the same or lower level', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const userToken = await registerUser(app, 'double-escalate@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'first escalation', toLevel: 'LEVEL_3' })
      .expect(201)

    await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'second escalation', toLevel: 'LEVEL_2' })
      .expect(409)
  })

  it('does not escalate a resolved complaint', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin@test.com', role: 'ADMIN' })
    const adminToken = await loginToken(app, admin.email)

    const userToken = await registerUser(app, 'resolved-escalate@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.id}/resolve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ comment: 'Pipeline patched and supply restored.' })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'late escalation' })
      .expect(409)
  })

  it('resolves a complaint in one step and marks it resolved', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin@test.com', role: 'ADMIN' })
    const adminToken = await loginToken(app, admin.email)

    const userToken = await registerUser(app, 'resolve-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200)

    const res = await request(app)
      .post(`/api/complaints/${complaint.id}/resolve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ comment: 'Leak repaired and verified by technician.' })
      .expect(200)

    expect(res.body.data.status).toBe('RESOLVED')
    expect(res.body.data.resolvedAt).toBeTruthy()

    const ownerNotif = await prisma.notification.findFirst({
      where: { complaintId: complaint.id, type: 'COMPLAINT_RESOLVED' },
    })
    expect(ownerNotif).not.toBeNull()
  })

  it('updates the priority of a complaint', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const userToken = await registerUser(app, 'priority-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    const res = await request(app)
      .put(`/api/complaints/${complaint.id}/priority`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priority: 'HIGH' })
      .expect(200)

    expect(res.body.data.priority).toBe('HIGH')

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: complaint.id, action: 'CHANGE_PRIORITY' },
    })
    expect(audit).not.toBeNull()
  })

  it('returns agent recommendations for a complaint', async () => {
    const water = await getOrCreateDepartment('Water Supply')
    await createStaffUser({ departmentId: water.id })
    await createStaffUser({ departmentId: water.id })

    const userToken = await registerUser(app, 'recommend-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin@test.com', role: 'ADMIN' })
    const adminToken = await loginToken(app, admin.email)

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}/recommend-agents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0]).toHaveProperty('agentId')
    expect(res.body.data[0]).toHaveProperty('score')
    expect(res.body.data[0]).toHaveProperty('reason')
  })

  it('serves the agent dashboard', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const userToken = await registerUser(app, 'dash-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin2@test.com', role: 'ADMIN' })
    const adminToken = await loginToken(app, admin.email)

    await request(app)
      .post(`/api/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    const res = await request(app)
      .get('/api/agent/dashboard')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200)

    expect(res.body.data.counts.assigned).toBe(1)
    expect(res.body.data.counts).toHaveProperty('overdue')
    expect(res.body.data).toHaveProperty('recentComplaints')
  })

  it('blocks non-staff from the agent dashboard', async () => {
    const userToken = await registerUser(app, 'not-an-agent@test.com')
    await request(app)
      .get('/api/agent/dashboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)
  })

  it('lists escalations for the admin with pagination', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaffUser({ departmentId: department.id })
    const staffToken = await loginToken(app, staff.email)

    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin3@test.com', role: 'ADMIN' })
    const adminToken = await loginToken(app, admin.email)

    const userToken = await registerUser(app, 'list-escalations@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'needs attention', toLevel: 'LEVEL_2' })
      .expect(201)

    const res = await request(app)
      .get('/api/admin/escalations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body.pagination.total).toBe(1)
    expect(res.body.data[0].complaint.id).toBe(complaint.id)

    const open = await request(app)
      .get('/api/admin/escalations?status=open')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(open.body.pagination.total).toBe(1)
  })
})