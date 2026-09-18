import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'http'
import { prisma } from '../config/database'
import { verifyToken } from '../utils/jwt'
import { logger } from '../utils/logger'
import { notificationBus } from './notification.service'
import { analyticsBus } from './analytics-cache.service'
import { subscribeRealtime } from './redis/pubsub.service'

/**
 * WebSocket realtime gateway.
 *
 * Clients connect to `/ws?token=<jwt>` (browsers cannot set headers on the raw
 * WebSocket API). After authentication the server forwards `notification:created`
 * events from the in-process notification bus to the recipient's live sockets.
 * When Redis is available it also subscribes to the pub/sub relay channel so a
 * multi-instance deployment keeps every instance in sync. Everything degrades
 * gracefully — with no Redis and no subscribers the HTTP API is unaffected.
 */

const WS_PATH = '/ws'
const UNAUTHORIZED_CODE = 4001

interface ClientContext {
  userId: string
  sockets: Set<WebSocket>
}

const clients = new Map<string, ClientContext>()

async function authenticate(token: string): Promise<string> {
  const payload = verifyToken(token)
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) {
    throw new Error('Account is inactive or no longer exists')
  }
  return user.id
}

function sendJson(socket: WebSocket, type: string, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }))
  }
}

function register(socket: WebSocket, userId: string): void {
  let context = clients.get(userId)
  if (!context) {
    context = { userId, sockets: new Set() }
    clients.set(userId, context)
  }
  context.sockets.add(socket)

  socket.on('close', () => {
    context?.sockets.delete(socket)
    if (context && context.sockets.size === 0) {
      clients.delete(userId)
    }
  })
}

/**
 * Attaches the WebSocket server to the existing HTTP server. Returns a close
 * function to run during graceful shutdown.
 */
export function attachWebSocketServer(server: HttpServer): () => void {
  const wss = new WebSocketServer({ server, path: WS_PATH })

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const token = url.searchParams.get('token')

    if (token) {
      authenticate(token)
        .then((userId) => {
          sendJson(socket, 'auth', { status: 'ok' })
          register(socket, userId)
        })
        .catch(() => {
          socket.close(UNAUTHORIZED_CODE, 'Unauthorized')
        })
      return
    }

    // Allow auth as the first frame for clients that cannot use a query param.
    let authed = false
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString())
        if (message.type === 'auth' && message.payload?.token) {
          authenticate(message.payload.token as string)
            .then((userId) => {
              authed = true
              sendJson(socket, 'auth', { status: 'ok' })
              register(socket, userId)
            })
            .catch(() => socket.close(UNAUTHORIZED_CODE, 'Unauthorized'))
        } else if (!authed) {
          socket.close(UNAUTHORIZED_CODE, 'Authentication required')
        }
      } catch {
        socket.close(UNAUTHORIZED_CODE, 'Invalid message')
      }
    })
  })

  const forwardToSockets = (userId: string, type: string, payload: unknown): void => {
    const context = clients.get(userId)
    if (context) {
      const message = JSON.stringify({ type, payload })
      for (const socket of context.sockets) {
        if (socket.readyState === WebSocket.OPEN) socket.send(message)
      }
    }
  }

  const broadcastToAll = (type: string, payload: unknown): void => {
    const message = JSON.stringify({ type, payload })
    for (const context of clients.values()) {
      for (const socket of context.sockets) {
        if (socket.readyState === WebSocket.OPEN) socket.send(message)
      }
    }
  }

  const onCreated = (data: { userId: string; notification: Record<string, unknown> }): void => {
    forwardToSockets(data.userId, 'notification', data.notification)
  }
  notificationBus.on('notification:created', onCreated)

  // Analytics changes are broadcast to every live dashboard (scope filtering
  // is applied server-side when each client next refreshes its data).
  const onAnalytics = (data: { reason: string; updatedAt: string; complaintId?: string }): void => {
    broadcastToAll('analytics', data)
  }
  analyticsBus.on('analytics:updated', onAnalytics)

  // Cross-instance relay: forward messages delivered over Redis pub/sub.
  void subscribeRealtime((message) => {
    if (message.type === 'notification') {
      forwardToSockets(message.userId, 'notification', message.payload)
    } else if (message.type === 'analytics') {
      broadcastToAll('analytics', message.payload)
    }
  })

  logger.info(`WebSocket realtime server attached at ${WS_PATH}`)

  return () => {
    notificationBus.off('notification:created', onCreated)
    analyticsBus.off('analytics:updated', onAnalytics)
    for (const context of clients.values()) {
      for (const socket of context.sockets) socket.close()
    }
    clients.clear()
    wss.close()
  }
}

export function sendNotificationToUser(userId: string, payload: Record<string, unknown>): void {
  const context = clients.get(userId)
  if (!context) return
  const message = JSON.stringify({ type: 'notification', payload })
  for (const socket of context.sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message)
  }
}