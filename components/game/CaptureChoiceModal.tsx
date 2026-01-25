'use client'

import { useShowCaptureChoiceModal, useCaptureOptions } from '@/stores/selectors'
import { useGameStore } from '@/stores/gameStore'

interface CaptureChoiceModalProps {
  onSelectChoice: (choice: 'stack' | 'capture' | string) => void
}

export function CaptureChoiceModal({ onSelectChoice }: CaptureChoiceModalProps) {
  const showModal = useShowCaptureChoiceModal()
  const captureOptions = useCaptureOptions()

  const handleClose = () => {
    useGameStore.getState().setShowCaptureChoiceModal(false)
  }

  if (!showModal) return null

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
          Choose Your Action
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You landed on a square with other tokens. What would you like to do?
        </p>

        {/* Options */}
        <div className="space-y-3">
          {captureOptions.map((option) => {
            const getIcon = () => {
              switch (option.type) {
                case 'stack':
                  return (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
                      />
                    </svg>
                  )
                case 'capture':
                  return (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  )
                default:
                  return (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  )
              }
            }

            const getDescription = () => {
              switch (option.type) {
                case 'stack':
                  return 'Join with your own token to form a stack. Stacks are harder to capture!'
                case 'capture':
                  return 'Send the enemy token back to their home. You get a bonus roll!'
                default:
                  return 'Select this target'
              }
            }

            const getButtonStyle = () => {
              switch (option.type) {
                case 'stack':
                  return 'border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                case 'capture':
                  return 'border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                default:
                  return 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            }

            const getIconColor = () => {
              switch (option.type) {
                case 'stack':
                  return 'text-blue-500'
                case 'capture':
                  return 'text-red-500'
                default:
                  return 'text-gray-500'
              }
            }

            return (
              <button
                key={option.id}
                onClick={() => onSelectChoice(option.id)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-colors ${getButtonStyle()}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getIconColor()}`}>{getIcon()}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getDescription()}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
