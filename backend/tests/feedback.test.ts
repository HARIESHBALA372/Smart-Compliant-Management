import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'

describe('Feedback API', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  async function setupResolvedComplaint() {
    const waterDept = await getOrCreateDepartment('Water Supply')
    const staff = await createTestUser({
      name: 'Feedback Staff',
      email: 'feedback.staff@test.com',
      role: 'STAFF',
      departmentId: waterDept.id,
    })
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Test1234!' })
      .expect(200)

    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Feedback Owner', email: 'fb.owner@test.com', password: 'Passw0rd!' })
      .expect(201)
    const userToken = userRes.body.data.token

    const complaint = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Persistent leakage in lane 9', description: 'Water keeps leaking from the mains into the street.' })
      .expect(201)

    const admin = await createTestUser({ name: 'Admin For FB', email: 'fb.admin@test.com', role: 'ADMIN' })
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test1234!' })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.body.data.id}/assign`)
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.body.data.id}/status`)
      .set('Authorization', `Bearer ${staffLogin.body.data.token}`)
      .send({ status: 'RESOLVED', comment: 'Repaired the leak' })
      .expect(200)

    return { userToken, complaintId: complaint.body.data.id }
  }

  it('accepts feedback for a resolved complaint', async () => {
    const { userToken, complaintId } = await setupResolvedComplaint()

    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ complaintId, rating: 5, comment: 'Fixed very quickly!' })
      .expect(201)

    expect(res.body.data.rating).toBe(5)
  })

  it('rejects duplicate feedback for the same complaint', async () => {
    const { userToken, complaintId } = await setupResolvedComplaint()

    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ complaintId, rating: 4 })
      .expect(201)

    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ complaintId, rating: 3 })
      .expect(409)

    expect(res.body.message).toMatch(/already/i)
  })

  it('rejects feedback for a non-resolved complaint', async () => {
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Resolve', email: 'no.resolve@test.com', password: 'Passw0rd!' })
      .expect(201)

    const complaint = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userRes.body.data.token}`)
      .send({ title: 'Fresh complaint not resolved', description: 'A brand new complaint that is still pending review.' })
      .expect(201)

    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userRes.body.data.token}`)
      .send({ complaintId: complaint.body.data.id, rating: 5 })
      .expect(409)

    expect(res.body.message).toMatch(/resolved or closed/i)
  })
})