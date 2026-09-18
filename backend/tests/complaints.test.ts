import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'

async function registerUser(app: express.Express, email: string, name = 'Customer') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Passw0rd!' })
    .expect(201)
  return res.body.data.token
}

describe('Complaint API', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  it('creates a WATER complaint and auto-assigns the Water Supply department', async () => {
    const userToken = await registerUser(app, 'customer@test.com')

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'No water supply in Krishna Nagar',
        description: 'Residents have not received water for the past three days. Pipeline seems blocked.',
      })
      .expect(201)

    expect(res.body.data.complaintNumber).toMatch(/^SCM-\d{4}-\d{6}$/)
    expect(res.body.data.status).toBe('SUBMITTED')
    expect(res.body.data.category).toBe('WATER')
    expect(res.body.data.department.name).toBe('Water Supply')
  })

  it('creates a complaint with the user-provided category', async () => {
    const userToken = await registerUser(app, 'customer2@test.com')

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Street light near the park',
        description: 'The street light facing the park entrance is out.',
        category: 'ELECTRICITY',
        priority: 'HIGH',
        location: 'Central Park Gate 1',
      })
      .expect(201)

    expect(res.body.data.category).toBe('ELECTRICITY')
    expect(res.body.data.priority).toBe('HIGH')
  })

  it('lists only my complaints for a USER', async () => {
    const tokenA = await registerUser(app, 'owner-a@test.com')
    await registerUser(app, 'owner-b@test.com')

    await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Water leak at home', description: 'A pipe is leaking under the sink.' })
      .expect(201)

    const list = await request(app)
      .get('/api/complaints')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    expect(list.body.pagination.total).toBe(1)
    expect(list.body.data[0].title).toBe('Water leak at home')
  })

  it('blocks a USER from viewing another user complaint', async () => {
    const tokenA = await registerUser(app, 'owner-a2@test.com')
    const tokenB = await registerUser(app, 'owner-b2@test.com')

    const created = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Leaky tap', description: 'The kitchen tap keeps dripping the whole day.' })
      .expect(201)

    await request(app)
      .get(`/api/complaints/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403)
  })

  it('allows a STAFF member to move SUBMITTED -> UNDER_REVIEW', async () => {
    const waterDept = await getOrCreateDepartment('Water Supply')
    const staff = await createTestUser({
      name: 'Water Staff',
      email: 'water.staff@test.com',
      role: 'STAFF',
      departmentId: waterDept.id,
    })
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Test1234!' })
      .expect(200)
    const staffToken = staffRes.body.data.token

    const userToken = await registerUser(app, 'flow@test.com')
    const created = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Burst pipeline near shop', description: 'A pipeline burst and water is flooding the road.' })
      .expect(201)

    const updated = await request(app)
      .post(`/api/complaints/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'UNDER_REVIEW', comment: 'Verified the complaint' })
      .expect(200)

    expect(updated.body.data.status).toBe('UNDER_REVIEW')
  })

  it('rejects an invalid status transition', async () => {
    const waterDept = await getOrCreateDepartment('Water Supply')
    const staff = await createTestUser({
      name: 'Water Staff 2',
      email: 'water.staff2@test.com',
      role: 'STAFF',
      departmentId: waterDept.id,
    })
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Test1234!' })
      .expect(200)

    const userToken = await registerUser(app, 'flow2@test.com')
    const created = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Leak near temple', description: 'Water leaking continuously from the main line.' })
      .expect(201)

    const res = await request(app)
      .post(`/api/complaints/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ status: 'RESOLVED' })
      .expect(409)

    expect(res.body.message).toMatch(/transition/i)
  })

  it('allows admin to assign a complaint to staff', async () => {
    const waterDept = await getOrCreateDepartment('Water Supply')
    const staff = await createTestUser({
      name: 'Assignee Staff',
      email: 'assignee.staff@test.com',
      role: 'STAFF',
      departmentId: waterDept.id,
    })
    const admin = await createTestUser({ name: 'Root Admin', email: 'root.admin@test.com', role: 'ADMIN' })
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test1234!' })
      .expect(200)

    const userToken = await registerUser(app, 'assign-flow@test.com')
    const created = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Irregular supply in sector 4', description: 'Helpless residents without regular water.' })
      .expect(201)

    const assigned = await request(app)
      .post(`/api/complaints/${created.body.data.id}/assign`)
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    expect(assigned.body.data.assignedToId).toBe(staff.id)
    expect(assigned.body.data.status).toBe('ASSIGNED')
  })

  it('persists the AI classification on complaint creation', async () => {
    const userToken = await registerUser(app, 'ai-class@test.com')

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Water logging near the bus stop',
        description: 'Stagnant water has collected and is attracting mosquitoes.',
      })
      .expect(201)

    expect(res.body.data.aiCategory).toBeTruthy()
    expect(res.body.data.aiCategory).not.toBe('OTHER')
    expect(res.body.data.aiPriority).toBeTruthy()
    expect(typeof res.body.data.aiConfidence).toBe('number')
  })

  it('exposes complaint statistics', async () => {
    const userToken = await registerUser(app, 'stats@test.com')
    await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Dripping pipe in kitchen', description: 'A pipe drips constantly and wastes water.' })
      .expect(201)

    const res = await request(app)
      .get('/api/complaints/stats')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data.pending).toBeGreaterThanOrEqual(1)
  })
})