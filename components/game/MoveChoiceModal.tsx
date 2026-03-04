'use client'

import {
  useShowMoveChoiceModal,
  useAvailableMoves,
  useSelectedStackId,
} from '@/stores/selectors'
import { useGameStore } from '@/stores/gameStore'
import { getRollsForStack } from '@/lib/game/legalMoveParser'

interface MoveChoiceModalProps {
  onSelectMove: (stackId: string, rollValue: number) => void
}

export function MoveChoiceModal({ onSelectMove }: MoveChoiceModalProps) {
  const showModal = useShowMoveChoiceModal()
  const availableMoves = useAvailableMoves()
  const selectedStackId = useSelectedStackId()

  const handleClose = () => {
    const store = useGameStore.getState()
    store.setShowMoveChoiceModal(false)
    store.setSelectedStackId(null)
  }

  if (!showModal || !selectedStackId) return null

  const rolls = getRollsForStack(selectedStackId, availableMoves)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Choose a Roll to Use
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Multiple rolls available. Select which roll to use for this move:
        </p>

        {/* Roll options */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {rolls.map((roll) => (
            <button
              key={roll}
              onClick={() => {
                onSelectMove(selectedStackId, roll)
                handleClose()
              }}
              className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                Move {roll} space{roll !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="mt-4 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
