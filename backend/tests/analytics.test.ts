import request from 'supertest'
import type express from 'express'
import { Category, ComplaintStatus, Priority } from '@prisma/client'
import { createApp } from '../src/app'
import { prisma } from '../src/config/database'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function seedComplaints() {
  const water = await getOrCreateDepartment('Water')
  const power = await getOrCreateDepartment('Power')

  const alice = await createTestUser({ name: 'Alice Agent', email: 'alice@test.com', role: 'STAFF', departmentId: water.id })
  const bob = await createTestUser({ name: 'Bob Agent', email: 'bob@test.com', role: 'STAFF', departmentId: water.id })
  const owner = await createTestUser({ name: 'Owner One', email: 'owner.one@test.com', role: 'USER' })
  const ownerTwo = await createTestUser({ name: 'Owner Two', email: 'owner.two@test.com', role: 'USER' })

  let n = 1
  const create = (data: {
    status: ComplaintStatus
    category: Category
    priority: Priority
    resolvedAt?: Date
    createdAt?: Date
    assignedToId?: string
    departmentId?: string
    userId?: string
    location?: string
  }) =>
    prisma.complaint.create({
      data: {
        complaintNumber: `CMP-AN-${Date.now()}-${n++}`,
        title: `Complaint ${n}`,
        description: 'Analytics seed complaint',
        status: data.status,
        category: data.category,
        priority: data.priority,
        resolvedAt: data.resolvedAt ?? null,
        createdAt: data.createdAt ?? daysAgo(3),
        assignedToId: data.assignedToId ?? null,
        departmentId: data.departmentId ?? null,
        userId: data.userId ?? owner.id,
        location: data.location ?? 'Block 12',
      },
    })

  await create({ status: 'RESOLVED', category: 'WATER', priority: 'HIGH', departmentId: water.id, assignedToId: alice.id, resolvedAt: daysAgo(2) })
  await create({ status: 'RESOLVED', category: 'WATER', priority: 'LOW', departmentId: water.id, assignedToId: alice.id, resolvedAt: daysAgo(1) })
  await create({ status: 'IN_PROGRESS', category: 'ELECTRICITY', priority: 'CRITICAL', departmentId: power.id, assignedToId: bob.id })
  await create({ status: 'SUBMITTED', category: 'ROADS', priority: 'MEDIUM', departmentId: water.id, userId: ownerTwo.id, location: 'Main Road' })
  await create({ status: 'CLOSED', category: 'WATER', priority: 'MEDIUM', departmentId: water.id, assignedToId: bob.id, resolvedAt: daysAgo(0.5) })

  return { water, power, alice, bob, owner, ownerTwo }
}

