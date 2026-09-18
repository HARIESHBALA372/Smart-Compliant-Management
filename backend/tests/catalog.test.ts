import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'

async function adminToken(app: express.Express) {
  const admin = await createTestUser({ name: 'System Admin', email: `sys.${Date.now()}@test.com`, role: 'ADMIN' })
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: admin.email, password: 'Test1234!' })
    .expect(200)
  return res.body.data.token
}

async function staffToken(app: express.Express, departmentId?: string) {
  const staff = await createTestUser({
    name: 'Staff Member',
    email: `staff.${Date.now()}@test.com`,
    role: 'STAFF',
    departmentId: departmentId ?? null,
  })
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: staff.email, password: 'Test1234!' })
    .expect(200)
  return res.body.data.token
}

describe('Admin catalog module (categories, departments, agents)', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  describe('Complaint categories', () => {
    it('creates, lists, updates and deletes a category', async () => {
      const token = await adminToken(app)

      const created = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Public Lighting', description: 'Street light faults', defaultPriority: 'MEDIUM' })
        .expect(201)

      expect(created.body.data.name).toBe('Public Lighting')
      expect(created.body.data.department).toBeNull()

      const list = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(list.body.data.some((c: { id: string }) => c.id === created.body.data.id)).toBe(true)

      const updated = await request(app)
        .put(`/api/admin/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ defaultPriority: 'HIGH', isActive: false })
        .expect(200)
      expect(updated.body.data.defaultPriority).toBe('HIGH')
      expect(updated.body.data.isActive).toBe(false)

      await request(app)
        .delete(`/api/admin/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const after = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(after.body.data.some((c: { id: string }) => c.id === created.body.data.id)).toBe(false)
    })

    it('rejects a duplicate category name', async () => {
      const token = await adminToken(app)
      await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Road Damage' })
        .expect(201)

      await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Road Damage' })
        .expect(409)
    })

    it('lets STAFF list categories', async () => {
      const token = await adminToken(app)
      await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Safety Hazard' })
        .expect(201)

      const staffTokenString = await staffToken(app)
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${staffTokenString}`)
        .expect(200)
      expect(res.body.data.some((c: { name: string }) => c.name === 'Safety Hazard')).toBe(true)
    })

    it('blocks STAFF from creating categories', async () => {
      const staffTokenString = await staffToken(app)
      await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${staffTokenString}`)
        .send({ name: 'Not Allowed' })
        .expect(403)
    })

    it('links a category to a department', async () => {
      const token = await adminToken(app)
      const department = await getOrCreateDepartment('Water Supply')
      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Leak Repair', departmentId: department.id })
        .expect(201)
      expect(res.body.data.department.id).toBe(department.id)
    })
  })

  describe('Departments', () => {
    it('creates, lists, updates and deletes a department', async () => {
      const token = await adminToken(app)

      const created = await request(app)
        .post('/api/admin/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parks & Gardens', description: 'Parks, trees and horticulture' })
        .expect(201)
      expect(created.body.data.name).toBe('Parks & Gardens')

      const updated = await request(app)
        .put(`/api/admin/departments/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contactEmail: 'parks@city.gov.in', isActive: true })
        .expect(200)
      expect(updated.body.data.contactEmail).toBe('parks@city.gov.in')

      const dup = await request(app)
        .post('/api/admin/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parks & Gardens' })
        .expect(409)

      const list = await request(app)
        .get('/api/admin/departments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(list.body.data.some((d: { id: string }) => d.id === created.body.data.id)).toBe(true)

      await request(app)
        .delete(`/api/admin/departments/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      void dup
    })

    it('refuses to delete a department that has users', async () => {
      const token = await adminToken(app)
      const department = await getOrCreateDepartment('Water Supply')
      await createTestUser({ name: 'Staff Member', email: 'held.staff@test.com', role: 'STAFF', departmentId: department.id })

      const res = await request(app)
        .delete(`/api/admin/departments/${department.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409)
      expect(res.body.message).toMatch(/users or complaints/i)
    })

    it('exposes the public department list', async () => {
      await getOrCreateDepartment('Public Safety')
      const res = await request(app)
        .get('/api/departments')
        .expect(200)
      expect(res.body.data.some((d: { name: string }) => d.name === 'Public Safety')).toBe(true)
    })
  })

  describe('Agents', () => {
    it('lists agents with workload metrics', async () => {
      const department = await getOrCreateDepartment('Water Supply')
      await createTestUser({ name: 'Agent Alpha', email: 'alpha@test.com', role: 'STAFF', departmentId: department.id })
      await createTestUser({ name: 'Agent Beta', email: 'beta@test.com', role: 'STAFF', departmentId: department.id })

      const token = await adminToken(app)
      const res = await request(app)
        .get('/api/admin/agents')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.pagination.total).toBe(2)
      const agent = res.body.data.find((a: { email: string }) => a.email === 'alpha@test.com')
      expect(agent).toHaveProperty('assigned')
      expect(agent).toHaveProperty('open')
      expect(agent).toHaveProperty('resolved')
      expect(agent).toHaveProperty('slaCompliance')
      expect(agent).toHaveProperty('overdue')
    })

    it('filters agents by department and search', async () => {
      const water = await getOrCreateDepartment('Water Supply')
      const roads = await getOrCreateDepartment('Roads')
      await createTestUser({ name: 'Plumber Pat', email: 'pat@test.com', role: 'STAFF', departmentId: water.id })
      await createTestUser({ name: 'Pothole Polly', email: 'polly@test.com', role: 'STAFF', departmentId: roads.id })

      const token = await adminToken(app)

      const byDept = await request(app)
        .get(`/api/admin/agents?departmentId=${water.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(byDept.body.pagination.total).toBe(1)
      expect(byDept.body.data[0].email).toBe('pat@test.com')

      const bySearch = await request(app)
        .get('/api/admin/agents?search=polly')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(bySearch.body.pagination.total).toBe(1)
      expect(bySearch.body.data[0].email).toBe('polly@test.com')
    })

    it('blocks STAFF from the agents endpoint', async () => {
      const staffTokenString = await staffToken(app)
      await request(app)
        .get('/api/admin/agents')
        .set('Authorization', `Bearer ${staffTokenString}`)
        .expect(403)
    })
  })

  describe('SLA rules', () => {
    it('persists updated SLA configuration', async () => {
      const token = await adminToken(app)

      const updated = await request(app)
        .put('/api/admin/sla')
        .set('Authorization', `Bearer ${token}`)
        .send([{ priority: 'CRITICAL', resolutionHours: 12, responseHours: 2 }])
        .expect(200)

      const critical = updated.body.data.find((s: { priority: string }) => s.priority === 'CRITICAL')
      expect(critical.resolutionHours).toBe(12)
      expect(critical.responseHours).toBe(2)

      const fetched = await request(app)
        .get('/api/admin/sla')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      const fetchedCritical = fetched.body.data.find((s: { priority: string }) => s.priority === 'CRITICAL')
      expect(fetchedCritical.resolutionHours).toBe(12)
    })
  })
})