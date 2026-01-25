import type { StateCreator } from 'zustand'
import type { CurrentEventType, Turn, CaptureOption } from '@/types/game'
import type { GameStore } from '../gameStore'

export interface TurnSlice {
  // State
  currentTurn: Turn | null
  currentEvent: CurrentEventType
  legalMoves: string[]
  captureOptions: CaptureOption[]
  rollToAllocate: number | null

  // Actions
  setCurrentTurn: (turn: Turn | null) => void
  setCurrentEvent: (event: CurrentEventType) => void
  setLegalMoves: (moves: string[]) => void
  setCaptureOptions: (options: CaptureOption[]) => void
  setRollToAllocate: (roll: number | null) => void
  updateTurn: (updates: Partial<Turn>) => void
  addRoll: (roll: number) => void
  consumeRoll: (roll: number) => void
  resetTurn: () => void
}

const initialTurnState = {
  currentTurn: null,
  currentEvent: 'player_roll' as CurrentEventType,
  legalMoves: [] as string[],
  captureOptions: [] as CaptureOption[],
  rollToAllocate: null,
}

export const createTurnSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  TurnSlice
> = (set) => ({
  ...initialTurnState,

  setCurrentTurn: (turn) =>
    set(
      (state) => {
        state.currentTurn = turn
        if (turn) {
          state.legalMoves = turn.legal_moves
        }
      },
      false,
      'setCurrentTurn'
    ),

  setCurrentEvent: (event) =>
    set(
      (state) => {
        state.currentEvent = event
      },
      false,
      'setCurrentEvent'
    ),

  setLegalMoves: (moves) =>
    set(
      (state) => {
        state.legalMoves = moves
      },
      false,
      'setLegalMoves'
    ),

  setCaptureOptions: (options) =>
    set(
      (state) => {
        state.captureOptions = options
      },
      false,
      'setCaptureOptions'
    ),

  setRollToAllocate: (roll) =>
    set(
      (state) => {
        state.rollToAllocate = roll
      },
      false,
      'setRollToAllocate'
    ),

  updateTurn: (updates) =>
    set(
      (state) => {
        if (state.currentTurn) {
          Object.assign(state.currentTurn, updates)
        }
      },
      false,
      'updateTurn'
    ),

  addRoll: (roll) =>
    set(
      (state) => {
        if (state.currentTurn) {
          state.currentTurn.rolls_to_allocate.push(roll)
        }
      },
      false,
      'addRoll'
    ),

  consumeRoll: (roll) =>
    set(
      (state) => {
        if (state.currentTurn) {
          const index = state.currentTurn.rolls_to_allocate.indexOf(roll)
          if (index !== -1) {
            state.currentTurn.rolls_to_allocate.splice(index, 1)
          }
        }
      },
      false,
      'consumeRoll'
    ),

  resetTurn: () =>
    set(
      (state) => {
        Object.assign(state, initialTurnState)
      },
      false,
      'resetTurn'
    ),
})
