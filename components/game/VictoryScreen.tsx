'use client'

import { useShowVictoryScreen, useWinnerId, useFinalRankings, usePlayers, useMyPlayerId } from '@/stores/selectors'
import { useGameStore } from '@/stores/gameStore'
import { PLAYER_COLORS, type PlayerColor } from '@/types/game'

interface VictoryScreenProps {
  onPlayAgain?: () => void
  onReturnToLobby?: () => void
}

function getColorClass(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
  }
  return colorMap[color] || 'bg-gray-500'
}

export function VictoryScreen({ onPlayAgain, onReturnToLobby }: VictoryScreenProps) {
  const showVictoryScreen = useShowVictoryScreen()
  const winnerId = useWinnerId()
  const finalRankings = useFinalRankings()
  const players = usePlayers()
  const myPlayerId = useMyPlayerId()

  if (!showVictoryScreen) return null

  const winner = players.find((p) => p.player_id === winnerId)
  const isWinner = winnerId === myPlayerId

  const rankedPlayers = finalRankings.map((playerId, index) => {
    const player = players.find((p) => p.player_id === playerId)
    return {
      player,
      rank: index + 1,
    }
  })

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 p-8 shadow-2xl text-center">
        {/* Trophy icon */}
        <div className="text-6xl mb-4">🏆</div>

        {/* Winner announcement */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isWinner ? 'You Won!' : 'Game Over'}
        </h2>

        {winner && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`w-6 h-6 rounded-full ${getColorClass(winner.color)}`}
            />
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {winner.name} wins!
            </span>
          </div>
        )}

        {/* Rankings */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Final Rankings
          </h3>
          <div className="space-y-2">
            {rankedPlayers.map(({ player, rank }) => {
              if (!player) return null
              const isMe = player.player_id === myPlayerId

              return (
                <div
                  key={player.player_id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isMe ? 'bg-accent/10' : ''
                  }`}
                >
                  <span className="text-xl w-8">{getRankEmoji(rank)}</span>
                  <div
                    className={`w-5 h-5 rounded-full ${getColorClass(player.color)}`}
                  />
                  <span
                    className={`font-medium ${
                      isMe
                        ? 'text-accent'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {player.name}
                    {isMe && ' (You)'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="flex-1 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
            >
              Play Again
            </button>
          )}
          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors"
            >
              Return to Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
