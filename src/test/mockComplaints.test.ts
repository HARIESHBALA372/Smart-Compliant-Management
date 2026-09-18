/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import { mockGetComplaints, mockGetComplaintById, mockCreateComplaint } from '@/services/mock/mockComplaints'
import { ComplaintStatus } from '@/types'

describe('mock complaints', () => {
  it('returns paginated complaints', () => {
    const result = mockGetComplaints({ page: 1, limit: 5 })
    expect(result.data.length).toBe(5)
    expect(result.total).toBeGreaterThan(0)
  })

  it('filters by status', () => {
    const result = mockGetComplaints({ status: [ComplaintStatus.RESOLVED] })
    expect(result.data.every((c) => c.status === ComplaintStatus.RESOLVED)).toBe(true)
  })

  it('searches by text', () => {
    const result = mockGetComplaints({ search: 'payment' })
    expect(result.total).toBeGreaterThan(0)
  })

  it('gets complaint by id', () => {
    const complaint = mockGetComplaintById('1')
    expect(complaint.id).toBe('1')
  })

  it('creates a new complaint', () => {
    const complaint = mockCreateComplaint(new FormData())
    expect(complaint.complaintId).toMatch(/^CMP/)
    expect(complaint.status).toBe(ComplaintStatus.SUBMITTED)
  })
})