'use client'

import { useState, useCallback } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import type { RoomState } from '@/types/room'

export interface JoinRoomError {
  type: 'validation' | 'join' | 'connection'
  message: string
}

export function useJoinRoom() {
  const { joinRoom: wsJoinRoom, status } = useWebSocket()
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<JoinRoomError | null>(null)
  const [room, setRoom] = useState<RoomState | null>(null)

  const joinRoom = useCallback(async (code: string): Promise<RoomState | null> => {
    // Validate code format (6 alphanumeric characters)
    const normalizedCode = code.toUpperCase().trim()
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      setError({ type: 'validation', message: 'Invalid room code format' })
      return null
    }

    if (status !== 'connected') {
      setError({ type: 'connection', message: 'Not connected to server' })
      return null
    }

    setIsJoining(true)
    setError(null)

    try {
      // Join room via WebSocket using the room code directly
      const joinedRoom = await wsJoinRoom(normalizedCode)
      setRoom(joinedRoom)
      return joinedRoom
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room'
      setError({ type: 'join', message: errorMessage })
      return null
    } finally {
      setIsJoining(false)
    }
  }, [wsJoinRoom, status])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearRoom = useCallback(() => {
    setRoom(null)
  }, [])

  return {
    joinRoom,
    isJoining,
    error,
    room,
    clearError,
    clearRoom,
    isConnected: status === 'connected',
    connectionStatus: status,
  }
}
