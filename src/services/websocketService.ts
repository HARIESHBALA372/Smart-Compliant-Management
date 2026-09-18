/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { store } from '@/store/store'
import { addNotification } from '@/store/slices/notificationSlice'
import { analyticsStale } from '@/store/slices/analyticsSlice'

type WSMessage = {
  type: string
  payload: unknown
}

function buildWsUrl(): string | null {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws'
  const tokens = JSON.parse(localStorage.getItem('tokens') || 'null')
  const token = tokens?.accessToken
  if (!token) return null
  const url = new URL(base)
  url.searchParams.set('token', token)
  return url.toString()
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map()

  connect() {
    const wsUrl = buildWsUrl()
    if (!wsUrl) return

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch {
          // ignore parse errors
        }
      }

      this.ws.onclose = () => {
        this.attemptReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts)
  }

  private handleMessage(message: WSMessage) {
    const callbacks = this.listeners.get(message.type)
    if (callbacks) {
      callbacks.forEach((cb) => cb(message.payload))
    }

switch (message.type) {
      case 'notification':
        store.dispatch(addNotification(message.payload))
        break
      case 'analytics':
        store.dispatch(analyticsStale())
        break
    }
  }

  on(type: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(callback)
    return () => {
      this.listeners.get(type)?.delete(callback)
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.listeners.clear()
  }

  send(type: string, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }
}

export const wsService = new WebSocketService()
