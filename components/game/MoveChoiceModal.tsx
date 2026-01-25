'use client'

import {
  useShowMoveChoiceModal,
  useLegalMoves,
  useRollsToAllocate,
} from '@/stores/selectors'
import { useGameStore } from '@/stores/gameStore'

interface MoveChoiceModalProps {
  onSelectMove: (tokenId: string) => void
}

export function MoveChoiceModal({ onSelectMove }: MoveChoiceModalProps) {
  const showModal = useShowMoveChoiceModal()
  const legalMoves = useLegalMoves()
  const rollsToAllocate = useRollsToAllocate()

  const handleClose = () => {
    useGameStore.getState().setShowMoveChoiceModal(false)
  }

  if (!showModal) return null

  const currentRoll = rollsToAllocate[0]

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
          Select a Token to Move
        </h3>

        {currentRoll && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Roll: <span className="font-bold text-accent">{currentRoll}</span>
          </p>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tap a highlighted token on the board to move it, or choose from the
          list below:
        </p>

        {/* Token list */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {legalMoves.map((moveId) => {
            // Parse token ID to show meaningful name
            const isStack = moveId.includes('stack')
            const displayName = isStack
              ? `Stack ${moveId.split('_').pop()}`
              : `Token ${moveId.split('_').pop()}`

            return (
              <button
                key={moveId}
                onClick={() => onSelectMove(moveId)}
                className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {displayName}
                </span>
              </button>
            )
          })}
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
