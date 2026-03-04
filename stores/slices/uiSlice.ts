import type { StateCreator } from 'zustand'
import type { HighlightedStack, PlayerColor, RollGrantedReason } from '@/types/game'
import type { GameStore } from '../gameStore'

export interface TurnTransition {
  playerName: string
  playerColor: PlayerColor
  isMyTurn: boolean
}

export interface UiSlice {
  // State
  diceValue: number | null
  diceRolling: boolean
  rollReason: RollGrantedReason | null
  highlightedTokens: HighlightedStack[]
  selectedStackId: string | null
  showMoveChoiceModal: boolean
  showCaptureChoiceModal: boolean
  showVictoryScreen: boolean
  winnerId: string | null
  finalRankings: string[]
  showPenaltyAnimation: boolean
  penaltyPlayerId: string | null
  turnTransition: TurnTransition | null

  // Actions
  setDiceValue: (value: number | null) => void
  setDiceRolling: (rolling: boolean) => void
  setRollReason: (reason: RollGrantedReason | null) => void
  setHighlightedTokens: (stacks: HighlightedStack[]) => void
  addHighlightedToken: (stack: HighlightedStack) => void
  removeHighlightedToken: (stackId: string) => void
  clearHighlightedTokens: () => void
  setSelectedStackId: (stackId: string | null) => void
  setShowMoveChoiceModal: (show: boolean) => void
  setShowCaptureChoiceModal: (show: boolean) => void
  setShowVictoryScreen: (show: boolean) => void
  setWinner: (winnerId: string, rankings: string[]) => void
  setShowPenaltyAnimation: (show: boolean, playerId?: string | null) => void
  setTurnTransition: (transition: TurnTransition | null) => void
  resetUi: () => void
}

const initialUiState = {
  diceValue: null,
  diceRolling: false,
  rollReason: null as RollGrantedReason | null,
  highlightedTokens: [] as HighlightedStack[],
  selectedStackId: null,
  showMoveChoiceModal: false,
  showCaptureChoiceModal: false,
  showVictoryScreen: false,
  winnerId: null,
  finalRankings: [] as string[],
  showPenaltyAnimation: false,
  penaltyPlayerId: null,
  turnTransition: null as TurnTransition | null,
}

export const createUiSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  UiSlice
> = (set) => ({
  ...initialUiState,

  setDiceValue: (value) =>
    set((state) => { state.diceValue = value }, false, 'setDiceValue'),

  setDiceRolling: (rolling) =>
    set((state) => { state.diceRolling = rolling }, false, 'setDiceRolling'),

  setRollReason: (reason) =>
    set((state) => { state.rollReason = reason }, false, 'setRollReason'),

  setHighlightedTokens: (stacks) =>
    set((state) => { state.highlightedTokens = stacks }, false, 'setHighlightedTokens'),

  addHighlightedToken: (stack) =>
    set((state) => {
      const exists = state.highlightedTokens.some((t) => t.stackId === stack.stackId)
      if (!exists) {
        state.highlightedTokens.push(stack)
      }
    }, false, 'addHighlightedToken'),

  removeHighlightedToken: (stackId) =>
    set((state) => {
      state.highlightedTokens = state.highlightedTokens.filter((t) => t.stackId !== stackId)
    }, false, 'removeHighlightedToken'),

  clearHighlightedTokens: () =>
    set((state) => {
      state.highlightedTokens = []
      state.selectedStackId = null
    }, false, 'clearHighlightedTokens'),

  setSelectedStackId: (stackId) =>
    set((state) => { state.selectedStackId = stackId }, false, 'setSelectedStackId'),

  setShowMoveChoiceModal: (show) =>
    set((state) => { state.showMoveChoiceModal = show }, false, 'setShowMoveChoiceModal'),

  setShowCaptureChoiceModal: (show) =>
    set((state) => { state.showCaptureChoiceModal = show }, false, 'setShowCaptureChoiceModal'),

  setShowVictoryScreen: (show) =>
    set((state) => { state.showVictoryScreen = show }, false, 'setShowVictoryScreen'),

  setWinner: (winnerId, rankings) =>
    set((state) => {
      state.winnerId = winnerId
      state.finalRankings = rankings
      state.showVictoryScreen = true
    }, false, 'setWinner'),

  setShowPenaltyAnimation: (show, playerId = null) =>
    set((state) => {
      state.showPenaltyAnimation = show
      state.penaltyPlayerId = playerId
    }, false, 'setShowPenaltyAnimation'),

  setTurnTransition: (transition) =>
    set((state) => { state.turnTransition = transition }, false, 'setTurnTransition'),

  resetUi: () =>
    set((state) => { Object.assign(state, initialUiState) }, false, 'resetUi'),
})
