'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WSClientMessage,
  WSServerMessage,
  RoomSnapshot,
  ConnectedPayload,
  RoomClosedPayload,
  ErrorPayload,
} from '@/types/room'
import { WS_ERROR_CODES } from '@/types/room'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const WS_URL = API_URL.replace(/^http/, 'ws')

const PING_INTERVAL_MS = 25000
const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000
const RECONNECT_MAX_ATTEMPTS = 5

interface UseRoomWebSocketOptions {
  accessToken: string
  roomCode: string
  onConnected?: (payload: ConnectedPayload) => void
  onRoomUpdated?: (room: RoomSnapshot) => void
  onRoomClosed?: (payload: RoomClosedPayload) => void
  onError?: (payload: ErrorPayload) => void
}

interface UseRoomWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  toggleReady: () => void
  leaveRoom: () => void
  disconnect: () => void
}

export function useRoomWebSocket({
  accessToken,
  roomCode,
  onConnected,
  onRoomUpdated,
  onRoomClosed,
  onError,
}: UseRoomWebSocketOptions): UseRoomWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})

  // Store callbacks in refs to avoid reconnecting when they change
  const onConnectedRef = useRef(onConnected)
  const onRoomUpdatedRef = useRef(onRoomUpdated)
  const onRoomClosedRef = useRef(onRoomClosed)
  const onErrorRef = useRef(onError)

  // Store credentials in refs for reconnection
  const accessTokenRef = useRef(accessToken)
  const roomCodeRef = useRef(roomCode)

  useEffect(() => {
    onConnectedRef.current = onConnected
    onRoomUpdatedRef.current = onRoomUpdated
    onRoomClosedRef.current = onRoomClosed
    onErrorRef.current = onError
  }, [onConnected, onRoomUpdated, onRoomClosed, onError])

  useEffect(() => {
    accessTokenRef.current = accessToken
    roomCodeRef.current = roomCode
  }, [accessToken, roomCode])

  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const sendMessage = useCallback((message: WSClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    pingIntervalRef.current = setInterval(() => {
      sendMessage({
        type: 'ping',
        request_id: crypto.randomUUID(),
      })
    }, PING_INTERVAL_MS)
  }, [sendMessage])

  // Define connect function and store in ref
  useEffect(() => {
    const doConnect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      const token = accessTokenRef.current
      const code = roomCodeRef.current

      if (!token || !code) {
        setConnectionError('Missing access token or room code')
        return
      }

      setIsConnecting(true)
      setConnectionError(null)

      // Connect without query parameters - authentication happens via message
      const url = `${WS_URL}/api/v1/ws`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        // Start ping interval immediately (ping works before authentication)
        startPingInterval()

        // Send authenticate message immediately after connection opens
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            payload: {
              token: accessTokenRef.current,
              room_code: roomCodeRef.current,
            },
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const message: WSServerMessage = JSON.parse(event.data)

          switch (message.type) {
            case 'authenticated':
              // Authentication successful - now fully connected
              setIsConnected(true)
              setIsConnecting(false)
              setConnectionError(null)
              reconnectAttemptRef.current = 0
              onConnectedRef.current?.(message.payload as unknown as ConnectedPayload)
              break
            case 'connected':
              // Deprecated: kept for backwards compatibility
              setIsConnected(true)
              setIsConnecting(false)
              setConnectionError(null)
              reconnectAttemptRef.current = 0
              onConnectedRef.current?.(message.payload as unknown as ConnectedPayload)
              break
            case 'room_updated':
              onRoomUpdatedRef.current?.(message.payload as unknown as RoomSnapshot)
              break
            case 'room_closed':
              shouldReconnectRef.current = false
              onRoomClosedRef.current?.(message.payload as unknown as RoomClosedPayload)
              break
            case 'error': {
              const errorPayload = message.payload as unknown as ErrorPayload
              // Handle authentication errors - don't reconnect for these
              switch (errorPayload.error_code) {
                case WS_ERROR_CODES.AUTH_FAILED:
                case WS_ERROR_CODES.AUTH_EXPIRED:
                  setConnectionError('Authentication failed')
                  setIsConnecting(false)
                  shouldReconnectRef.current = false
                  break
                case WS_ERROR_CODES.ROOM_NOT_FOUND:
                  setConnectionError('Room not found')
                  setIsConnecting(false)
                  shouldReconnectRef.current = false
                  break
                case WS_ERROR_CODES.ROOM_ACCESS_DENIED:
                  setConnectionError('Access denied to room')
                  setIsConnecting(false)
                  shouldReconnectRef.current = false
                  break
                case WS_ERROR_CODES.NOT_AUTHENTICATED:
                  setConnectionError('Not authenticated')
                  setIsConnecting(false)
                  shouldReconnectRef.current = false
                  break
              }
              onErrorRef.current?.(errorPayload)
              break
            }
            case 'pong':
              // Keepalive response, no action needed
              break
          }
        } catch {
          console.error('Failed to parse WebSocket message')
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        clearTimers()

        // Handle specific close codes
        switch (event.code) {
          case 4001: // AUTH_FAILED
          case 4002: // AUTH_EXPIRED
            setConnectionError('Authentication failed')
            shouldReconnectRef.current = false
            break
          case 4003: // ROOM_NOT_FOUND
            setConnectionError('Room not found')
            shouldReconnectRef.current = false
            break
          case 4004: // ROOM_ACCESS_DENIED
            setConnectionError('Access denied to room')
            shouldReconnectRef.current = false
            break
          case 4005: // AUTH_TIMEOUT
            setConnectionError('Authentication timeout')
            shouldReconnectRef.current = false
            break
          default:
            // Normal closure or network error - attempt reconnect
            if (shouldReconnectRef.current && reconnectAttemptRef.current < RECONNECT_MAX_ATTEMPTS) {
              const delay = Math.min(
                RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
                RECONNECT_MAX_DELAY_MS
              )
              reconnectAttemptRef.current++
              reconnectTimeoutRef.current = setTimeout(() => {
                connectRef.current()
              }, delay)
            } else if (reconnectAttemptRef.current >= RECONNECT_MAX_ATTEMPTS) {
              setConnectionError('Connection lost. Please refresh the page.')
            }
        }
      }

      ws.onerror = () => {
        // Error event is always followed by close event, handle there
      }
    }

    connectRef.current = doConnect
  }, [clearTimers, startPingInterval])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    clearTimers()
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }, [clearTimers])

  const toggleReady = useCallback(() => {
    sendMessage({
      type: 'toggle_ready',
      request_id: crypto.randomUUID(),
    })
  }, [sendMessage])

  const leaveRoom = useCallback(() => {
    sendMessage({
      type: 'leave_room',
      request_id: crypto.randomUUID(),
    })
    // Don't auto-reconnect after leaving
    shouldReconnectRef.current = false
  }, [sendMessage])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    shouldReconnectRef.current = true
    connectRef.current()

    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    connectionError,
    toggleReady,
    leaveRoom,
    disconnect,
  }
}
