'use client'

import { createContext, useContext, useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useRoomWebSocket } from '@/hooks/useRoomWebSocket'
import { useGameStore, resetGameStore } from '@/stores/gameStore'
import { processEvents, applyGameState } from '@/lib/game/eventProcessor'
import { createSequenceManager, type SequenceManager } from '@/lib/game/sequenceManager'
import type {
  RoomSnapshot,
  ConnectedPayload,
  ErrorPayload,
  GameSettings,
} from '@/types/room'
import type { GameState, GameEvent } from '@/types/game'

interface GameMessage {
  type: string
  request_id?: string
  payload?: unknown
}

interface RoomContextType {
  room: RoomSnapshot | null
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  userId: string | null
  isHost: boolean
  isReady: boolean
  canStartGame: boolean
  isInGame: boolean
  toggleReady: () => void
  leaveRoom: () => void
  startGame: (gameSettings?: GameSettings) => void
  sendGameMessage: (message: GameMessage) => void
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
  const [isInGame, setIsInGame] = useState(false)

  const sequenceManagerRef = useRef<SequenceManager>(createSequenceManager())
  // Ref for userId to avoid stale closure in handleGameMessage.
  // On reconnect, handleConnected sets this synchronously before game_state arrives,
  // while React state (userId) won't update until the next render.
  const userIdRef = useRef<string | null>(null)

  // Reset game store when entering a new room to clear stale state (e.g. victory screen)
  useEffect(() => {
    resetGameStore()
  }, [roomCode])

  const handleConnected = useCallback((payload: ConnectedPayload) => {
    setRoom(payload.room)
    setUserId(payload.user_id)
    userIdRef.current = payload.user_id
    // Initialize game store with player ID
    useGameStore.getState().setMyPlayerId(payload.user_id)
    // If reconnecting to a room that's already in game, transition to game UI
    // (the server will also auto-push a game_state message with full state)
    if (payload.room.status === 'in_game') {
      setIsInGame(true)
    }
  }, [])

  const handleRoomUpdated = useCallback((updatedRoom: RoomSnapshot) => {
    setRoom(updatedRoom)
    // Check if game has started (backend room status is 'in_game')
    if (updatedRoom.status === 'in_game') {
      setIsInGame(true)
    }
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

  const handleGameMessage = useCallback((message: GameMessage) => {
    // Read userId from ref (set synchronously in handleConnected) to avoid
    // stale closure — React state may not have updated yet when server
    // sends game_state immediately after authenticated.
    const currentUserId = userIdRef.current

    switch (message.type) {
      // Host receives game_started with full game state
      case 'game_started': {
        const payload = message.payload as { game_state: GameState; events: GameEvent[] }
        if (!payload || !currentUserId) return

        // Apply full game state
        if (payload.game_state) {
          sequenceManagerRef.current.reset(payload.game_state.event_seq - 1)
          applyGameState(payload.game_state, currentUserId)
        }

        // Process initial events
        if (payload.events?.length > 0) {
          const readyEvents = sequenceManagerRef.current.processEvents(payload.events)
          if (readyEvents.length > 0) {
            processEvents(readyEvents)
          }
        }

        setIsInGame(true)
        break
      }

      // All players receive game_events broadcast
      case 'game_events': {
        const payload = message.payload as { events: GameEvent[] }
        if (!payload?.events) return

        // Process through sequence manager
        const readyEvents = sequenceManagerRef.current.processEvents(payload.events)
        if (readyEvents.length > 0) {
          processEvents(readyEvents)
        }

        // Check if game started
        const gameStartedEvent = payload.events.find(e => e.event_type === 'game_started')
        if (gameStartedEvent) {
          setIsInGame(true)
        }
        break
      }

      case 'game_state': {
        const payload = message.payload as { state: GameState }
        const state = payload?.state
        if (!state || !currentUserId) return

        // Reset sequence manager to match server state
        sequenceManagerRef.current.reset(state.event_seq - 1)

        // Apply full state
        applyGameState(state, currentUserId)

        // Set in game if game is in progress
        if (state.phase === 'in_progress') {
          setIsInGame(true)
        }
        break
      }

      case 'game_error': {
        const error = message.payload as { error_code: string; message: string }
        if (error) {
          console.error('Game error:', error.error_code, error.message)
          toast.error(error.message || 'Game error occurred')
        }
        break
      }
    }
  }, [])

  const {
    isConnected,
    isConnecting,
    connectionError,
    toggleReady: wsToggleReady,
    leaveRoom: wsLeaveRoom,
    sendGameMessage: wsSendGameMessage,
  } = useRoomWebSocket({
    accessToken: session?.access_token || '',
    roomCode,
    onConnected: handleConnected,
    onRoomUpdated: handleRoomUpdated,
    onRoomClosed: handleRoomClosed,
    onError: handleError,
    onGameMessage: handleGameMessage,
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

  const startGame = useCallback((gameSettings?: GameSettings) => {
    wsSendGameMessage({
      type: 'start_game',
      request_id: crypto.randomUUID(),
      ...(gameSettings && { payload: { game_settings: gameSettings } }),
    })
  }, [wsSendGameMessage])

  const sendGameMessage = useCallback((message: GameMessage) => {
    wsSendGameMessage(message)
  }, [wsSendGameMessage])

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
        isInGame,
        toggleReady,
        leaveRoom,
        startGame,
        sendGameMessage,
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
