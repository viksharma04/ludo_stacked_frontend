import type { StateCreator } from 'zustand'
import type { HighlightedToken, StackSplitSelection, PlayerColor, RollGrantedReason } from '@/types/game'
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
  highlightedTokens: HighlightedToken[]
  selectedTokenId: string | null
  showMoveChoiceModal: boolean
  showCaptureChoiceModal: boolean
  showVictoryScreen: boolean
  winnerId: string | null
  finalRankings: string[]
  showPenaltyAnimation: boolean
  penaltyPlayerId: string | null
  stackSplitSelection: StackSplitSelection | null
  turnTransition: TurnTransition | null

  // Actions
  setDiceValue: (value: number | null) => void
  setDiceRolling: (rolling: boolean) => void
  setRollReason: (reason: RollGrantedReason | null) => void
  setHighlightedTokens: (tokens: HighlightedToken[]) => void
  addHighlightedToken: (token: HighlightedToken) => void
  removeHighlightedToken: (tokenId: string) => void
  clearHighlightedTokens: () => void
  setSelectedTokenId: (tokenId: string | null) => void
  setShowMoveChoiceModal: (show: boolean) => void
  setShowCaptureChoiceModal: (show: boolean) => void
  setShowVictoryScreen: (show: boolean) => void
  setWinner: (winnerId: string, rankings: string[]) => void
  setShowPenaltyAnimation: (show: boolean, playerId?: string | null) => void
  setStackSplitSelection: (selection: StackSplitSelection | null) => void
  setTurnTransition: (transition: TurnTransition | null) => void
  resetUi: () => void
}

const initialUiState = {
  diceValue: null,
  diceRolling: false,
  rollReason: null as RollGrantedReason | null,
  highlightedTokens: [] as HighlightedToken[],
  selectedTokenId: null,
  showMoveChoiceModal: false,
  showCaptureChoiceModal: false,
  showVictoryScreen: false,
  winnerId: null,
  finalRankings: [] as string[],
  showPenaltyAnimation: false,
  penaltyPlayerId: null,
  stackSplitSelection: null as StackSplitSelection | null,
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
    set(
      (state) => {
        state.diceValue = value
      },
      false,
      'setDiceValue'
    ),

  setDiceRolling: (rolling) =>
    set(
      (state) => {
        state.diceRolling = rolling
      },
      false,
      'setDiceRolling'
    ),

  setRollReason: (reason) =>
    set(
      (state) => {
        state.rollReason = reason
      },
      false,
      'setRollReason'
    ),

  setHighlightedTokens: (tokens) =>
    set(
      (state) => {
        state.highlightedTokens = tokens
      },
      false,
      'setHighlightedTokens'
    ),

  addHighlightedToken: (token) =>
    set(
      (state) => {
        // Avoid duplicates
        const exists = state.highlightedTokens.some(
          (t) => t.tokenId === token.tokenId
        )
        if (!exists) {
          state.highlightedTokens.push(token)
        }
      },
      false,
      'addHighlightedToken'
    ),

  removeHighlightedToken: (tokenId) =>
    set(
      (state) => {
        state.highlightedTokens = state.highlightedTokens.filter(
          (t) => t.tokenId !== tokenId
        )
      },
      false,
      'removeHighlightedToken'
    ),

  clearHighlightedTokens: () =>
    set(
      (state) => {
        state.highlightedTokens = []
        state.selectedTokenId = null
      },
      false,
      'clearHighlightedTokens'
    ),

  setSelectedTokenId: (tokenId) =>
    set(
      (state) => {
        state.selectedTokenId = tokenId
      },
      false,
      'setSelectedTokenId'
    ),

  setShowMoveChoiceModal: (show) =>
    set(
      (state) => {
        state.showMoveChoiceModal = show
      },
      false,
      'setShowMoveChoiceModal'
    ),

  setShowCaptureChoiceModal: (show) =>
    set(
      (state) => {
        state.showCaptureChoiceModal = show
      },
      false,
      'setShowCaptureChoiceModal'
    ),

  setShowVictoryScreen: (show) =>
    set(
      (state) => {
        state.showVictoryScreen = show
      },
      false,
      'setShowVictoryScreen'
    ),

  setWinner: (winnerId, rankings) =>
    set(
      (state) => {
        state.winnerId = winnerId
        state.finalRankings = rankings
        state.showVictoryScreen = true
      },
      false,
      'setWinner'
    ),

  setShowPenaltyAnimation: (show, playerId = null) =>
    set(
      (state) => {
        state.showPenaltyAnimation = show
        state.penaltyPlayerId = playerId
      },
      false,
      'setShowPenaltyAnimation'
    ),

  setStackSplitSelection: (selection) =>
    set(
      (state) => {
        state.stackSplitSelection = selection
      },
      false,
      'setStackSplitSelection'
    ),

  setTurnTransition: (transition) =>
    set(
      (state) => {
        state.turnTransition = transition
      },
      false,
      'setTurnTransition'
    ),

  resetUi: () =>
    set(
      (state) => {
        Object.assign(state, initialUiState)
      },
      false,
      'resetUi'
    ),
})
