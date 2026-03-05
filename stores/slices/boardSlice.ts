import type { StateCreator } from 'zustand'
import type { GamePhase, Player, BoardSetup, Stack, GameState } from '@/types/game'
import type { GameStore } from '../gameStore'

export interface BoardSlice {
  // State
  phase: GamePhase
  players: Player[]
  boardSetup: BoardSetup | null
  myPlayerId: string | null
  eventSeq: number

  // Actions
  setPhase: (phase: GamePhase) => void
  setPlayers: (players: Player[]) => void
  setBoardSetup: (setup: BoardSetup) => void
  setMyPlayerId: (playerId: string) => void
  setEventSeq: (seq: number) => void
  addStack: (playerId: string, stack: Stack) => void
  removeStack: (playerId: string, stackId: string) => void
  updateStackById: (playerId: string, stackId: string, updates: Partial<Stack>) => void
  replacePlayerStacks: (playerId: string, stacks: Stack[]) => void
  initializeFromGameState: (state: GameState, myPlayerId: string) => void
  resetBoard: () => void
}

const initialBoardState = {
  phase: 'not_started' as GamePhase,
  players: [] as Player[],
  boardSetup: null,
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
    set((state) => { state.phase = phase }, false, 'setPhase'),

  setPlayers: (players) =>
    set((state) => { state.players = players }, false, 'setPlayers'),

  setBoardSetup: (setup) =>
    set((state) => { state.boardSetup = setup }, false, 'setBoardSetup'),

  setMyPlayerId: (playerId) =>
    set((state) => { state.myPlayerId = playerId }, false, 'setMyPlayerId'),

  setEventSeq: (seq) =>
    set((state) => { state.eventSeq = seq }, false, 'setEventSeq'),

  addStack: (playerId, stack) =>
    set((state) => {
      const player = state.players.find((p) => p.player_id === playerId)
      if (!player) return
      player.stacks.push(stack)
    }, false, 'addStack'),

  removeStack: (playerId, stackId) =>
    set((state) => {
      const player = state.players.find((p) => p.player_id === playerId)
      if (!player) return
      player.stacks = player.stacks.filter((s) => s.stack_id !== stackId)
    }, false, 'removeStack'),

  updateStackById: (playerId, stackId, updates) =>
    set((state) => {
      const player = state.players.find((p) => p.player_id === playerId)
      if (!player) return
      const stack = player.stacks.find((s) => s.stack_id === stackId)
      if (!stack) return
      Object.assign(stack, updates)
    }, false, 'updateStackById'),

  replacePlayerStacks: (playerId, stacks) =>
    set((state) => {
      const player = state.players.find((p) => p.player_id === playerId)
      if (!player) return
      player.stacks = stacks
    }, false, 'replacePlayerStacks'),

  initializeFromGameState: (gameState, myPlayerId) =>
    set((state) => {
      state.phase = gameState.phase
      state.players = gameState.players
      state.boardSetup = gameState.board_setup
      state.myPlayerId = myPlayerId
      state.eventSeq = gameState.event_seq
    }, false, 'initializeFromGameState'),

  resetBoard: () =>
    set((state) => { Object.assign(state, initialBoardState) }, false, 'resetBoard'),
})
