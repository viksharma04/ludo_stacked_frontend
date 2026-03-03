'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { AnimationController } from '@/lib/pixi/AnimationController'
import type { AnimationQueueItem, GameEvent } from '@/types/game'
import { ANIMATION_DURATIONS } from '@/lib/game/constants'

interface UseAnimationQueueOptions {
  animationController: AnimationController | null
  onAnimationComplete?: (item: AnimationQueueItem) => void
}

// Helper to create a delay promise
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Extract token IDs that were animated from an event (for cleanup)
function getAnimatedTokenIds(event: GameEvent): string[] {
  switch (event.event_type) {
    case 'token_moved':
      return [(event as { token_id: string }).token_id]
    case 'token_exited_hell':
      return [(event as { token_id: string }).token_id]
    case 'token_reached_heaven':
      return [(event as { token_id: string }).token_id]
    case 'token_captured':
      return [
        (event as { capturing_token_id: string }).capturing_token_id,
        (event as { captured_token_id: string }).captured_token_id,
      ]
    case 'stack_formed':
    case 'stack_dissolved':
    case 'stack_moved':
      return (event as { token_ids: string[] }).token_ids
    default:
      return []
  }
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

      // Get token IDs that will be animated (for cleanup after)
      const tokenIds = getAnimatedTokenIds(item.event)

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

        // Add buffer delay between animations to prevent visual overlap
        // Skip buffer if fast forwarding or if queue is empty
        const currentStore = useGameStore.getState()
        if (currentStore.animationQueue.length > 0 && !currentStore.isFastForwarding) {
          await delay(ANIMATION_DURATIONS.ANIMATION_BUFFER)
        }
      } catch (error) {
        console.error('Animation error:', error)
        // Continue with next animation even if one fails
      } finally {
        // Remove token IDs from animating set after animation completes
        if (tokenIds.length > 0) {
          useGameStore.getState().removeAnimatingTokens(tokenIds)
        }
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
