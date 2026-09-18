/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Frontend analytics module tests (mock-mode only, no network).
 * ------------------------------------------------------------------
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { analyticsApi } from '@/services/analyticsApi'
import { mockGetAnalytics } from '@/services/mock/mockAnalytics'
import { useAnalytics } from '@/hooks/useAnalytics'

describe('mockAnalytics', () => {
  it('returns a complete dashboard payload with all sections', () => {
    const data = mockGetAnalytics()
    expect(data.overview.totalComplaints).toBeGreaterThan(0)
    expect(data.complaints.byStatus.length).toBeGreaterThan(0)
    expect(data.complaints.byCategory.length).toBeGreaterThan(0)
    expect(data.complaints.byPriority.length).toBe(4)
    expect(data.agents.leaderboard.length).toBeGreaterThan(0)
    expect(data.departments.departments.length).toBeGreaterThan(0)
    expect(data.locations.locations.length).toBeGreaterThan(0)
    expect(data.users.topComplainants.length).toBeGreaterThan(0)
    expect(typeof data.ml.coverage).toBe('number')
    expect(data.insights.alerts.length).toBeGreaterThan(0)
  })

  it('fills trend points across the requested date range', () => {
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    const end = new Date().toISOString()
    const data = mockGetAnalytics({ startDate: start, endDate: end, statuses: ['RESOLVED'] })
    expect(data.trends.points.length).toBeGreaterThanOrEqual(1)
    expect(data.trends.period.start).toBe(start)
    expect(data.trends.period.end).toBe(end)
    expect(data.overview.totalComplaints).toBe(156)
  })

  it('orders the agent leaderboard by score (desc)', () => {
    const data = mockGetAnalytics().agents.leaderboard
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].score).toBeGreaterThanOrEqual(data[i].score)
    }
  })
})

describe('analyticsApi', () => {
  it('returns an overview in mock mode', async () => {
    const overview = await analyticsApi.getOverview()
    expect(overview.totalComplaints).toBe(156)
    expect(overview.resolutionRate).toBeGreaterThan(0)
  })

  it('returns complaint stats with slices', async () => {
    const stats = await analyticsApi.getComplaintStats()
    expect(stats.byStatus.some((s) => s.status === 'RESOLVED')).toBe(true)
  })

  it('returns SLA analytics with per-priority rows', async () => {
    const sla = await analyticsApi.getSla()
    expect(sla.byPriority.length).toBe(4)
    expect(typeof sla.compliance).toBe('number')
  })

  it('downloads a CSV blob in mock mode', async () => {
    const blob = await analyticsApi.downloadExport('csv', ['agents'], {})
    expect(blob.type).toContain('csv')
    const text = await blob.text()
    expect(text).toContain('AGENT')
  })

  it('passes through filters for status/priority/category', async () => {
    const stats = await analyticsApi.getComplaintStats({
      statuses: ['RESOLVED'],
      priorities: ['HIGH'],
      categories: ['WATER'],
    })
    expect(stats.total).toBeGreaterThan(0)
  })
})

describe('useAnalytics', () => {
  it('loads the aggregated dashboard and exposes lastUpdated', async () => {
    const filters = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    }
    const { result } = renderHook(() => useAnalytics(filters, false))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.data).not.toBeNull()
      },
      { timeout: 3000 },
    )

    expect(result.current.data?.overview.totalComplaints).toBe(156)
    expect(result.current.lastUpdated).not.toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('reports an error when a section fails', async () => {
    const spy = vi.spyOn(analyticsApi, 'getOverview').mockRejectedValueOnce(
      new Error('boom'),
    )
    try {
      const filters = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      }
      const { result } = renderHook(() => useAnalytics(filters, false))
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 3000 },
      )
      expect(result.current.error).toBeTruthy()
    } finally {
      spy.mockRestore()
    }
  })
})