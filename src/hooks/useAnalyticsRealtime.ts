/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Subscribes to realtime "analytics" websocket events; signals when a
 *  live analytics update has been received so the UI can show a badge.
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'

export function useAnalyticsRealtime(onUpdate?: () => void) {
  const [lastEvent, setLastEvent] = useState<number | null>(null)

  useEffect(() => {
    let off: (() => void) | undefined
    let disposed = false
    void import('@/services/websocketService').then(({ wsService }) => {
      if (disposed) return
      off = wsService.on('analytics', () => {
        setLastEvent(Date.now())
        onUpdate?.()
      })
    })
    return () => {
      disposed = true
      off?.()
    }
  }, [onUpdate])

  return { isLive: lastEvent !== null, lastEvent }
}