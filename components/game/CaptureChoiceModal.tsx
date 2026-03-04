'use client'

import { useShowCaptureChoiceModal, useCaptureOptions } from '@/stores/selectors'
import { useGameStore } from '@/stores/gameStore'
import { PLAYER_COLORS } from '@/types/game'

interface CaptureChoiceModalProps {
  onSelectChoice: (target: string) => void
}

export function CaptureChoiceModal({ onSelectChoice }: CaptureChoiceModalProps) {
  const showModal = useShowCaptureChoiceModal()
  const captureOptions = useCaptureOptions()

  const handleClose = () => {
    useGameStore.getState().setShowCaptureChoiceModal(false)
  }

  if (!showModal || captureOptions.length === 0) return null

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
          Choose a Target to Capture
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select which opponent stack to send back to hell:
        </p>

        {/* Capture targets */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {captureOptions.map((option) => {
            const colorName = option.playerColor.charAt(0).toUpperCase() + option.playerColor.slice(1)
            return (
              <button
                key={option.target}
                onClick={() => onSelectChoice(option.target)}
                className="w-full px-4 py-3 text-left rounded-lg border-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: `#${PLAYER_COLORS[option.playerColor].primary.toString(16).padStart(6, '0')}` }}
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {colorName} stack
                    </span>
                    {option.stackHeight > 1 && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        (height {option.stackHeight})
                      </span>
                    )}
                  </div>
                </div>
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
