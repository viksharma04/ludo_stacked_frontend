import type { StateCreator } from 'zustand'
import type { CurrentEventType, Turn, CaptureOption, RollMoveGroup } from '@/types/game'
import type { GameStore } from '../gameStore'

export interface TurnSlice {
  // State
  currentTurn: Turn | null
  currentEvent: CurrentEventType
  availableMoves: RollMoveGroup[]
  selectedRoll: number | null
  captureOptions: CaptureOption[]

  // Actions
  setCurrentTurn: (turn: Turn | null) => void
  setCurrentEvent: (event: CurrentEventType) => void
  setAvailableMoves: (moves: RollMoveGroup[]) => void
  setSelectedRoll: (roll: number | null) => void
  setCaptureOptions: (options: CaptureOption[]) => void
  updateTurn: (updates: Partial<Turn>) => void
  addRoll: (roll: number) => void
  consumeRoll: (roll: number) => void
  resetTurn: () => void
}

const EMPTY_MOVES: RollMoveGroup[] = []

const initialTurnState = {
  currentTurn: null,
  currentEvent: 'player_roll' as CurrentEventType,
  availableMoves: EMPTY_MOVES,
  selectedRoll: null,
  captureOptions: [] as CaptureOption[],
}

export const createTurnSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  TurnSlice
> = (set) => ({
  ...initialTurnState,

  setCurrentTurn: (turn) =>
    set((state) => { state.currentTurn = turn }, false, 'setCurrentTurn'),

  setCurrentEvent: (event) =>
    set((state) => { state.currentEvent = event }, false, 'setCurrentEvent'),

  setAvailableMoves: (moves) =>
    set((state) => { state.availableMoves = moves }, false, 'setAvailableMoves'),

  setSelectedRoll: (roll) =>
    set((state) => { state.selectedRoll = roll }, false, 'setSelectedRoll'),

  setCaptureOptions: (options) =>
    set((state) => { state.captureOptions = options }, false, 'setCaptureOptions'),

  updateTurn: (updates) =>
    set((state) => {
      if (state.currentTurn) Object.assign(state.currentTurn, updates)
    }, false, 'updateTurn'),

  addRoll: (roll) =>
    set((state) => {
      if (state.currentTurn) state.currentTurn.rolls_to_allocate.push(roll)
    }, false, 'addRoll'),

  consumeRoll: (roll) =>
    set((state) => {
      if (state.currentTurn) {
        const index = state.currentTurn.rolls_to_allocate.indexOf(roll)
        if (index !== -1) state.currentTurn.rolls_to_allocate.splice(index, 1)
      }
    }, false, 'consumeRoll'),

  resetTurn: () =>
    set((state) => { Object.assign(state, initialTurnState) }, false, 'resetTurn'),
})
