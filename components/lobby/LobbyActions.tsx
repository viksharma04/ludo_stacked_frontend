'use client'

import { useState } from 'react'

export function LobbyActions() {
  const [toast, setToast] = useState<string | null>(null)

  const showComingSoon = (action: string) => {
    setToast(`${action} - Coming soon!`)
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <button
          onClick={() => showComingSoon('Create Room')}
          className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-accent dark:hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all text-left group cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-accent"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Create Room
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Start a new game room and invite your friends to play.
          </p>
        </button>

        {/* Join Room Card */}
        <button
          onClick={() => showComingSoon('Join Room')}
          className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-accent dark:hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all text-left group cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-accent"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Join Room
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Enter a room code to join an existing game.
          </p>
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </>
  )
}
