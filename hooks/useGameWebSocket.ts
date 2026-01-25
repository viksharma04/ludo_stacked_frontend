'use client'

import { useCallback, useEffect, useRef } from 'react'
import type {
  GameActionType,
  GameEvent,
  GameState,
  WSGameEventsMessage,
  WSGameStateMessage,
  WSGameErrorMessage,
} from '@/types/game'
import { processEvents, applyGameState } from '@/lib/game/eventProcessor'
import {
  SequenceManager,
  createSequenceManager,
} from '@/lib/game/sequenceManager'
import { useGameStore } from '@/stores/gameStore'
import { GAME_MESSAGE_TYPES } from '@/lib/game/constants'

interface GameMessage {
  type: string
  request_id?: string
  payload?: unknown
}

interface UseGameWebSocketOptions {
  sendMessage: (message: GameMessage) => void
  myPlayerId: string | null
  onError?: (code: string, message: string) => void
  onStateResync?: () => void
}

export function useGameWebSocket({
  sendMessage,
  myPlayerId,
  onError,
  onStateResync,
}: UseGameWebSocketOptions) {
  const sequenceManagerRef = useRef<SequenceManager>(createSequenceManager())
  const myPlayerIdRef = useRef(myPlayerId)

  // Keep refs up to date
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId
  }, [myPlayerId])

  // Set up gap detection handler
  useEffect(() => {
    sequenceManagerRef.current.setGapHandler((gap) => {
      console.warn('Sequence gap detected:', gap)
      // Request full state resync
      requestStateResync()
    })
  }, [])

  // Request state resync
  const requestStateResync = useCallback(() => {
    sendMessage({
      type: 'request_state',
      request_id: crypto.randomUUID(),
    })
    if (onStateResync) {
      onStateResync()
    }
  }, [sendMessage, onStateResync])

  // Handle incoming game messages
  const handleGameMessage = useCallback(
    (message: GameMessage) => {
      switch (message.type) {
        case GAME_MESSAGE_TYPES.GAME_EVENTS: {
          const payload = message.payload as WSGameEventsMessage['payload']
          if (!payload?.events) return

          // Process through sequence manager
          const readyEvents = sequenceManagerRef.current.processEvents(
            payload.events
          )

          if (readyEvents.length > 0) {
            processEvents(readyEvents)
          }
          break
        }

        case GAME_MESSAGE_TYPES.GAME_STATE: {
          const state = message.payload as GameState
          if (!state || !myPlayerIdRef.current) return

          // Reset sequence manager to match server state
          sequenceManagerRef.current.reset(state.event_seq - 1)

          // Apply full state
          applyGameState(state, myPlayerIdRef.current)
          break
        }

        case GAME_MESSAGE_TYPES.GAME_ERROR: {
          const error = message.payload as WSGameErrorMessage['payload']
          if (error && onError) {
            onError(error.error_code, error.message)
          }
          break
        }
      }
    },
    [onError]
  )

  // Game actions
  const rollDice = useCallback(
    (value: number) => {
      sendMessage({
        type: 'game_action',
        request_id: crypto.randomUUID(),
        payload: {
          action_type: 'roll' as GameActionType,
          value,
        },
      })
    },
    [sendMessage]
  )

  const selectMove = useCallback(
    (tokenOrStackId: string) => {
      sendMessage({
        type: 'game_action',
        request_id: crypto.randomUUID(),
        payload: {
          action_type: 'move' as GameActionType,
          token_or_stack_id: tokenOrStackId,
        },
      })

      // Clear highlights and close modal
      const store = useGameStore.getState()
      store.clearHighlightedTokens()
      store.setShowMoveChoiceModal(false)
    },
    [sendMessage]
  )

  const selectCaptureChoice = useCallback(
    (choice: 'stack' | 'capture' | string) => {
      sendMessage({
        type: 'game_action',
        request_id: crypto.randomUUID(),
        payload: {
          action_type: 'capture_choice' as GameActionType,
          choice,
        },
      })

      // Close modal
      const store = useGameStore.getState()
      store.setShowCaptureChoiceModal(false)
      store.setCaptureOptions([])
    },
    [sendMessage]
  )

  const startGame = useCallback(() => {
    sendMessage({
      type: 'game_action',
      request_id: crypto.randomUUID(),
      payload: {
        action_type: 'start_game' as GameActionType,
      },
    })
  }, [sendMessage])

  return {
    handleGameMessage,
    rollDice,
    selectMove,
    selectCaptureChoice,
    startGame,
    requestStateResync,
  }
}
