'use client'

import { useState, useEffect } from 'react'

interface CreateRoomOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (maxPlayers: number) => void
  isLoading: boolean
}

const PLAYER_OPTIONS = [2, 3, 4] as const

export function CreateRoomOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CreateRoomOptionsModalProps) {
  const [maxPlayers, setMaxPlayers] = useState<number>(4)

  useEffect(() => {
    if (isOpen) {
      setMaxPlayers(4)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  const handleConfirm = () => {
    onConfirm(maxPlayers)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-options-title"
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
      >
        <h2
          id="create-room-options-title"
          className="text-xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Create Room
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Number of Players
          </label>
          <div className="flex gap-2">
            {PLAYER_OPTIONS.map((count) => (
              <button
                key={count}
                onClick={() => setMaxPlayers(count)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  maxPlayers === count
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Select how many players can join this room
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
