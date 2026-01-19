'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { WebSocketClient, generateRequestId } from '@/lib/websocket/client'
import type {
  WebSocketStatus,
  CreateRoomOkMessage,
  CreateRoomMessage,
  JoinRoomOkMessage,
  JoinRoomMessage,
  IncomingMessage,
  RoomUpdatedMessage,
  SeatPayload,
} from '@/types/websocket'
import { MessageType } from '@/types/websocket'
import type { RoomState, Seat } from '@/types/room'

interface WebSocketContextType {
  status: WebSocketStatus
  currentRoom: RoomState | null
  error: string | null
  createRoom: (maxPlayers: number) => Promise<RoomState>
  joinRoom: (roomCode: string) => Promise<RoomState>
  disconnect: () => void
  clearRoom: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<WebSocketClient | null>(null)
  const userIdRef = useRef<string | null>(null)

  // Helper function to convert payload seats to RoomState seats
  const convertSeats = (payloadSeats: SeatPayload[]): Seat[] => {
    return payloadSeats.map((seat) => ({
      seat_index: seat.seat_index,
      player: seat.user_id
        ? {
            user_id: seat.user_id,
            display_name: seat.display_name || '',
            avatar_url: seat.avatar_url || null,
          }
        : null,
      is_ready: seat.ready === 'ready',
      is_host: seat.is_host,
    }))
  }

  // Handle real-time room state messages
  const handleRoomMessage = useCallback((message: IncomingMessage) => {
    switch (message.type) {
      case MessageType.CONNECTED: {
        // Store the user ID when connected
        userIdRef.current = message.user_id
        break
      }
      case MessageType.ROOM_UPDATED: {
        // Broadcast to other room members when someone joins/leaves
        const updated = message as RoomUpdatedMessage
        const room = updated.payload.room
        const seats = convertSeats(room.seats)
        // Keep our existing seat_index, just update the seats
        setCurrentRoom((prev) => {
          if (!prev) return prev
          // Find our seat based on user_id
          const mySeatIndex = room.seats.findIndex((s) => s.user_id === userIdRef.current)
          const mySeat = mySeatIndex >= 0 ? seats[mySeatIndex] : null
          return {
            ...prev,
            seat_index: mySeatIndex >= 0 ? mySeatIndex : prev.seat_index,
            is_host: mySeat?.is_host ?? prev.is_host,
            max_players: room.max_players,
            seats,
          }
        })
        break
      }
    }
  }, [])

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

    // Subscribe to room-related messages for real-time updates
    const unsubscribeMessage = client.onMessage(handleRoomMessage)

    client.connect(session.access_token)

    return () => {
      unsubscribeStatus()
      unsubscribeMessage()
      client.disconnect()
    }
  }, [session?.access_token, handleRoomMessage])

  const createRoom = useCallback(async (maxPlayers: number): Promise<RoomState> => {
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
    const roomData = response.payload
    const seats = convertSeats(roomData.seats)

    // Find our seat by user_id (the creating user is always the host)
    const seatIndex = roomData.seats.findIndex((s) => s.user_id === userIdRef.current)

    const room: RoomState = {
      room_id: roomData.room_id,
      code: roomData.code,
      seat_index: seatIndex,
      is_host: true,
      max_players: roomData.max_players,
      seats,
    }

    setCurrentRoom(room)
    return room
  }, [])

  const joinRoom = useCallback(async (roomCode: string): Promise<RoomState> => {
    const client = clientRef.current
    if (!client?.isConnected()) {
      throw new Error('Not connected to server')
    }

    const message: JoinRoomMessage = {
      type: MessageType.JOIN_ROOM,
      request_id: generateRequestId(),
      payload: {
        room_code: roomCode,
      },
    }

    const response = await client.sendRequest<JoinRoomOkMessage>(message)
    const roomData = response.payload
    const seats = convertSeats(roomData.seats)

    // Find our seat by user_id
    const seatIndex = roomData.seats.findIndex((s) => s.user_id === userIdRef.current)
    const mySeat = seatIndex >= 0 ? seats[seatIndex] : null

    const room: RoomState = {
      room_id: roomData.room_id,
      code: roomData.code,
      seat_index: seatIndex,
      is_host: mySeat?.is_host ?? false,
      max_players: roomData.max_players,
      seats,
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
        joinRoom,
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
