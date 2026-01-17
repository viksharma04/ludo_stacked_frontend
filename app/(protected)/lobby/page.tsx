'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ProfileDropdown } from '@/components/lobby/ProfileDropdown'
import { LobbyActions } from '@/components/lobby/LobbyActions'

export default function LobbyPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lobby
          </h1>
          <ProfileDropdown />
        </div>

        {/* Welcome message */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, <span className="text-gray-900 dark:text-white font-medium">{user?.email}</span>
          </p>
        </div>

        {/* Actions */}
        <LobbyActions />
      </div>
    </div>
  )
}
