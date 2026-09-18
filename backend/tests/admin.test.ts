import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { clearDatabase, createTestUser } from './helpers'

describe('Admin API', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  async function adminToken() {
    const admin = await createTestUser({ name: 'System Admin', email: 'sys.admin@test.com', role: 'ADMIN' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test1234!' })
      .expect(200)
    return res.body.data.token
  }

  it('blocks non-admins from user management', async () => {
    const user = await createTestUser({ email: 'plain.user@test.com', role: 'USER' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test1234!' })
      .expect(200)

    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .expect(403)
  })

  it('returns SLA configuration', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/sla')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(Array.isArray(res.body.data)).toBe(true)
    const critical = res.body.data.find((s: { priority: string }) => s.priority === 'CRITICAL')
    expect(critical.resolutionHours).toBe(24)
  })

  it('updates SLA configuration', async () => {
    const token = await adminToken()
    const res = await request(app)
      .put('/api/admin/sla')
      .set('Authorization', `Bearer ${token}`)
      .send([{ priority: 'HIGH', resolutionHours: 48 }])
      .expect(200)

    const high = res.body.data.find((s: { priority: string }) => s.priority === 'HIGH')
    expect(high.resolutionHours).toBe(48)
  })

  it('lists users for the admin', async () => {
    await createTestUser({ email: 'listed.user@test.com' })
    const token = await adminToken()

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.pagination.total).toBe(2)
    expect(res.body.data.some((u: { email: string }) => u.email === 'listed.user@test.com')).toBe(true)
  })

  it('creates a STAFF user', async () => {
    const token = await adminToken()
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Staff', email: 'new.staff@test.com', password: 'Passw0rd!', role: 'STAFF' })
      .expect(201)

    expect(res.body.data.role).toBe('STAFF')
    expect(res.body.data.password).toBeUndefined()
  })

  it('returns the admin dashboard', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.data.users).toBeGreaterThanOrEqual(1)
    expect(res.body.data.complaints).toBeGreaterThanOrEqual(0)
  })

  it('returns audit logs', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(Array.isArray(res.body.data)).toBe(true)
  })
})