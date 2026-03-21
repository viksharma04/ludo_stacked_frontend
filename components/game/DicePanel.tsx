'use client'

import { useState, useCallback } from 'react'
import {
  useDiceValue,
  useDiceRolling,
  useRollReason,
  useCanRoll,
  useRollsToAllocate,
  useIsMyTurn,
  useCurrentEvent,
  useMyPlayer,
} from '@/stores/selectors'
import { ANIMATION_DURATIONS } from '@/lib/game/constants'
import type { PlayerColor } from '@/types/game'

// Player color to Tailwind CSS classes mapping
const PLAYER_BUTTON_COLORS: Record<PlayerColor, { enabled: string; hover: string }> = {
  red: {
    enabled: 'bg-red-500',
    hover: 'hover:bg-red-600',
  },
  blue: {
    enabled: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
  },
  green: {
    enabled: 'bg-green-500',
    hover: 'hover:bg-green-600',
  },
  yellow: {
    enabled: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
  },
}

interface DicePanelProps {
  onRoll: (value: number) => void
  className?: string
  compact?: boolean
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

export function DicePanel({ onRoll, className = '', compact = false }: DicePanelProps) {
  const diceValue = useDiceValue()
  const diceRolling = useDiceRolling()
  const rollReason = useRollReason()
  const canRoll = useCanRoll()
  const rollsToAllocate = useRollsToAllocate()
  const isMyTurn = useIsMyTurn()
  const currentEvent = useCurrentEvent()
  const myPlayer = useMyPlayer()

  const [localRolling, setLocalRolling] = useState(false)

  // Get button colors based on player color
  const buttonColors = myPlayer?.color
    ? PLAYER_BUTTON_COLORS[myPlayer.color]
    : { enabled: 'bg-accent', hover: 'hover:bg-accent-hover' }

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

  // Get bonus roll message based on reason
  const getBonusRollMessage = () => {
    if (!showRollButton || !rollReason) return null
    switch (rollReason) {
      case 'rolled_six':
        return 'You rolled a 6! Roll again!'
      case 'capture_bonus':
        return 'Capture bonus! Roll again!'
      case 'reached_heaven':
        return 'Reached heaven! Roll again!'
      default:
        return null
    }
  }
  const bonusMessage = getBonusRollMessage()

  if (compact) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 z-40 ${className}`}
      >
        <div className="flex items-center gap-3">
          {/* Small dice face */}
          <div
            className={`relative w-10 h-10 bg-white rounded-md shadow border border-gray-200 dark:border-gray-600 flex-shrink-0 ${isRolling ? 'animate-bounce' : ''}`}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {(DICE_DOTS[diceValue ?? 1] || DICE_DOTS[1]).map((dot, index) => (
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

          {/* Status text */}
          <div className="flex-1 min-w-0">
            {bonusMessage && !isRolling && (
              <p className="text-xs font-medium text-green-600 dark:text-green-400 truncate animate-pulse">
                {bonusMessage}
              </p>
            )}
            {rollsToAllocate.length > 0 && !isRolling && (
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                Rolls: <span className="font-medium text-accent">{rollsToAllocate.join(', ')}</span>
              </p>
            )}
            {!isMyTurn && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Waiting for opponent...
              </p>
            )}
            {isMyTurn && currentEvent === 'player_choice' && (
              <p className="text-xs text-accent font-medium">
                Select a piece to move
              </p>
            )}
            {diceValue !== null && !isRolling && !bonusMessage && rollsToAllocate.length === 0 && isMyTurn && currentEvent !== 'player_choice' && !showRollButton && (
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Rolled: {diceValue}
              </p>
            )}
          </div>

          {/* Roll button */}
          {showRollButton ? (
            <button
              onClick={handleRoll}
              disabled={!canRoll || isRolling}
              className={`
                px-4 py-2 rounded-lg font-semibold text-white text-sm flex-shrink-0
                transition-all duration-200
                ${
                  canRoll && !isRolling
                    ? `${buttonColors.enabled} ${buttonColors.hover} active:scale-95 cursor-pointer`
                    : 'bg-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isRolling ? 'Rolling...' : 'Roll'}
            </button>
          ) : (
            diceValue !== null && !isRolling && (
              <div className="text-lg font-bold text-gray-900 dark:text-white flex-shrink-0 w-8 text-center">
                {diceValue}
              </div>
            )
          )}
        </div>
      </div>
    )
  }

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

        {/* Pending rolls indicator - hidden during animation */}
        {rollsToAllocate.length > 0 && !isRolling && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Rolls to use:{' '}
            <span className="font-medium text-accent">
              {rollsToAllocate.join(', ')}
            </span>
          </div>
        )}

        {/* Bonus roll indicator */}
        {bonusMessage && !isRolling && (
          <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center animate-pulse">
            {bonusMessage}
          </p>
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
                  ? `${buttonColors.enabled} ${buttonColors.hover} active:scale-95 cursor-pointer`
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
            Select a piece to move
          </p>
        )}
      </div>
    </div>
  )
}
