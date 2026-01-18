'use client'

import { useState, useEffect, useRef } from 'react'
import { useProfile } from '@/contexts/ProfileContext'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { profile, updateDisplayName } = useProfile()
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile?.display_name || '')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, profile?.display_name])

  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    const { error: updateError } = await updateDisplayName(displayName.trim())

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Edit Profile
        </h2>

        <div className="mb-4">
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Display Name
          </label>
          <input
            ref={inputRef}
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your display name"
            disabled={isLoading}
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
