'use client'

import { useState, useCallback } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import type { Room } from '@/types/room'

export function useCreateRoom() {
  const { createRoom: wsCreateRoom, status } = useWebSocket()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)

  const createRoom = useCallback(async (maxPlayers: number) => {
    console.log('[useCreateRoom] createRoom called, status:', status)
    if (status !== 'connected') {
      console.log('[useCreateRoom] Not connected, setting error')
      setError('Not connected to server')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      console.log('[useCreateRoom] Calling wsCreateRoom')
      const createdRoom = await wsCreateRoom(maxPlayers)
      console.log('[useCreateRoom] Room created:', createdRoom)
      setRoom(createdRoom)
    } catch (err) {
      console.error('[useCreateRoom] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room'
      console.log('[useCreateRoom] Setting error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }, [wsCreateRoom, status])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearRoom = useCallback(() => {
    setRoom(null)
  }, [])

  return {
    createRoom,
    isCreating,
    error,
    room,
    clearError,
    clearRoom,
    isConnected: status === 'connected',
    connectionStatus: status,
  }
}
