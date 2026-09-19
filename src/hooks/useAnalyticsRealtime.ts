/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Subscribes to realtime "analytics" websocket events; signals when a
 *  live analytics update has been received so the UI can show a badge.
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { wsService } from '@/services/websocketService'

export function useAnalyticsRealtime(onUpdate?: () => void) {
  const [lastEvent, setLastEvent] = useState<number | null>(null)

  useEffect(() => {
    const off = wsService.on('analytics', () => {
      setLastEvent(Date.now())
      onUpdate?.()
    })
    return () => {
      off?.()
    }
  }, [onUpdate])

  return { isLive: lastEvent !== null, lastEvent }
}