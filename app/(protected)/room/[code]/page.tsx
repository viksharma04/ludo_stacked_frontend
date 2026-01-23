'use client'

import { use, useState } from 'react'
import { RoomProvider, useRoom } from '@/contexts/RoomContext'
import { SeatCard } from '@/components/room/SeatCard'

interface RoomPageProps {
  params: Promise<{ code: string }>
}

function RoomContent() {
  const {
    room,
    isConnected,
    isConnecting,
    connectionError,
    userId,
    isHost,
    isReady,
    canStartGame,
    toggleReady,
    leaveRoom,
  } = useRoom()

  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API might not be available
    }
  }

  const handleStartGame = () => {
    // Start game functionality will be implemented later
  }

  // Loading state
  if (isConnecting && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Connecting to room...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (connectionError && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-red-600 dark:text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {connectionError}
          </p>
          <a
            href="/lobby"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  // No room data yet
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading room...</p>
        </div>
      </div>
    )
  }

  // Build seats array padded to max_players
  const paddedSeats = Array.from({ length: room.max_players }, (_, index) => {
    return room.seats.find((s) => s.seat_index === index) || null
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Game Room
            </h1>
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Room code */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Room Code
              </p>
              <p className="text-2xl font-mono font-bold tracking-wider text-gray-900 dark:text-white">
                {room.code}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="btn p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy room code"
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-green-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              ) : (
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
              )}
            </button>
          </div>
        </div>

        {/* Seats grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Players ({room.seats.filter((s) => s.user_id).length}/{room.max_players})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paddedSeats.map((seat, index) => (
              <SeatCard
                key={index}
                seat={seat}
                seatIndex={index}
                isCurrentUser={seat?.user_id === userId}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={toggleReady}
            className={`btn flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              isReady
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isReady ? 'Cancel Ready' : 'Ready Up'}
          </button>

          <button
            onClick={leaveRoom}
            className="btn flex-1 px-4 py-3 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Leave Room
          </button>
        </div>

        {/* Start Game button (host only) */}
        {isHost && (
          <div className="mt-6">
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="btn w-full px-4 py-4 rounded-lg font-semibold text-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canStartGame ? 'Start Game' : 'Waiting for players to ready up...'}
            </button>
            {!canStartGame && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                All players must be ready to start the game
              </p>
            )}
          </div>
        )}

        {/* Room info (status indicator when not in connection error) */}
        {!isConnected && !connectionError && (
          <div className="mt-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Reconnecting to room...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RoomPage({ params }: RoomPageProps) {
  const { code } = use(params)

  return (
    <RoomProvider roomCode={code}>
      <RoomContent />
    </RoomProvider>
  )
}
