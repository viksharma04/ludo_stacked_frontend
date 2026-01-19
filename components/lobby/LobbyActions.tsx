'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateRoom } from '@/hooks/useCreateRoom'
import { CreateRoomOptionsModal } from '@/components/lobby/CreateRoomOptionsModal'

export function LobbyActions() {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)

  const {
    createRoom,
    isCreating,
    error,
    room,
    clearError,
    isConnected,
    connectionStatus,
  } = useCreateRoom()

  useEffect(() => {
    if (error) {
      console.log('[LobbyActions] Error received:', error)
      // Use queueMicrotask to avoid synchronous setState warning
      queueMicrotask(() => {
        setToast(error)
        clearError()
        setTimeout(() => setToast(null), 3000)
      })
    }
  }, [error, clearError])

  useEffect(() => {
    if (room) {
      // Use queueMicrotask to avoid synchronous setState warning
      queueMicrotask(() => {
        setShowOptionsModal(false)
        router.push(`/room/${room.code}`)
      })
    }
  }, [room, router])

  const showComingSoon = (action: string) => {
    setToast(`${action} - Coming soon!`)
    setTimeout(() => setToast(null), 2000)
  }

  const handleCreateRoomClick = () => {
    console.log('[LobbyActions] Create room clicked, isConnected:', isConnected, 'status:', connectionStatus)
    if (!isConnected) {
      setToast('Not connected to server')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setShowOptionsModal(true)
  }

  const handleConfirmCreate = async (maxPlayers: number) => {
    await createRoom(maxPlayers)
  }

  const handleCloseOptionsModal = () => {
    if (!isCreating) {
      setShowOptionsModal(false)
    }
  }

  const isButtonDisabled = connectionStatus !== 'connected'

  return (
    <>
      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
          {connectionStatus === 'connecting' && 'Connecting to server...'}
          {connectionStatus === 'disconnected' && 'Disconnected from server'}
          {connectionStatus === 'error' && 'Connection error - attempting to reconnect...'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <button
          onClick={handleCreateRoomClick}
          disabled={isButtonDisabled}
          className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-accent dark:hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:shadow-none"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors group-disabled:group-hover:bg-accent/10">
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
              className="w-5 h-5 text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all group-disabled:group-hover:text-gray-400 group-disabled:group-hover:translate-x-0"
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

      {/* Modal */}
      <CreateRoomOptionsModal
        isOpen={showOptionsModal}
        onClose={handleCloseOptionsModal}
        onConfirm={handleConfirmCreate}
        isLoading={isCreating}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </>
  )
}
