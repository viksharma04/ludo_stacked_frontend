import type {
  IncomingMessage,
  OutgoingMessage,
  CreateRoomErrorMessage,
  JoinRoomErrorMessage,
} from '@/types/websocket'
import { MessageType } from '@/types/websocket'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const HEARTBEAT_INTERVAL_MS = 30000
const REQUEST_TIMEOUT_MS = 30000
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]

type MessageHandler = (message: IncomingMessage) => void
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private accessToken: string | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private reconnectAttempt = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private intentionalClose = false

  connect(accessToken: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] Already connected or connecting')
      return
    }

    this.intentionalClose = false
    this.accessToken = accessToken
    this.notifyStatus('connecting')

    const wsUrl = this.buildWebSocketUrl(accessToken)
    console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=.*/, 'token=***'))
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = this.handleOpen.bind(this)
    this.ws.onmessage = this.handleMessage.bind(this)
    this.ws.onclose = this.handleClose.bind(this)
    this.ws.onerror = this.handleError.bind(this)
  }

  disconnect(): void {
    this.intentionalClose = true
    this.cleanup()
    this.notifyStatus('disconnected')
  }

  send(message: OutgoingMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message')
      return
    }
    this.ws.send(JSON.stringify(message))
  }

  sendRequest<T>(
    message: OutgoingMessage,
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const requestId = message.request_id
      if (!requestId) {
        reject(new Error('Message must have a request_id'))
        return
      }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error('Request timed out'))
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      })

      this.send(message)
    })
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private buildWebSocketUrl(accessToken: string): string {
    const baseUrl = API_BASE_URL.replace(/^http/, 'ws')
    return `${baseUrl}/api/v1/ws?token=${encodeURIComponent(accessToken)}`
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connection opened, waiting for server authentication...')
    this.reconnectAttempt = 0
    this.startHeartbeat()
    // Don't notify 'connected' yet - wait for server's 'connected' message
    // which confirms authentication is complete
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as IncomingMessage

      // Handle server's connected message (authentication confirmed)
      if (message.type === MessageType.CONNECTED) {
        console.log('[WebSocket] Authenticated, connection fully established')
        this.notifyStatus('connected')
      }

      // Handle request/response pattern
      if (message.request_id && this.pendingRequests.has(message.request_id)) {
        const pending = this.pendingRequests.get(message.request_id)!
        clearTimeout(pending.timeoutId)
        this.pendingRequests.delete(message.request_id)

        if (this.isErrorMessage(message)) {
          const errorPayload = this.getErrorPayload(message)
          const errorMsg = errorPayload?.message || 'Unknown error from server'
          console.error('[WebSocket] Error response:', message)
          pending.reject(new Error(errorMsg))
        } else {
          pending.resolve(message)
        }
      }

      // Notify all message handlers
      this.messageHandlers.forEach((handler) => handler(message))
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Closed:', event.code, event.reason)
    this.stopHeartbeat()
    this.clearPendingRequests()

    if (!this.intentionalClose && this.accessToken) {
      this.notifyStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event)
    this.notifyStatus('error')
  }

  private isErrorMessage(message: IncomingMessage): boolean {
    return (
      message.type === MessageType.CREATE_ROOM_ERROR ||
      message.type === MessageType.JOIN_ROOM_ERROR ||
      message.type === MessageType.ERROR
    )
  }

  private getErrorPayload(message: IncomingMessage): { message: string } | null {
    if (message.type === MessageType.CREATE_ROOM_ERROR) {
      return (message as CreateRoomErrorMessage).payload
    }
    if (message.type === MessageType.JOIN_ROOM_ERROR) {
      return (message as JoinRoomErrorMessage).payload
    }
    return null
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: MessageType.PING })
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    this.reconnectAttempt++

    this.reconnectTimeout = setTimeout(() => {
      if (this.accessToken && !this.intentionalClose) {
        this.connect(this.accessToken)
      }
    }, delay)
  }

  private clearPendingRequests(): void {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('WebSocket connection closed'))
    })
    this.pendingRequests.clear()
  }

  private cleanup(): void {
    this.stopHeartbeat()
    this.clearPendingRequests()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((handler) => handler(status))
  }
}

export function generateRequestId(): string {
  return crypto.randomUUID()
}
