import { useGameStore, type GameStore } from './gameStore'
import type { Player, Token, Stack, PlayerColor } from '@/types/game'

// ============================================================================
// Basic Selectors
// ============================================================================

export const usePhase = () => useGameStore((state) => state.phase)
export const usePlayers = () => useGameStore((state) => state.players)
export const useBoardSetup = () => useGameStore((state) => state.boardSetup)
export const useMyPlayerId = () => useGameStore((state) => state.myPlayerId)
export const useCurrentTurn = () => useGameStore((state) => state.currentTurn)
export const useCurrentEvent = () => useGameStore((state) => state.currentEvent)
export const useLegalMoves = () => useGameStore((state) => state.legalMoves)
export const useDiceValue = () => useGameStore((state) => state.diceValue)
export const useDiceRolling = () => useGameStore((state) => state.diceRolling)
export const useIsAnimating = () => useGameStore((state) => state.isAnimating)
export const useAnimationQueue = () =>
  useGameStore((state) => state.animationQueue)

// ============================================================================
// Derived Selectors
// ============================================================================

// Get current player whose turn it is
export const useCurrentPlayer = () =>
  useGameStore((state) => {
    if (!state.currentTurn) return null
    return (
      state.players.find((p) => p.player_id === state.currentTurn!.player_id) ??
      null
    )
  })

// Check if it's my turn
export const useIsMyTurn = () =>
  useGameStore((state) => {
    if (!state.currentTurn || !state.myPlayerId) return false
    return state.currentTurn.player_id === state.myPlayerId
  })

// Get my player data
export const useMyPlayer = () =>
  useGameStore((state) => {
    if (!state.myPlayerId) return null
    return state.players.find((p) => p.player_id === state.myPlayerId) ?? null
  })

// Get player by ID
export const selectPlayerById = (state: GameStore, playerId: string) =>
  state.players.find((p) => p.player_id === playerId)

export const usePlayerById = (playerId: string) =>
  useGameStore((state) => selectPlayerById(state, playerId))

// Get player color
export const usePlayerColor = (playerId: string): PlayerColor | null =>
  useGameStore((state) => {
    const player = state.players.find((p) => p.player_id === playerId)
    return player?.color ?? null
  })

// Get all tokens flat list with player info
export interface TokenWithPlayer extends Token {
  playerId: string
  playerColor: PlayerColor
}

// Helper function for computing all tokens (use with useMemo in components)
export function computeAllTokens(players: Player[]): TokenWithPlayer[] {
  return players.flatMap((player) =>
    player.tokens.map((token) => ({
      ...token,
      playerId: player.player_id,
      playerColor: player.color,
    }))
  )
}

// Get all stacks flat list with player info
export interface StackWithPlayer extends Stack {
  playerId: string
  playerColor: PlayerColor
}

// Helper function for computing all stacks (use with useMemo in components)
export function computeAllStacks(players: Player[]): StackWithPlayer[] {
  return players.flatMap((player) =>
    (player.stacks ?? []).map((stack) => ({
      ...stack,
      playerId: player.player_id,
      playerColor: player.color,
    }))
  )
}

// Get highlighted tokens
export const useHighlightedTokens = () =>
  useGameStore((state) => state.highlightedTokens)

// Get selected token ID
export const useSelectedTokenId = () =>
  useGameStore((state) => state.selectedTokenId)

// Check if a specific token is selectable (in legal moves)
export const useIsTokenSelectable = (tokenId: string) =>
  useGameStore((state) => state.legalMoves.includes(tokenId))

// Check if a token/stack is highlighted
export const useIsHighlighted = (tokenId: string) =>
  useGameStore((state) =>
    state.highlightedTokens.some((t) => t.tokenId === tokenId)
  )

// Get rolls to allocate - returns stable empty array when no turn
const EMPTY_ROLLS: number[] = []
export const useRollsToAllocate = () =>
  useGameStore((state) => state.currentTurn?.rolls_to_allocate ?? EMPTY_ROLLS)

// Check if can roll (my turn + player_roll event + initial_roll)
export const useCanRoll = () =>
  useGameStore((state) => {
    if (!state.currentTurn || !state.myPlayerId) return false
    if (state.currentTurn.player_id !== state.myPlayerId) return false
    if (state.currentEvent !== 'player_roll') return false
    return true
  })

// Check if need to select a move
export const useNeedsMoveSelection = () =>
  useGameStore((state) => {
    if (!state.currentTurn || !state.myPlayerId) return false
    if (state.currentTurn.player_id !== state.myPlayerId) return false
    return state.currentEvent === 'player_choice' && state.legalMoves.length > 0
  })

// Check if need to make capture choice
export const useNeedsCaptureChoice = () =>
  useGameStore((state) => {
    if (!state.currentTurn || !state.myPlayerId) return false
    if (state.currentTurn.player_id !== state.myPlayerId) return false
    return state.currentEvent === 'capture_choice'
  })

// Get capture options
export const useCaptureOptions = () =>
  useGameStore((state) => state.captureOptions)

// Modal visibility
export const useShowMoveChoiceModal = () =>
  useGameStore((state) => state.showMoveChoiceModal)
export const useShowCaptureChoiceModal = () =>
  useGameStore((state) => state.showCaptureChoiceModal)
export const useShowVictoryScreen = () =>
  useGameStore((state) => state.showVictoryScreen)

// Victory state
export const useWinnerId = () => useGameStore((state) => state.winnerId)
export const useFinalRankings = () =>
  useGameStore((state) => state.finalRankings)

// Penalty animation
export const useShowPenaltyAnimation = () =>
  useGameStore((state) => state.showPenaltyAnimation)
export const usePenaltyPlayerId = () =>
  useGameStore((state) => state.penaltyPlayerId)

// Get token by ID
export const useTokenById = (
  tokenId: string
): (Token & { playerId: string }) | null =>
  useGameStore((state) => {
    for (const player of state.players) {
      const token = player.tokens.find((t) => t.token_id === tokenId)
      if (token) {
        return { ...token, playerId: player.player_id }
      }
    }
    return null
  })

// Get stack by ID
export const useStackById = (
  stackId: string
): (Stack & { playerId: string }) | null =>
  useGameStore((state) => {
    for (const player of state.players) {
      const stack = player.stacks?.find((s) => s.stack_id === stackId)
      if (stack) {
        return { ...stack, playerId: player.player_id }
      }
    }
    return null
  })

// Count tokens in heaven per player - use usePlayers() and compute in component with useMemo
export interface TokensInHeavenInfo {
  playerId: string
  color: PlayerColor
  count: number
}

// Game progress info - use usePlayers() and compute in component with useMemo
export interface PlayerProgressInfo {
  playerId: string
  name: string
  color: PlayerColor
  heavenCount: number
  totalTokens: number
  progress: number
}

// Helper functions for computing derived data (use with useMemo in components)
export function computeTokensInHeaven(players: Player[]): TokensInHeavenInfo[] {
  return players.map((player) => ({
    playerId: player.player_id,
    color: player.color,
    count: player.tokens.filter((t) => t.state === 'heaven').length,
  }))
}

export function computePlayerProgress(players: Player[]): PlayerProgressInfo[] {
  return players.map((player) => ({
    playerId: player.player_id,
    name: player.name,
    color: player.color,
    heavenCount: player.tokens.filter((t) => t.state === 'heaven').length,
    totalTokens: player.tokens.length,
    progress:
      player.tokens.length > 0
        ? player.tokens.filter((t) => t.state === 'heaven').length /
          player.tokens.length
        : 0,
  }))
}
