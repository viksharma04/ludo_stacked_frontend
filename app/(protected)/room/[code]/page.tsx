'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWebSocket } from '@/contexts/WebSocketContext'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { currentRoom, status, joinRoom } = useWebSocket()
  const roomCode = (params.code as string).toUpperCase()
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const joinAttemptedRef = useRef(false)

  // Auto-join room when navigating directly to URL
  useEffect(() => {
    async function attemptAutoJoin() {
      // Only attempt if we're connected, have no room, and haven't tried yet
      if (status !== 'connected' || currentRoom || joinAttemptedRef.current) {
        return
      }

      joinAttemptedRef.current = true
      setIsJoining(true)
      setJoinError(null)

      try {
        // Join the room via WebSocket using the room code directly
        await joinRoom(roomCode)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to join room'
        setJoinError(errorMessage)
      } finally {
        setIsJoining(false)
      }
    }

    attemptAutoJoin()
  }, [status, currentRoom, roomCode, joinRoom])

  // Show loading state while connecting
  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Connecting...</div>
      </div>
    )
  }

  // If disconnected, show reconnecting message
  if (status === 'disconnected' || status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 mb-4">
            {status === 'error' ? 'Connection error' : 'Disconnected from server'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Attempting to reconnect...
          </div>
        </div>
      </div>
    )
  }

  // Show join error with option to go back
  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{joinError}</div>
          <button
            onClick={() => router.push('/lobby')}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  // Show loading while joining
  if (isJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Joining room...</div>
      </div>
    )
  }

  // If no room data yet, show loading
  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading room...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Room Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Game Room
            </h1>
            {currentRoom.is_host && (
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
                Host
              </span>
            )}
          </div>

          {/* Room Code Display */}
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Room Code
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-wider text-gray-900 dark:text-white">
                {roomCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCode)
                }}
                className="p-2 text-gray-500 hover:text-accent transition-colors"
                title="Copy room code"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                  />
                </svg>
              </button>
              <span
                className="sr-only"
                aria-live="polite"
              >
                Room code copied to clipboard.
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Share this code with friends to invite them to your game
            </p>
          </div>
        </div>

        {/* Players Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Players
          </h2>
          <div className="space-y-3">
            {currentRoom.seats.map((seat) => {
              const isCurrentPlayer = seat.seat_index === currentRoom.seat_index
              const hasPlayer = seat.player !== null

              if (hasPlayer) {
                return (
                  <div
                    key={seat.seat_index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCurrentPlayer
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      {seat.player?.avatar_url ? (
                        <img
                          src={seat.player.avatar_url}
                          alt={seat.player.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-accent font-medium">
                          {seat.seat_index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {seat.player?.display_name}
                        {isCurrentPlayer && (
                          <span className="text-xs text-accent">(You)</span>
                        )}
                        {seat.is_host && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Seat {seat.seat_index + 1}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        seat.is_ready
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {seat.is_ready ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                )
              }

              // Empty seat
              return (
                <div
                  key={seat.seat_index}
                  className="flex items-center gap-3 p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">
                      {seat.seat_index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-400 dark:text-gray-500">
                      Waiting for player...
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Game Settings Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Game Settings
          </h2>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Game settings will be displayed here once implemented.
          </div>
        </div>

        {/* Action Buttons */}
        {/* TODO: Make the Leave Room button functional */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              router.push('/lobby')
            }}
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Leave Room
          </button>
          {currentRoom.is_host && (
            <button
              disabled
              className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              Start Game (Coming Soon)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
