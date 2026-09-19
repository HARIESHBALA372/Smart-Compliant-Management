/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics data fetching hook with debounced filters + realtime refresh
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { analyticsApi } from '@/services/analyticsApi'
import { wsService } from '@/services/websocketService'
import type { AnalyticsDashboardData, AnalyticsFilters } from '@/types/analytics'

const DEBOUNCE_MS = 400

export interface UseAnalyticsResult {
  data: AnalyticsDashboardData | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastUpdated: number | null
  refetch: () => void
}

export function useAnalytics(filters: AnalyticsFilters, realtime = false): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const requestId = useRef(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const filtersKey = JSON.stringify(filters)

  const run = useCallback(() => {
    const id = ++requestId.current
    setIsLoading(true)
    setIsRefreshing(true)
    setError(null)
    Promise.all([
      analyticsApi.getOverview(filters),
      analyticsApi.getComplaintStats(filters),
      analyticsApi.getTrends(filters),
      analyticsApi.getCategories(filters),
      analyticsApi.getStatus(filters),
      analyticsApi.getPriority(filters),
      analyticsApi.getResolution(filters),
      analyticsApi.getSla(filters),
      analyticsApi.getAgents(filters),
      analyticsApi.getDepartments(filters),
      analyticsApi.getLocations(filters),
      analyticsApi.getUsers(filters),
      analyticsApi.getMl(filters),
      analyticsApi.getInsights(filters),
    ]).then(
      (results) => {
        if (requestId.current !== id) return
        const [overview, complaints, trends, categories, status, priority, resolution, sla, agents, departments, locations, users, ml, insights] = results
        setData({
          overview,
          complaints,
          trends,
          categories,
          status,
          priority,
          resolution,
          sla,
          agents,
          departments,
          locations,
          users,
          ml,
          insights,
          lastUpdated: Date.now(),
        })
        setLastUpdated(Date.now())
        setIsLoading(false)
        setIsRefreshing(false)
      },
      (err: unknown) => {
        if (requestId.current !== id) return
        setIsLoading(false)
        setIsRefreshing(false)
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(message ?? 'Failed to load analytics')
      },
    )
  }, [filters])

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      run()
    }, DEBOUNCE_MS)
    const activeRequestId = requestId.current
    return () => {
      clearTimeout(debounceTimer.current)
      requestId.current = activeRequestId + 1
    }
  }, [filtersKey, run])

  useEffect(() => {
    if (!realtime) return
    const off = wsService.on('analytics', () => run())
    return () => {
      off?.()
    }
  }, [realtime, run])

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refetch: run,
  }
}