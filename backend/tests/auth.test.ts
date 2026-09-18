import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { clearDatabase } from './helpers'

describe('Health', () => {
  let app: express.Express
  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
  })
})

describe('Auth API', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  it('register creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Anil Kumar', email: 'anil@test.com', password: 'Passw0rd!', phone: '9000000000' })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('anil@test.com')
    expect(res.body.data.user.role).toBe('USER')
    expect(res.body.data.user.password).toBeUndefined()
    expect(res.body.data.token).toBeDefined()
  })

  it('register rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Anil Kumar', email: 'dup@test.com', password: 'Passw0rd!' })
      .expect(201)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'dup@test.com', password: 'Passw0rd!' })
      .expect(409)

    expect(res.body.message).toMatch(/already exists/i)
  })

  it('register validates weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak User', email: 'weak@test.com', password: 'short' })
      .expect(422)

    expect(res.body.success).toBe(false)
    expect(Array.isArray(res.body.error)).toBe(true)
  })

  it('login succeeds with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Anil', email: 'login@test.com', password: 'Passw0rd!' })
      .expect(201)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Passw0rd!' })
      .expect(200)

    expect(res.body.data.token).toBeDefined()
  })

  it('login rejects wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Anil', email: 'login2@test.com', password: 'Passw0rd!' })
      .expect(201)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@test.com', password: 'Wrong123!' })
      .expect(401)

    expect(res.body.success).toBe(false)
  })

  it('GET /api/auth/me returns the authenticated user', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Me User', email: 'me@test.com', password: 'Passw0rd!' })
      .expect(201)

    const token = register.body.data.token
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.data.email).toBe('me@test.com')
  })

  it('protects /api/auth/me without a token', async () => {
    const res = await request(app).get('/api/auth/me').expect(401)
    expect(res.body.success).toBe(false)
  })
})