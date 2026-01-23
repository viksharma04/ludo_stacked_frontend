'use client'

import { createContext, useContext, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useRoomWebSocket } from '@/hooks/useRoomWebSocket'
import type {
  RoomSnapshot,
  ConnectedPayload,
  ErrorPayload,
} from '@/types/room'

interface RoomContextType {
  room: RoomSnapshot | null
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  userId: string | null
  isHost: boolean
  isReady: boolean
  canStartGame: boolean
  toggleReady: () => void
  leaveRoom: () => void
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

interface RoomProviderProps {
  children: React.ReactNode
  roomCode: string
}

export function RoomProvider({ children, roomCode }: RoomProviderProps) {
  const router = useRouter()
  const { session } = useAuth()
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const handleConnected = useCallback((payload: ConnectedPayload) => {
    setRoom(payload.room)
    setUserId(payload.user_id)
  }, [])

  const handleRoomUpdated = useCallback((updatedRoom: RoomSnapshot) => {
    setRoom(updatedRoom)
  }, [])

  const handleRoomClosed = useCallback(() => {
    // Show toast and navigate back to lobby when room is closed
    toast.error('Host closed the room')
    router.push('/lobby')
  }, [router])

  const handleError = useCallback((payload: ErrorPayload) => {
    console.error('Room WebSocket error:', payload.error_code, payload.message)
    toast.error(payload.message || 'An error occurred in the room connection.')
  }, [])

  const {
    isConnected,
    isConnecting,
    connectionError,
    toggleReady: wsToggleReady,
    leaveRoom: wsLeaveRoom,
  } = useRoomWebSocket({
    accessToken: session?.access_token || '',
    roomCode,
    onConnected: handleConnected,
    onRoomUpdated: handleRoomUpdated,
    onRoomClosed: handleRoomClosed,
    onError: handleError,
  })

  // Find current user's seat
  const currentSeat = useMemo(() => {
    if (!room || !userId) return null
    return room.seats.find((seat) => seat.user_id === userId) || null
  }, [room, userId])

  const isHost = currentSeat?.is_host ?? false
  const isReady = currentSeat?.ready === 'ready'

  // Can start game when host and all seats are filled and ready
  const canStartGame = useMemo(() => {
    if (!isHost || !room) return false
    return room.status === 'ready_to_start'
  }, [isHost, room])

  const toggleReady = useCallback(() => {
    wsToggleReady()
  }, [wsToggleReady])

  const leaveRoom = useCallback(() => {
    wsLeaveRoom()
    router.push('/lobby')
  }, [wsLeaveRoom, router])

  return (
    <RoomContext.Provider
      value={{
        room,
        isConnected,
        isConnecting,
        connectionError,
        userId,
        isHost,
        isReady,
        canStartGame,
        toggleReady,
        leaveRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const context = useContext(RoomContext)
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return context
}
