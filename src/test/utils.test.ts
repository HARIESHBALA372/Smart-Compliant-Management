/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import { getInitials, formatFileSize, formatDate } from '@/utils'
import { ComplaintStatus, ComplaintPriority, Role } from '@/types'
import { COMPLAINT_STATUS_LABELS, PRIORITY_LABELS } from '@/constants'

describe('utils', () => {
  it('getInitials extracts two initials from a name', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Alice')).toBe('A')
  })

  it('formatFileSize formats sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('formatDate formats dates', () => {
    expect(formatDate('2026-09-08T00:00:00Z')).toContain('2026')
  })
})

describe('constants', () => {
  it('status labels cover all statuses', () => {
    expect(Object.keys(COMPLAINT_STATUS_LABELS).length).toBe(Object.values(ComplaintStatus).length)
    expect(COMPLAINT_STATUS_LABELS[ComplaintStatus.SUBMITTED]).toBe('Submitted')
    expect(COMPLAINT_STATUS_LABELS[ComplaintStatus.RESOLVED]).toBe('Resolved')
  })

  it('priority labels cover all priorities', () => {
    expect(PRIORITY_LABELS[ComplaintPriority.CRITICAL]).toBe('Critical')
    expect(PRIORITY_LABELS[ComplaintPriority.LOW]).toBe('Low')
  })

  it('roles are distinct', () => {
    expect(Role.CUSTOMER).not.toBe(Role.AGENT)
    expect(Role.MANAGER).not.toBe(Role.ADMIN)
  })
})