'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PixiApp } from '@/lib/pixi/PixiApp'
import { AnimationController } from '@/lib/pixi/AnimationController'
import { useGameStore } from '@/stores/gameStore'
import type { BoardSetup, Player } from '@/types/game'

interface UsePixiAppOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  onTokenClick?: (tokenId: string) => void
}

interface UsePixiAppReturn {
  pixiApp: PixiApp | null
  animationController: AnimationController | null
  isInitialized: boolean
  error: Error | null
}

export function usePixiApp({
  containerRef,
  onTokenClick,
}: UsePixiAppOptions): UsePixiAppReturn {
  const [pixiApp, setPixiApp] = useState<PixiApp | null>(null)
  const [animationController, setAnimationController] =
    useState<AnimationController | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const onTokenClickRef = useRef(onTokenClick)

  // Keep callback ref up to date
  useEffect(() => {
    onTokenClickRef.current = onTokenClick
  }, [onTokenClick])

  // Initialize Pixi app
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: PixiApp | null = null
    let isCancelled = false

    const init = async () => {
      try {
        app = new PixiApp(container)
        await app.init()

        if (isCancelled) {
          app.destroy()
          return
        }

        // Set up token click handler
        app.setTokenClickHandler((tokenId) => {
          if (onTokenClickRef.current) {
            onTokenClickRef.current(tokenId)
          }
        })

        // Create animation controller
        const controller = new AnimationController(app)

        // Initialize board if we already have setup data
        const state = useGameStore.getState()
        if (state.boardSetup && state.players.length > 0) {
          app.initializeBoard(state.boardSetup, state.players)
        }

        setPixiApp(app)
        setAnimationController(controller)
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize Pixi app:', err)
        setError(err instanceof Error ? err : new Error('Failed to initialize'))
      }
    }

    init()

    return () => {
      isCancelled = true
      if (app) {
        app.destroy()
      }
      setPixiApp(null)
      setAnimationController(null)
      setIsInitialized(false)
    }
  }, [containerRef])

  return {
    pixiApp,
    animationController,
    isInitialized,
    error,
  }
}
