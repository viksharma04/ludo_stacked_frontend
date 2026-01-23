'use client'

import type { SeatSnapshot } from '@/types/room'

interface SeatCardProps {
  seat: SeatSnapshot | null
  seatIndex: number
  isCurrentUser: boolean
}

export function SeatCard({ seat, seatIndex, isCurrentUser }: SeatCardProps) {
  const isEmpty = !seat || !seat.user_id
  const isReady = seat?.ready === 'ready'
  const isConnected = seat?.connected ?? false
  const isHost = seat?.is_host ?? false

  if (isEmpty) {
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 min-h-[120px] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Waiting for player...
        </span>
      </div>
    )
  }

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-colors min-h-[120px] ${
        isCurrentUser
          ? 'border-accent bg-accent/5 dark:bg-accent/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          {/* Host badge */}
          {isHost && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1c.072 0 .144.01.212.03l6.5 2A1 1 0 0 1 17.5 4v11.5a1 1 0 0 1-.788.978l-6.5 2a1 1 0 0 1-.424 0l-6.5-2A1 1 0 0 1 2.5 15.5V4a1 1 0 0 1 .788-.97l6.5-2A1 1 0 0 1 10 1Z"
                  clipRule="evenodd"
                />
              </svg>
              Host
            </span>
          )}
        </div>
        {/* Ready status */}
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isReady
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {isReady ? 'Ready' : 'Not Ready'}
        </span>
      </div>

      {/* Player info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-lg font-semibold text-accent">
            {(seat.display_name || 'P')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${
            isCurrentUser
              ? 'text-accent'
              : 'text-gray-900 dark:text-white'
          }`}>
            {seat.display_name || `Player ${seatIndex + 1}`}
            {isCurrentUser && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                (you)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
