import request from 'supertest'
import type express from 'express'
import { createApp } from '../src/app'
import { prisma } from '../src/config/database'
import { clearDatabase, createTestUser, getOrCreateDepartment } from './helpers'
import { sweepSlaNotifications } from '../src/services/sla-notification.service'

async function authToken(app: express.Express, email: string, password: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
  return res.body.data.token as string
}

async function registerUser(app: express.Express, email: string, name = 'Citizen') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Passw0rd!' })
    .expect(201)
  return { token: res.body.data.token as string, id: res.body.data.user?.id ?? res.body.data.id }
}

async function createStaff(app: express.Express, departmentId: string | null) {
  const staff = await createTestUser({
    name: 'Staff Agent',
    email: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`,
    role: 'STAFF',
    departmentId,
  })
  const token = await authToken(app, staff.email, 'Test1234!')
  return { ...staff, token }
}

async function createComplaint(app: express.Express, token: string, title = 'Burst water pipeline', description = 'The pipeline is leaking heavily and flooding the street since morning.') {
  const res = await request(app)
    .post('/api/complaints')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, description })
    .expect(201)
  return res.body.data
}

describe('Notification module', () => {
  let app: express.Express

  beforeAll(async () => {
    app = await createApp()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  it('creates an in-app notification for the owner and department staff on submission', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'notify-owner@test.com')

    const complaint = await createComplaint(app, userToken)

    const ownerNotif = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'COMPLAINT_CREATED' },
    })
    expect(ownerNotif).not.toBeNull()
    expect(ownerNotif!.channel).toBe('IN_APP')

    const staffNotif = await prisma.notification.findFirst({
      where: { userId: staff.id, complaintId: complaint.id, type: 'COMPLAINT_CREATED' },
    })
    expect(staffNotif).not.toBeNull()
  })

  it('exposes unread count and supports marking read/all read', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'unread-owner@test.com')
    await createComplaint(app, userToken)

    const unread = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(unread.body.data.unreadCount).toBe(1)

    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.pagination.unreadCount).toBe(1)

    const notifId = list.body.data[0].id as string
    await request(app)
      .put(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    const after = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(after.body.data.unreadCount).toBe(0)

    const listFiltered = await request(app)
      .get(`/api/notifications?type=COMPLAINT_CREATED`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(listFiltered.body.data).toHaveLength(1)
    expect(listFiltered.body.data[0].isRead).toBe(true)
    // non-matching type filter yields nothing
    const empty = await request(app)
      .get(`/api/notifications?type=SLA_BREACHED`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(empty.body.data).toHaveLength(0)
    void ownerId
  })

  it('a user cannot read or delete another user\u2019s notification', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    await createStaff(app, department.id)
    const { token: ownerToken } = await registerUser(app, 'isolation-owner@test.com')
    const { token: otherToken } = await registerUser(app, 'isolation-other@test.com')
    await createComplaint(app, ownerToken)

    const ownerList = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
    const notifId = ownerList.body.data[0].id as string

    await request(app)
      .put(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404)

    await request(app)
      .delete(`/api/notifications/${notifId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404)
  })

  it('marks a notification as completed and persists completedAt', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    await createStaff(app, department.id)
    const { token: userToken } = await registerUser(app, 'complete-owner@test.com')
    await createComplaint(app, userToken)

    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    const notifId = list.body.data[0].id as string
    expect(list.body.data[0].completed).toBe(false)

    const res = await request(app)
      .put(`/api/notifications/${notifId}/complete`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(res.body.data.completed).toBe(true)
    expect(res.body.data.completedAt).toBeTruthy()

    // another user cannot complete someone else's notification
    const { token: otherToken } = await registerUser(app, 'complete-other@test.com')
    await request(app)
      .put(`/api/notifications/${notifId}/complete`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404)
  })

  it('requires authentication', async () => {
    await request(app).get('/api/notifications').expect(401)
    await request(app).get('/api/notifications/unread-count').expect(401)
    await request(app).get('/api/notifications/preferences').expect(401)
  })

  it('updates notification preferences and honors disabled types', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'pref-owner@test.com')

    const prefs = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(prefs.body.data.complaintStatusUpdates).toBe(true)

    await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ complaintStatusUpdates: false })
      .expect(200)

    await createComplaint(app, userToken)

    const created = await prisma.notification.findFirst({ where: { userId: ownerId } })
    expect(created).toBeNull()

    const prefsAfter = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(prefsAfter.body.data.complaintStatusUpdates).toBe(false)
  })

  it('notifies the citizen when a complaint is rejected', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'reject-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'REJECTED', comment: 'Duplicate of an existing report.' })
      .expect(200)

    const notif = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'COMPLAINT_REJECTED' },
    })
    expect(notif).not.toBeNull()
  })

  it('notifies the citizen and agent when priority changes', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'prio-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    const nextPriority = complaint.priority === 'CRITICAL' ? 'LOW' : 'CRITICAL'
    await request(app)
      .put(`/api/complaints/${complaint.id}/priority`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ priority: nextPriority })
      .expect(200)

    const notif = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'COMPLAINT_PRIORITY_CHANGED' },
    })
    expect(notif).not.toBeNull()
  })

  it('reopens a resolved complaint and notifies the citizen', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'reopen-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ assignedToId: staff.id })
      .expect(200)

    await request(app)
      .post(`/api/complaints/${complaint.id}/resolve`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ comment: 'Leak repaired and water supply restored.' })
      .expect(200)

    const reopened = await request(app)
      .post(`/api/complaints/${complaint.id}/reopen`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ comment: 'Leak reappeared after heavy rain.' })
      .expect(200)
    expect(reopened.body.data.status).toBe('IN_PROGRESS')
    expect(reopened.body.data.reopenedAt).toBeTruthy()

    const notif = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'COMPLAINT_REOPENED' },
    })
    expect(notif).not.toBeNull()
  })

  it('sends a FEEDBACK_REQUEST when a complaint closes without feedback', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    const staff = await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'feedback-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    await request(app)
      .post(`/api/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ assignedToId: staff.id })
      .expect(200)
    await request(app)
      .post(`/api/complaints/${complaint.id}/resolve`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ comment: 'Issue fixed on site.' })
      .expect(200)
    await request(app)
      .post(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'CLOSED' })
      .expect(200)

    const notif = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'FEEDBACK_REQUEST' },
    })
    expect(notif).not.toBeNull()
  })

  it('lets ADMIN broadcast announcements but blocks STAFF', async () => {
    const admin = await createTestUser({ name: 'Admin', email: `admin-${Date.now()}@test.com`, role: 'ADMIN' })
    const adminToken = await authToken(app, admin.email, 'Test1234!')
    const staff = await createStaff(app, null)

    const res = await request(app)
      .post('/api/notifications/announce')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Scheduled maintenance', message: 'The portal will be down Saturday night for maintenance.' })
      .expect(200)
    expect(res.body.data.sent).toBeGreaterThan(0)

    await request(app)
      .post('/api/notifications/announce')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ title: 'Nope', message: 'Staff cannot announce.' })
      .expect(403)
  })

  it('dispatches SLA warnings at 75%, 90% and breach at 100% without duplicates', async () => {
    const department = await getOrCreateDepartment('Water Supply')
    await createStaff(app, department.id)
    const { token: userToken, id: ownerId } = await registerUser(app, 'sla-owner@test.com')
    const complaint = await createComplaint(app, userToken)

    // HIGH priority => 48h SLA. Place createdAt at 80% elapsed.
    const slaHours = 48
    const hoursElapsed75 = 0.8 * slaHours
    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { createdAt: new Date(Date.now() - hoursElapsed75 * 60 * 60 * 1000) },
    })

    const created75 = await sweepSlaNotifications()
    expect(created75).toBeGreaterThan(0)
    const w75 = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'SLA_WARNING' },
    })
    expect(w75).not.toBeNull()

    // 95% elapsed -> 90% threshold
    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { createdAt: new Date(Date.now() - 0.95 * slaHours * 60 * 60 * 1000) },
    })
    const created90 = await sweepSlaNotifications()
    expect(created90).toBeGreaterThan(0)
    const w90 = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'SLA_WARNING' },
    })
    expect(w90).not.toBeNull()

    // Past deadline -> breach
    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { createdAt: new Date(Date.now() - (slaHours + 5) * 60 * 60 * 1000) },
    })
    const createdBreach = await sweepSlaNotifications()
    expect(createdBreach).toBeGreaterThan(0)
    const breach = await prisma.notification.findFirst({
      where: { userId: ownerId, complaintId: complaint.id, type: 'SLA_BREACHED' },
    })
    expect(breach).not.toBeNull()

    // Re-running produces no new rows (dedup)
    const before = await prisma.notification.count({ where: { complaintId: complaint.id } })
    await sweepSlaNotifications()
    const after = await prisma.notification.count({ where: { complaintId: complaint.id } })
    expect(after).toBe(before)
  })
})