describe('Analytics API', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  async function login(email: string, password = 'Test1234!'): Promise<string> {
    const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200)
    return res.body.data.token
  }

  it('blocks regular users from the analytics endpoints', async () => {
    await seedComplaints()
    const token = await login('owner.one@test.com')
    await request(app).get('/api/analytics/overview').set('Authorization', `Bearer ${token}`).expect(403)
  })

  it('requires authentication', async () => {
    await request(app).get('/api/analytics/overview').expect(401)
  })

  it('returns correct KPI counts for an admin', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin One', email: 'analytics.admin@test.com', role: 'ADMIN' })
    const token = await login('analytics.admin@test.com')

    const res = await request(app).get('/api/analytics/overview').set('Authorization', `Bearer ${token}`).expect(200)

    expect(res.body.data.totalComplaints).toBe(5)
    expect(res.body.data.openComplaints).toBe(2)
    expect(res.body.data.resolvedComplaints).toBe(3)
    expect(res.body.data.highPriorityComplaints).toBe(2)
    expect(res.body.data.reopenedComplaints).toBe(0)
    expect(res.body.data.averageResolutionHours).toBeGreaterThan(0)
  })

  it('supports status/category/priority filters in the breakdown', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin Two', email: 'analytics.admin2@test.com', role: 'ADMIN' })
    const token = await login('analytics.admin2@test.com')

    const res = await request(app)
      .get('/api/analytics/complaints?category=WATER')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.data.total).toBe(3)
    expect(res.body.data.byCategory.find((c: { category: string }) => c.category === 'WATER')?.count).toBe(3)

    const priorityRes = await request(app)
      .get('/api/analytics/complaints?priority=CRITICAL')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(priorityRes.body.data.total).toBe(1)
  })

  it('scopes staff analytics to their own department', async () => {
    const { bob } = await seedComplaints()
    const token = await login('bob@test.com')

    const res = await request(app).get('/api/analytics/overview').set('Authorization', `Bearer ${token}`).expect(200)

    expect(res.body.data.totalComplaints).toBe(4)
  })

  it('rejects staff requests for another agent scope', async () => {
    const { alice } = await seedComplaints()
    const token = await login('alice@test.com')
    await request(app)
      .get(`/api/analytics/overview?agent=${alice.id}zz`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('computes SLA compliance from seeded rules', async () => {
    await seedComplaints()
    await prisma.slaRule.createMany({
      data: [
        { priority: 'LOW', responseHours: 1, resolutionHours: 2 },
        { priority: 'MEDIUM', responseHours: 1, resolutionHours: 2 },
        { priority: 'HIGH', responseHours: 1, resolutionHours: 8 },
        { priority: 'CRITICAL', responseHours: 1, resolutionHours: 8 },
      ],
    })

    const admin = await createTestUser({ name: 'Admin SLA', email: 'analytics.sla@test.com', role: 'ADMIN' })
    const token = await login('analytics.sla@test.com')

    const res = await request(app).get('/api/analytics/sla').set('Authorization', `Bearer ${token}`).expect(200)

    // HIGH resolved in 2 days (48h) vs 8h target => exceeded.
    expect(res.body.data.byPriority.find((p: { priority: string }) => p.priority === 'HIGH').resolved).toBe(1)
    expect(res.body.data.compliance).toBeLessThan(100)
    expect(res.body.data.breachCount).toBeGreaterThan(0)
  })

  it('ranks agents in the leaderboard', async () => {
    const { alice } = await seedComplaints()
    const admin = await createTestUser({ name: 'Admin LB', email: 'analytics.lb@test.com', role: 'ADMIN' })
    const token = await login('analytics.lb@test.com')

    const res = await request(app).get('/api/analytics/agents').set('Authorization', `Bearer ${token}`).expect(200)

    const agent = res.body.data.agents.find((a: { agentId: string }) => a.agentId === alice.id)
    expect(agent).toBeTruthy()
    expect(agent.resolved).toBe(2)
    expect(res.body.data.leaderboard.length).toBeGreaterThan(0)
    expect(res.body.data.leaderboard[0].rank).toBe(1)
  })

  it('groups complaints by location and returns density', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin Loc', email: 'analytics.loc@test.com', role: 'ADMIN' })
    const token = await login('analytics.loc@test.com')

    const res = await request(app).get('/api/analytics/locations').set('Authorization', `Bearer ${token}`).expect(200)

    expect(res.body.data.locations.length).toBeGreaterThanOrEqual(1)
    const water = res.body.data.locations.find((l: { location: string }) => l.location === 'Block 12')
    expect(water.count).toBe(4)
    expect(res.body.data.densityPerDay).toBeGreaterThan(0)
  })

  it('returns a CSV export', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin CSV', email: 'analytics.csv@test.com', role: 'ADMIN' })
    const token = await login('analytics.csv@test.com')

    const res = await request(app)
      .get('/api/analytics/export?format=csv&section=agents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('AGENT')
  })

  it('returns an Excel export', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin XLS', email: 'analytics.xls@test.com', role: 'ADMIN' })
    const token = await login('analytics.xls@test.com')

    const res = await request(app)
      .get('/api/analytics/export?format=xlsx')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.headers['content-type']).toContain('ms-excel')
    expect(res.text).toContain('Workbook')
  })

  it('returns a PDF export', async () => {
    await seedComplaints()
    const admin = await createTestUser({ name: 'Admin PDF', email: 'analytics.pdf@test.com', role: 'ADMIN' })
    const token = await login('analytics.pdf@test.com')

    const res = await request(app)
      .get('/api/analytics/export?format=pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.body.toString('latin1').startsWith('%PDF')).toBe(true)
  })

  it('returns trend insights with alerts', async () => {
    await seedComplaints()
    // Add a second Water complaint within the current window to trigger a spike comparison.
    const admin = await createTestUser({ name: 'Admin Insight', email: 'analytics.insight@test.com', role: 'ADMIN' })
    const token = await login('analytics.insight@test.com')

    const res = await request(app).get('/api/analytics/insights').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.data.alerts)).toBe(true)
    expect(res.body.data.period).toBeTruthy()
  })
})