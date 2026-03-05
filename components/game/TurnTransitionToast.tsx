'use client'

import { useTurnTransition } from '@/stores/selectors'
import type { PlayerColor } from '@/types/game'

const PLAYER_COLOR_STYLES: Record<
  PlayerColor,
  { bg: string; border: string; text: string }
> = {
  red: {
    bg: 'bg-red-500',
    border: 'border-red-600',
    text: 'text-white',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-white',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-600',
    text: 'text-white',
  },
  yellow: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-500',
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
