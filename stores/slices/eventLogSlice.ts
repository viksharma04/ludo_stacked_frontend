import type { StateCreator } from 'zustand'
import type { GameLogEntry } from '@/types/game'
import type { GameStore } from '../gameStore'

const MAX_LOG_ENTRIES = 50

export interface EventLogSlice {
  // State
  logEntries: GameLogEntry[]

  // Actions
  addLogEntry: (entry: GameLogEntry) => void
  clearLog: () => void
}

const initialEventLogState = {
  logEntries: [] as GameLogEntry[],
}

export const createEventLogSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  EventLogSlice
> = (set) => ({
  ...initialEventLogState,

  addLogEntry: (entry) =>
    set(
      (state) => {
        state.logEntries.push(entry)
        // Trim if over limit (keep most recent)
        if (state.logEntries.length > MAX_LOG_ENTRIES) {
          state.logEntries = state.logEntries.slice(-MAX_LOG_ENTRIES)
        }
      },
      false,
      'addLogEntry'
    ),

  clearLog: () =>
    set(
      (state) => {
        state.logEntries = []
      },
      false,
      'clearLog'
    ),
})
