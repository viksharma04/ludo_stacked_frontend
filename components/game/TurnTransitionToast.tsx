'use client'

import { useTurnTransition } from '@/stores/selectors'
import type { PlayerColor } from '@/types/game'

const PLAYER_COLOR_STYLES: Record<
  PlayerColor,
  { bg: string; border: string; text: string }
> = {
  red: {
    bg: 'bg-red-300',
    border: 'border-red-400',
    text: 'text-gray-900',
  },
  blue: {
    bg: 'bg-blue-300',
    border: 'border-blue-400',
    text: 'text-gray-900',
  },
  green: {
    bg: 'bg-green-300',
    border: 'border-green-400',
    text: 'text-gray-900',
  },
  yellow: {
    bg: 'bg-yellow-200',
    border: 'border-yellow-300',
    text: 'text-gray-900',
  },
}

export function TurnTransitionToast() {
  const turnTransition = useTurnTransition()

  if (!turnTransition) return null

  const colorStyles = PLAYER_COLOR_STYLES[turnTransition.playerColor]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-down">
      <div
        className={`
          px-6 py-3 rounded-lg shadow-lg border-2
          ${colorStyles.bg} ${colorStyles.border} ${colorStyles.text}
          flex items-center gap-3
        `}
      >
        <div className="w-3 h-3 rounded-full bg-white/30 animate-pulse" />
        <div className="text-center">
          <p className="font-semibold text-lg">
            {turnTransition.isMyTurn ? 'Your Turn!' : `${turnTransition.playerName}'s Turn`}
          </p>
          {turnTransition.isMyTurn && (
            <p className="text-sm opacity-90">Roll the dice to begin</p>
          )}
        </div>
        <div className="w-3 h-3 rounded-full bg-white/30 animate-pulse" />
      </div>
    </div>
  )
}
