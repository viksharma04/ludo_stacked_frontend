'use client'

import { useState, useCallback } from 'react'
import {
  useDiceValue,
  useDiceRolling,
  useCanRoll,
  useRollsToAllocate,
  useIsMyTurn,
  useCurrentEvent,
} from '@/stores/selectors'
import { ANIMATION_DURATIONS } from '@/lib/game/constants'

interface DicePanelProps {
  onRoll: (value: number) => void
  className?: string
}

// Dice dot patterns for 1-6
const DICE_DOTS: Record<number, { cx: number; cy: number }[]> = {
  1: [{ cx: 50, cy: 50 }],
  2: [
    { cx: 25, cy: 25 },
    { cx: 75, cy: 75 },
  ],
  3: [
    { cx: 25, cy: 25 },
    { cx: 50, cy: 50 },
    { cx: 75, cy: 75 },
  ],
  4: [
    { cx: 25, cy: 25 },
    { cx: 75, cy: 25 },
    { cx: 25, cy: 75 },
    { cx: 75, cy: 75 },
  ],
  5: [
    { cx: 25, cy: 25 },
    { cx: 75, cy: 25 },
    { cx: 50, cy: 50 },
    { cx: 25, cy: 75 },
    { cx: 75, cy: 75 },
  ],
  6: [
    { cx: 25, cy: 25 },
    { cx: 75, cy: 25 },
    { cx: 25, cy: 50 },
    { cx: 75, cy: 50 },
    { cx: 25, cy: 75 },
    { cx: 75, cy: 75 },
  ],
}

function DiceFace({
  value,
  isRolling,
}: {
  value: number | null
  isRolling: boolean
}) {
  const displayValue = value ?? 1
  const dots = DICE_DOTS[displayValue] || DICE_DOTS[1]

  return (
    <div
      className={`
        relative w-16 h-16 bg-white rounded-lg shadow-lg
        border-2 border-gray-200 dark:border-gray-600
        ${isRolling ? 'animate-bounce' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.cx}
            cy={dot.cy}
            r={10}
            fill={isRolling ? '#9CA3AF' : '#1F2937'}
            className={isRolling ? 'animate-pulse' : ''}
          />
        ))}
      </svg>
    </div>
  )
}

export function DicePanel({ onRoll, className = '' }: DicePanelProps) {
  const diceValue = useDiceValue()
  const diceRolling = useDiceRolling()
  const canRoll = useCanRoll()
  const rollsToAllocate = useRollsToAllocate()
  const isMyTurn = useIsMyTurn()
  const currentEvent = useCurrentEvent()

  const [localRolling, setLocalRolling] = useState(false)

  const handleRoll = useCallback(() => {
    if (!canRoll || localRolling || diceRolling) return

    // Generate random dice value (1-6)
    const value = Math.floor(Math.random() * 6) + 1

    setLocalRolling(true)

    // Wait for dice animation to complete before sending to server
    setTimeout(() => {
      onRoll(value)
      setLocalRolling(false)
    }, ANIMATION_DURATIONS.DICE_ROLL)
  }, [canRoll, localRolling, diceRolling, onRoll])

  const isRolling = localRolling || diceRolling
  const showRollButton = isMyTurn && currentEvent === 'player_roll'

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Dice</div>

      <div className="flex flex-col items-center gap-4">
        {/* Dice display */}
        <DiceFace value={diceValue} isRolling={isRolling} />

        {/* Roll result */}
        {diceValue !== null && !isRolling && (
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {diceValue}
          </p>
        )}

        {/* Pending rolls indicator */}
        {rollsToAllocate.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Rolls to use:{' '}
            <span className="font-medium text-accent">
              {rollsToAllocate.join(', ')}
            </span>
          </div>
        )}

        {/* Roll button */}
        {showRollButton && (
          <button
            onClick={handleRoll}
            disabled={!canRoll || isRolling}
            className={`
              w-full px-6 py-3 rounded-lg font-semibold text-white
              transition-all duration-200
              ${
                canRoll && !isRolling
                  ? 'bg-accent hover:bg-accent-hover active:scale-95 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isRolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        )}

        {/* Waiting indicator */}
        {!isMyTurn && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Waiting for opponent...
          </p>
        )}

        {/* Move selection indicator */}
        {isMyTurn && currentEvent === 'player_choice' && (
          <p className="text-sm text-accent font-medium text-center">
            Select a token to move
          </p>
        )}
      </div>
    </div>
  )
}
