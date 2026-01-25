'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameCanvas } from './GameCanvas'
import { GameHUD } from './GameHUD'
import { DicePanel } from './DicePanel'
import { EventLog } from './EventLog'
import { CaptureChoiceModal } from './CaptureChoiceModal'
import { VictoryScreen } from './VictoryScreen'
import { TurnTransitionToast } from './TurnTransitionToast'
import { useGameWebSocket } from '@/hooks/useGameWebSocket'
import { useGameStore } from '@/stores/gameStore'
import { usePhase, useIsAnimating, useShowPenaltyAnimation, usePenaltyPlayerId, usePlayerById, useLegalMoves, usePlayers } from '@/stores/selectors'
import type { PixiApp } from '@/lib/pixi/PixiApp'
import type { AnimationController } from '@/lib/pixi/AnimationController'
import type { GameEvent } from '@/types/game'
import {
  findEntityForToken,
  groupLegalMoves,
  getStackInfo,
} from '@/lib/game/legalMoveParser'

interface GameBoardProps {
  sendMessage: (message: { type: string; request_id?: string; payload?: unknown }) => void
  myPlayerId: string
  onReturnToLobby?: () => void
}

export function GameBoard({
  sendMessage,
  myPlayerId,
  onReturnToLobby,
}: GameBoardProps) {
  const router = useRouter()
  const phase = usePhase()
  const isAnimating = useIsAnimating()
  const showPenaltyAnimation = useShowPenaltyAnimation()
  const penaltyPlayerId = usePenaltyPlayerId()
  const penaltyPlayer = usePlayerById(penaltyPlayerId ?? '')
  const legalMoves = useLegalMoves()
  const players = usePlayers()

  const [pixiApp, setPixiApp] = useState<PixiApp | null>(null)
  const [animationController, setAnimationController] = useState<AnimationController | null>(null)

  // Game WebSocket hook
  const {
    handleGameMessage,
    rollDice,
    selectMove,
    selectCaptureChoice,
    startGame,
  } = useGameWebSocket({
    sendMessage,
    myPlayerId,
    onError: (code, message) => {
      console.error('Game error:', code, message)
      // Could show a toast here
    },
  })

  // Initialize store with my player ID
  useEffect(() => {
    useGameStore.getState().setMyPlayerId(myPlayerId)
  }, [myPlayerId])

  // Handle Pixi initialization
  const handlePixiInitialized = useCallback(
    (app: PixiApp, controller: AnimationController) => {
      setPixiApp(app)
      setAnimationController(controller)
    },
    []
  )

  // Handle token clicks with new direct selection flow
  const handleTokenClick = useCallback(
    (tokenId: string) => {
      if (!pixiApp) return

      const tokenRenderer = pixiApp.getTokenRenderer()
      const geometry = pixiApp.getGeometry()
      if (!tokenRenderer || !geometry) return

      // Clear any existing split options first
      tokenRenderer.clearSplitOptions()

      // Find what entity this token belongs to (token or stack)
      // Pass legalMoves to ensure we use the correct entity type based on actual legal moves
      const entity = findEntityForToken(tokenId, players, legalMoves)

      // Group legal moves to find options for this entity
      const groupedMoves = groupLegalMoves(legalMoves)

      const options = groupedMoves.get(entity.entityId)

      if (!options || options.length === 0) {
        // Not a legal move, ignore
        return
      }

      if (options.length === 1) {
        // Single option - submit move directly
        selectMove(options[0].rawId)
      } else {
        // Multiple options - show split selection overlay
        const stackInfo = getStackInfo(entity.entityId, players)
        if (!stackInfo) return

        // Get the position of the first token in the stack
        const firstTokenId = stackInfo.stack.tokens[0]
        const firstTokenPlayer = players.find(p => p.player_id === stackInfo.playerId)
        if (!firstTokenPlayer) return

        const firstToken = firstTokenPlayer.tokens.find(t => t.token_id === firstTokenId)
        if (!firstToken) return

        const position = geometry.getTokenPosition(
          firstTokenPlayer.color,
          firstTokenPlayer.abs_starting_index,
          firstToken.state,
          firstToken.progress,
          0
        )

        tokenRenderer.showStackSplitOptions(
          options,
          position,
          stackInfo.stack.tokens.length,
          firstTokenPlayer.color,
          (rawId: string) => {
            tokenRenderer.clearSplitOptions()
            selectMove(rawId)
          }
        )
      }
    },
    [selectMove, pixiApp, players, legalMoves]
  )

  // Handle escape key to cancel split selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pixiApp) {
        const tokenRenderer = pixiApp.getTokenRenderer()
        if (tokenRenderer?.hasSplitOptionsVisible()) {
          tokenRenderer.clearSplitOptions()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pixiApp])

  // Handle return to lobby
  const handleReturnToLobby = useCallback(() => {
    if (onReturnToLobby) {
      onReturnToLobby()
    } else {
      router.push('/lobby')
    }
  }, [onReturnToLobby, router])

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px] gap-4 p-4">
      {/* Main game board area */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
        <GameCanvas
          onTokenClick={handleTokenClick}
          onInitialized={handlePixiInitialized}
          className="w-full h-full min-h-[400px] lg:min-h-0"
        />

        {/* Animation overlay indicator */}
        {isAnimating && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
            Playing...
          </div>
        )}

        {/* Penalty animation overlay */}
        {showPenaltyAnimation && penaltyPlayer && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-red-500 text-white px-8 py-6 rounded-2xl text-center animate-pulse">
              <div className="text-4xl mb-2">❌</div>
              <p className="text-xl font-bold">Three Sixes!</p>
              <p className="text-sm opacity-90">
                {penaltyPlayer.name} loses their turn
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <GameHUD />
        <DicePanel onRoll={rollDice} />
        <EventLog />
      </div>

      {/* Modals */}
      <CaptureChoiceModal onSelectChoice={selectCaptureChoice} />
      <VictoryScreen onReturnToLobby={handleReturnToLobby} />

      {/* Turn transition toast */}
      <TurnTransitionToast />
    </div>
  )
}

// Export a message handler that can be used by the parent component
export function createGameMessageHandler(handleGameMessage: (message: unknown) => void) {
  return (message: { type: string; payload?: unknown }) => {
    if (
      message.type === 'game_events' ||
      message.type === 'game_state' ||
      message.type === 'game_error'
    ) {
      handleGameMessage(message)
    }
  }
}
