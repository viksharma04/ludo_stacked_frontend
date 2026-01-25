import type { StateCreator } from 'zustand'
import type {
  GamePhase,
  Player,
  BoardSetup,
  Stack,
  Token,
  GameState,
} from '@/types/game'
import type { GameStore } from '../gameStore'

export interface BoardSlice {
  // State
  phase: GamePhase
  players: Player[]
  boardSetup: BoardSetup | null
  globalStacks: Stack[] | null
  myPlayerId: string | null
  eventSeq: number

  // Actions
  setPhase: (phase: GamePhase) => void
  setPlayers: (players: Player[]) => void
  setBoardSetup: (setup: BoardSetup) => void
  setMyPlayerId: (playerId: string) => void
  setEventSeq: (seq: number) => void
  updateToken: (
    playerId: string,
    tokenId: string,
    updates: Partial<Token>
  ) => void
  addStack: (playerId: string, stack: Stack) => void
  removeStack: (playerId: string, stackId: string) => void
  updateStack: (playerId: string, stackId: string, tokens: string[]) => void
  initializeFromGameState: (state: GameState, myPlayerId: string) => void
  resetBoard: () => void
}

const initialBoardState = {
  phase: 'not_started' as GamePhase,
  players: [] as Player[],
  boardSetup: null,
  globalStacks: null,
  myPlayerId: null,
  eventSeq: 0,
}

export const createBoardSlice: StateCreator<
  GameStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  BoardSlice
> = (set) => ({
  ...initialBoardState,

  setPhase: (phase) =>
    set(
      (state) => {
        state.phase = phase
      },
      false,
      'setPhase'
    ),

  setPlayers: (players) =>
    set(
      (state) => {
        state.players = players
      },
      false,
      'setPlayers'
    ),

  setBoardSetup: (setup) =>
    set(
      (state) => {
        state.boardSetup = setup
      },
      false,
      'setBoardSetup'
    ),

  setMyPlayerId: (playerId) =>
    set(
      (state) => {
        state.myPlayerId = playerId
      },
      false,
      'setMyPlayerId'
    ),

  setEventSeq: (seq) =>
    set(
      (state) => {
        state.eventSeq = seq
      },
      false,
      'setEventSeq'
    ),

  updateToken: (playerId, tokenId, updates) =>
    set(
      (state) => {
        const player = state.players.find((p) => p.player_id === playerId)
        if (!player) return

        const token = player.tokens.find((t) => t.token_id === tokenId)
        if (!token) return

        Object.assign(token, updates)
      },
      false,
      'updateToken'
    ),

  addStack: (playerId, stack) =>
    set(
      (state) => {
        const player = state.players.find((p) => p.player_id === playerId)
        if (!player) return

        if (!player.stacks) {
          player.stacks = []
        }
        player.stacks.push(stack)

        // Mark tokens as in_stack
        stack.tokens.forEach((tokenId) => {
          const token = player.tokens.find((t) => t.token_id === tokenId)
          if (token) {
            token.in_stack = true
          }
        })
      },
      false,
      'addStack'
    ),

  removeStack: (playerId, stackId) =>
    set(
      (state) => {
        const player = state.players.find((p) => p.player_id === playerId)
        if (!player || !player.stacks) return

        const stack = player.stacks.find((s) => s.stack_id === stackId)
        if (stack) {
          // Mark tokens as not in stack
          stack.tokens.forEach((tokenId) => {
            const token = player.tokens.find((t) => t.token_id === tokenId)
            if (token) {
              token.in_stack = false
            }
          })
        }

        player.stacks = player.stacks.filter((s) => s.stack_id !== stackId)
      },
      false,
      'removeStack'
    ),

  updateStack: (playerId, stackId, tokens) =>
    set(
      (state) => {
        const player = state.players.find((p) => p.player_id === playerId)
        if (!player || !player.stacks) return

        const stack = player.stacks.find((s) => s.stack_id === stackId)
        if (stack) {
          stack.tokens = tokens
        }
      },
      false,
      'updateStack'
    ),

  initializeFromGameState: (gameState, myPlayerId) =>
    set(
      (state) => {
        state.phase = gameState.phase
        state.players = gameState.players
        state.boardSetup = gameState.board_setup
        state.globalStacks = gameState.stacks
        state.myPlayerId = myPlayerId
        state.eventSeq = gameState.event_seq
      },
      false,
      'initializeFromGameState'
    ),

  resetBoard: () =>
    set(
      (state) => {
        Object.assign(state, initialBoardState)
      },
      false,
      'resetBoard'
    ),
})
