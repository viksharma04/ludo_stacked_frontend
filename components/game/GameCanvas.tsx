'use client'

import { useRef, useEffect } from 'react'
import { usePixiApp } from '@/hooks/usePixiApp'
import { useAnimationQueue } from '@/hooks/useAnimationQueue'
import type { AnimationController } from '@/lib/pixi/AnimationController'
import type { PixiApp } from '@/lib/pixi/PixiApp'

interface GameCanvasProps {
  onTokenClick?: (tokenId: string) => void
  onInitialized?: (pixiApp: PixiApp, animationController: AnimationController) => void
  className?: string
}

export function GameCanvas({
  onTokenClick,
  onInitialized,
  className = '',
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { pixiApp, animationController, isInitialized, error } = usePixiApp({
    containerRef,
    onTokenClick,
  })

  // Set up animation queue processing
  const { skipAll, setFastForward } = useAnimationQueue({
    animationController,
  })

  // Notify parent when initialized
  useEffect(() => {
    if (isInitialized && pixiApp && animationController && onInitialized) {
      onInitialized(pixiApp, animationController)
    }
  }, [isInitialized, pixiApp, animationController, onInitialized])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center p-4">
          <p className="text-red-500 dark:text-red-400 mb-2">
            Failed to initialize game board
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ touchAction: 'none' }} // Prevent default touch actions for better mobile experience
    >
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading game board...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
