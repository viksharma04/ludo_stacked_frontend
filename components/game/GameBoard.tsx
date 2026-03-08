'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameCanvas } from './GameCanvas'
import { GameHUD } from './GameHUD'
import { DicePanel } from './DicePanel'
import { EventLog } from './EventLog'
import { SplitPopover } from './SplitPopover'
import { CaptureChoiceModal } from './CaptureChoiceModal'
import { VictoryScreen } from './VictoryScreen'
import { TurnTransitionToast } from './TurnTransitionToast'
import { useGameWebSocket } from '@/hooks/useGameWebSocket'
import { useGameStore } from '@/stores/gameStore'
import { useIsAnimating, useShowPenaltyAnimation, usePenaltyPlayerId, usePlayerById, useAvailableMoves } from '@/stores/selectors'
import type { PixiApp } from '@/lib/pixi/PixiApp'
import type { AnimationController } from '@/lib/pixi/AnimationController'
import { getMoveOptionsForStack, type MoveOption } from '@/lib/game/legalMoveParser'
import type { PlayerColor } from '@/types/game'

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
  const isAnimating = useIsAnimating()
  const showPenaltyAnimation = useShowPenaltyAnimation()
  const penaltyPlayerId = usePenaltyPlayerId()
  const penaltyPlayer = usePlayerById(penaltyPlayerId ?? '')
  const availableMoves = useAvailableMoves()

  const [, setPixiApp] = useState<PixiApp | null>(null)
  const [, setAnimationController] = useState<AnimationController | null>(null)
  const boardAreaRef = useRef<HTMLDivElement>(null)

  // Split popover state
  const [splitPopover, setSplitPopover] = useState<{
    x: number
    y: number
    options: MoveOption[]
    playerColor: PlayerColor
  } | null>(null)

  // Game WebSocket hook
  const {
    rollDice,
    selectMove,
    selectCaptureChoice,
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

  // Handle stack clicks — determine move from availableMoves
  const handleTokenClick = useCallback(
    (stackId: string, screenX: number, screenY: number) => {
      const options = getMoveOptionsForStack(stackId, availableMoves)

      if (options.length === 0) return

      const hasSplits = options.some(opt => opt.moves.length > 1)

      if (!hasSplits) {
        // No split options — auto-send with the first available roll
        selectMove(options[0].moves[0], options[0].roll)
      } else {
        // Split options available — show popover at stack position
        const store = useGameStore.getState()
        const myPlayer = store.players.find(p => p.player_id === store.myPlayerId)

        // Convert screen coords to position relative to the board area container
        const boardArea = boardAreaRef.current
        if (boardArea) {
          const rect = boardArea.getBoundingClientRect()
          setSplitPopover({
            x: screenX - rect.left,
            y: screenY - rect.top,
            options,
            playerColor: myPlayer?.color ?? 'red',
          })
          store.setSelectedStackId(stackId)
        }
      }
    },
    [selectMove, availableMoves]
  )

  // Handle split popover selection
  const handleSplitSelect = useCallback(
    (moveId: string, roll: number) => {
      selectMove(moveId, roll)
      setSplitPopover(null)
      useGameStore.getState().setSelectedStackId(null)
    },
    [selectMove]
  )

  const handleSplitDismiss = useCallback(() => {
    setSplitPopover(null)
    useGameStore.getState().setSelectedStackId(null)
  }, [])

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
      <div ref={boardAreaRef} className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
        <GameCanvas
          onTokenClick={handleTokenClick}
          onInitialized={handlePixiInitialized}
          className="w-full h-full min-h-[400px] lg:min-h-0"
        />

        {/* Split popover */}
        {splitPopover && (
          <SplitPopover
            x={splitPopover.x}
            y={splitPopover.y}
            options={splitPopover.options}
            playerColor={splitPopover.playerColor}
            onSelect={handleSplitSelect}
            onDismiss={handleSplitDismiss}
          />
        )}

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
