'use client'

import { useState, useEffect, useRef } from 'react'
import type { JoinRoomError } from '@/hooks/useJoinRoom'

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoin: (code: string) => Promise<void>
  isLoading: boolean
  error: JoinRoomError | null
}

export function JoinRoomModal({
  isOpen,
  onClose,
  onJoin,
  isLoading,
  error,
}: JoinRoomModalProps) {
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setCode('')
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters, convert to uppercase
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Limit to 6 characters
    setCode(value.slice(0, 6))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 6 && !isLoading) {
      await onJoin(code)
    }
  }

  const isValid = code.length === 6

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

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="room-code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              Room Code
            </label>
            <input
              ref={inputRef}
              id="room-code"
              type="text"
              value={code}
              onChange={handleInputChange}
              placeholder="ABCDEF"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isLoading}
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the 6-character room code shared with you
            </p>

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error.message}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={!isValid || isLoading}
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
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
