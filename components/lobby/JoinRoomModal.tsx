'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createApiClient } from '@/lib/api/client'
import type { JoinRoomRequest, JoinRoomResponse } from '@/types/room'

const CODE_LENGTH = 6
const CODE_PATTERN = /^[A-Z0-9]{6}$/

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter()
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isValidCode = CODE_PATTERN.test(code)

  useEffect(() => {
    if (isOpen) {
      setCode('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 0)
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

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase and filter to A-Z0-9 only
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH)
    setCode(value)
    setError(null)
  }

  const handleJoin = async () => {
    if (!session?.access_token) {
      setError('You must be signed in to join a room')
      return
    }

    if (!isValidCode) {
      setError('Please enter a valid 6-character room code')
      return
    }

    setIsLoading(true)
    setError(null)

    const client = createApiClient({ accessToken: session.access_token })
    const body: JoinRoomRequest = { code }
    const { data, error: apiError } = await client.post<JoinRoomResponse>(
      '/api/v1/rooms/join',
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
        aria-labelledby="join-room-title"
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
      >
        <h2
          id="join-room-title"
          className="text-xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Join Room
        </h2>

        <div className="mb-4">
          <label
            htmlFor="roomCode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Room Code
          </label>
          <input
            ref={inputRef}
            id="roomCode"
            type="text"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValidCode && !isLoading) {
                handleJoin()
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent text-center text-2xl tracking-widest uppercase"
            placeholder="ABC123"
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {code.length}/{CODE_LENGTH}
          </p>
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
            onClick={handleJoin}
            className="btn px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
            disabled={isLoading || !isValidCode}
          >
            {isLoading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
