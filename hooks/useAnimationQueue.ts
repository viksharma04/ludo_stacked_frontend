'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { AnimationController } from '@/lib/pixi/AnimationController'
import type { AnimationQueueItem } from '@/types/game'

interface UseAnimationQueueOptions {
  animationController: AnimationController | null
  onAnimationComplete?: (item: AnimationQueueItem) => void
}

export function useAnimationQueue({
  animationController,
  onAnimationComplete,
}: UseAnimationQueueOptions) {
  const isProcessingRef = useRef(false)
  const onCompleteRef = useRef(onAnimationComplete)

  // Keep callback ref up to date
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete
  }, [onAnimationComplete])

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !animationController) return

    const store = useGameStore.getState()
    if (store.animationQueue.length === 0) {
      store.setIsAnimating(false)
      return
    }

    isProcessingRef.current = true
    store.setIsAnimating(true)

    while (true) {
      const item = store.dequeueAnimation()
      if (!item) break

      try {
        // Play the animation
        await animationController.playEventAnimation(item.event)

        // Update last processed seq
        if (item.event.seq !== undefined) {
          store.setLastProcessedSeq(item.event.seq)
        }

        // Call completion callback
        if (onCompleteRef.current) {
          onCompleteRef.current(item)
        }
      } catch (error) {
        console.error('Animation error:', error)
        // Continue with next animation even if one fails
      }

      // Check if we should continue
      const currentStore = useGameStore.getState()
      if (currentStore.animationQueue.length === 0) break
    }

    isProcessingRef.current = false
    useGameStore.getState().setIsAnimating(false)
  }, [animationController])

  // Subscribe to animation queue changes
  useEffect(() => {
    if (!animationController) return

    const unsub = useGameStore.subscribe(
      (state) => state.animationQueue.length,
      (length) => {
        if (length > 0 && !isProcessingRef.current) {
          processQueue()
        }
      }
    )

    return unsub
  }, [animationController, processQueue])

  // Return controls
  return {
    skipAll: useCallback(() => {
      useGameStore.getState().skipToEnd()
    }, []),

    setFastForward: useCallback(
      (enabled: boolean) => {
        if (animationController) {
          animationController.setFastForward(enabled)
        }
        useGameStore.getState().setIsFastForwarding(enabled)
      },
      [animationController]
    ),
  }
}
