'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { ProfileDropdown } from '@/components/lobby/ProfileDropdown'
import { LobbyActions } from '@/components/lobby/LobbyActions'
import Link from 'next/link'

export default function LobbyPage() {
  const { user, isLoading } = useAuth()
  const { profile } = useProfile()

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
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Home"
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
                  d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </Link>
            <ProfileDropdown />
          </div>
        </div>

        {/* Welcome message */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, <span className="text-gray-900 dark:text-white font-medium">{profile?.display_name || user?.email}</span>
          </p>
        </div>

        {/* Actions */}
        <LobbyActions />
      </div>
    </div>
  )
}
