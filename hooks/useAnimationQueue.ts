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

// Build composite key for animating token tracking: `${playerId}:${stackId}`
function makeCompositeKey(playerId: string, stackId: string): string {
  return `${playerId}:${stackId}`
}

// Extract composite keys (playerId:stackId) that were animated from an event (for cleanup)
function getAnimatedStackIds(event: GameEvent): string[] {
  switch (event.event_type) {
    case 'stack_moved': {
      const e = event as { player_id: string; stack_id: string }
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_exited_hell': {
      const e = event as { player_id: string; stack_id: string }
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_reached_heaven': {
      const e = event as { player_id: string; stack_id: string }
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_captured': {
      const e = event as { capturing_player_id: string; capturing_stack_id: string; captured_player_id: string; captured_stack_id: string }
      return [
        makeCompositeKey(e.capturing_player_id, e.capturing_stack_id),
        makeCompositeKey(e.captured_player_id, e.captured_stack_id),
      ]
    }
    case 'stack_update': {
      const e = event as { player_id: string; add_stacks?: { stack_id: string }[]; remove_stacks?: { stack_id: string }[] }
      const ids: string[] = []
      if (e.add_stacks) ids.push(...e.add_stacks.map(s => makeCompositeKey(e.player_id, s.stack_id)))
      if (e.remove_stacks) ids.push(...e.remove_stacks.map(s => makeCompositeKey(e.player_id, s.stack_id)))
      return ids
    }
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

      // Get stack IDs that will be animated (for cleanup after)
      const stackIds = getAnimatedStackIds(item.event)

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
        // Remove stack IDs from animating set after animation completes
        if (stackIds.length > 0) {
          useGameStore.getState().removeAnimatingTokens(stackIds)
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
