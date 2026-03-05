'use client'

import { useMemo } from 'react'
import {
  usePlayers,
  useCurrentPlayer,
  useIsMyTurn,
  useIsAnimating,
  computePlayerProgress,
} from '@/stores/selectors'
import type { PlayerColor } from '@/types/game'

function getColorClass(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
  }
  return colorMap[color] || 'bg-gray-500'
}

function getColorBorderClass(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: 'border-red-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    yellow: 'border-yellow-400',
  }
  return colorMap[color] || 'border-gray-500'
}

interface GameHUDProps {
  className?: string
}

export function GameHUD({ className = '' }: GameHUDProps) {
  const players = usePlayers()
  const currentPlayer = useCurrentPlayer()
  const isMyTurn = useIsMyTurn()
  const isAnimating = useIsAnimating()

  const playerProgress = useMemo(
    () => computePlayerProgress(players),
    [players]
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Turn indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Current Turn
        </div>
        {currentPlayer ? (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full ${getColorClass(currentPlayer.color)} shadow-md`}
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {currentPlayer.name}
              </p>
              {isMyTurn && (
                <p className="text-sm text-accent font-medium">
                  {isAnimating ? 'Playing...' : "It's your turn!"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Waiting...</p>
        )}
      </div>

      {/* Player progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Player Progress
        </div>
        <div className="space-y-3">
          {playerProgress.map((player) => (
            <div key={player.playerId} className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${getColorClass(player.color)}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {player.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {player.heavenCount}/{player.totalTokens}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getColorClass(player.color)} transition-all duration-300`}
                    style={{ width: `${player.progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
