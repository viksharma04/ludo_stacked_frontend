'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createApiClient } from '@/lib/api/client'
import type { CreateRoomRequest, CreateRoomResponse } from '@/types/room'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter()
  const { session } = useAuth()
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPlayerCount(4)
      setError(null)
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
  }, [isOpen, onClose, isLoading])

  const handleCreate = async () => {
    if (!session?.access_token) {
      setError('You must be signed in to create a room')
      return
    }

    setIsLoading(true)
    setError(null)

    const client = createApiClient({ accessToken: session.access_token })
    const body: CreateRoomRequest = { n_players: playerCount }
    const { data, error: apiError } = await client.post<CreateRoomResponse>(
      '/api/v1/rooms',
      body
    )

    if (apiError) {
      setError(apiError.message)
      setIsLoading(false)
      return
    }

    if (data) {
      router.push(`/room/${data.code}`)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
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
        aria-labelledby="create-room-title"
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
      >
        <h2
          id="create-room-title"
          className="text-xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Create Room
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Number of Players
          </label>
          <div className="flex gap-3">
            {([2, 3, 4] as const).map((count) => (
              <label
                key={count}
                className={`flex-1 cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="playerCount"
                  value={count}
                  checked={playerCount === count}
                  onChange={() => setPlayerCount(count)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div
                  className={`py-3 px-4 rounded-lg border-2 text-center transition-all ${
                    playerCount === count
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-lg font-semibold">{count}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
