import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createBoardSlice, type BoardSlice } from './slices/boardSlice'
import { createTurnSlice, type TurnSlice } from './slices/turnSlice'
import { createAnimationSlice, type AnimationSlice } from './slices/animationSlice'
import { createUiSlice, type UiSlice } from './slices/uiSlice'
import { createEventLogSlice, type EventLogSlice } from './slices/eventLogSlice'

// Combined store type
export type GameStore = BoardSlice & TurnSlice & AnimationSlice & UiSlice & EventLogSlice

// Create the combined store with all middleware
export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector(
      immer((...args) => ({
        ...createBoardSlice(...args),
        ...createTurnSlice(...args),
        ...createAnimationSlice(...args),
        ...createUiSlice(...args),
        ...createEventLogSlice(...args),
      }))
    ),
    {
      name: 'GameStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Reset all game state
export function resetGameStore() {
  const store = useGameStore.getState()
  store.resetBoard()
  store.resetTurn()
  store.clearAnimationQueue()
  store.resetUi()
  store.clearLog()
}

// Export store type for external use
export type { BoardSlice, TurnSlice, AnimationSlice, UiSlice, EventLogSlice }
