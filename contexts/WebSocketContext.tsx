'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { WebSocketClient, generateRequestId } from '@/lib/websocket/client'
import type { WebSocketStatus, CreateRoomOkMessage, CreateRoomMessage } from '@/types/websocket'
import { MessageType } from '@/types/websocket'
import type { Room } from '@/types/room'

interface WebSocketContextType {
  status: WebSocketStatus
  currentRoom: Room | null
  error: string | null
  createRoom: (maxPlayers: number) => Promise<Room>
  disconnect: () => void
  clearRoom: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    console.log('[WebSocketContext] Effect running, hasToken:', !!session?.access_token)
    if (!session?.access_token) {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
      queueMicrotask(() => setStatus('disconnected'))
      return
    }

    const client = new WebSocketClient()
    clientRef.current = client

    const unsubscribeStatus = client.onStatusChange((newStatus) => {
      console.log('[WebSocketContext] Status changed to:', newStatus)
      // These updates come from the WebSocket event callbacks, which are external
      setStatus(newStatus)
      if (newStatus === 'error') {
        setError('Connection error')
      } else if (newStatus === 'connected') {
        setError(null)
      }
    })

    client.connect(session.access_token)

    return () => {
      unsubscribeStatus()
      client.disconnect()
    }
  }, [session?.access_token])

  const createRoom = useCallback(async (maxPlayers: number): Promise<Room> => {
    const client = clientRef.current
    if (!client?.isConnected()) {
      throw new Error('Not connected to server')
    }

    const message: CreateRoomMessage = {
      type: MessageType.CREATE_ROOM,
      request_id: generateRequestId(),
      payload: {
        visibility: 'private',
        max_players: maxPlayers,
        ruleset_id: 'classic',
        ruleset_config: {},
      },
    }

    const response = await client.sendRequest<CreateRoomOkMessage>(message)

    const room: Room = {
      room_id: response.payload.room_id,
      code: response.payload.code,
      seat_index: response.payload.seat_index,
      is_host: response.payload.is_host,
    }

    setCurrentRoom(room)
    return room
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
  }, [])

  const clearRoom = useCallback(() => {
    setCurrentRoom(null)
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        status,
        currentRoom,
        error,
        createRoom,
        disconnect,
        clearRoom,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
