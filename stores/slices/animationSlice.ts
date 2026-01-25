import type { StateCreator } from 'zustand'
import type { AnimationQueueItem, GameEvent } from '@/types/game'
import type { GameStore } from '../gameStore'

export interface AnimationSlice {
  // State
  animationQueue: AnimationQueueItem[]
  isAnimating: boolean
  isFastForwarding: boolean
  lastProcessedSeq: number
  currentAnimation: AnimationQueueItem | null

  // Actions
  enqueueAnimation: (item: AnimationQueueItem) => void
  enqueueAnimations: (items: AnimationQueueItem[]) => void
  dequeueAnimation: () => AnimationQueueItem | null
  setIsAnimating: (isAnimating: boolean) => void
  setIsFastForwarding: (isFastForwarding: boolean) => void
  setLastProcessedSeq: (seq: number) => void
  setCurrentAnimation: (animation: AnimationQueueItem | null) => void
  clearAnimationQueue: () => void
  skipToEnd: () => void
}

const initialAnimationState = {
  animationQueue: [] as AnimationQueueItem[],
  isAnimating: false,
  isFastForwarding: false,
  lastProcessedSeq: -1,
  currentAnimation: null,
}

export const createAnimationSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  AnimationSlice
> = (set, get) => ({
  ...initialAnimationState,

  enqueueAnimation: (item) =>
    set(
      (state) => {
        state.animationQueue.push(item)
      },
      false,
      'enqueueAnimation'
    ),

  enqueueAnimations: (items) =>
    set(
      (state) => {
        state.animationQueue.push(...items)
      },
      false,
      'enqueueAnimations'
    ),

  dequeueAnimation: () => {
    const state = get()
    if (state.animationQueue.length === 0) {
      return null
    }

    const item = state.animationQueue[0]
    set(
      (s) => {
        s.animationQueue.shift()
        s.currentAnimation = item
      },
      false,
      'dequeueAnimation'
    )
    return item
  },

  setIsAnimating: (isAnimating) =>
    set(
      (state) => {
        state.isAnimating = isAnimating
      },
      false,
      'setIsAnimating'
    ),

  setIsFastForwarding: (isFastForwarding) =>
    set(
      (state) => {
        state.isFastForwarding = isFastForwarding
      },
      false,
      'setIsFastForwarding'
    ),

  setLastProcessedSeq: (seq) =>
    set(
      (state) => {
        state.lastProcessedSeq = seq
      },
      false,
      'setLastProcessedSeq'
    ),

  setCurrentAnimation: (animation) =>
    set(
      (state) => {
        state.currentAnimation = animation
      },
      false,
      'setCurrentAnimation'
    ),

  clearAnimationQueue: () =>
    set(
      (state) => {
        state.animationQueue = []
        state.currentAnimation = null
        state.isAnimating = false
      },
      false,
      'clearAnimationQueue'
    ),

  skipToEnd: () =>
    set(
      (state) => {
        // Process remaining events in queue without animation
        state.animationQueue.forEach((item) => {
          state.lastProcessedSeq = Math.max(
            state.lastProcessedSeq,
            (item.event as GameEvent).seq ?? state.lastProcessedSeq
          )
        })
        state.animationQueue = []
        state.currentAnimation = null
        state.isAnimating = false
        state.isFastForwarding = false
      },
      false,
      'skipToEnd'
    ),
})
