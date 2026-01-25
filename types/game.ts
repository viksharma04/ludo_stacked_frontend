// Game types based on frontend_game_integration.md spec

// ============================================================================
// Core Game State Types
// ============================================================================

export type GamePhase = 'not_started' | 'in_progress' | 'finished'
export type CurrentEventType = 'player_roll' | 'player_choice' | 'capture_choice'
export type TokenState = 'hell' | 'road' | 'homestretch' | 'heaven'

export interface GameState {
  phase: GamePhase
  players: Player[]
  current_event: CurrentEventType
  board_setup: BoardSetup
  current_turn: Turn | null
  stacks: Stack[] | null
  event_seq: number
}

export interface Player {
  player_id: string
  name: string
  color: PlayerColor
  turn_order: number
  abs_starting_index: number
  tokens: Token[]
  stacks: Stack[] | null
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow'

export interface Token {
  token_id: string
  state: TokenState
  progress: number
  in_stack: boolean
}

export interface Stack {
  stack_id: string
  tokens: string[]
}

export interface Turn {
  player_id: string
  initial_roll: boolean
  rolls_to_allocate: number[]
  legal_moves: string[]
  current_turn_order: number
  extra_rolls: number
}

export interface BoardSetup {
  squares_to_win: number
  squares_to_homestretch: number
  starting_positions: number[]
  safe_spaces: number[]
  get_out_rolls: number[]
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type GameMessageType =
  | 'game_action'
  | 'game_events'
  | 'game_state'
  | 'game_error'

export type GameActionType =
  | 'roll'
  | 'move'
  | 'capture_choice'
  | 'start_game'

export interface GameActionPayload {
  action_type: GameActionType
  value?: number // For roll action
  token_or_stack_id?: string // For move action
  choice?: 'stack' | 'capture' | string // For capture_choice action
}

export interface WSGameActionMessage {
  type: 'game_action'
  request_id?: string
  payload: GameActionPayload
}

export interface WSGameEventsMessage {
  type: 'game_events'
  payload: {
    events: GameEvent[]
  }
}

export interface WSGameStateMessage {
  type: 'game_state'
  payload: GameState
}

export interface WSGameErrorMessage {
  type: 'game_error'
  payload: {
    error_code: GameErrorCode
    message: string
  }
}

export type GameErrorCode =
  | 'NOT_YOUR_TURN'
  | 'INVALID_MOVE'
  | 'INVALID_ACTION'
  | 'GAME_NOT_FOUND'

// ============================================================================
// Game Events
// ============================================================================

export type GameEventType =
  | 'game_started'
  | 'game_ended'
  | 'turn_started'
  | 'turn_ended'
  | 'roll_granted'
  | 'dice_rolled'
  | 'three_sixes_penalty'
  | 'token_moved'
  | 'token_exited_hell'
  | 'token_reached_heaven'
  | 'token_captured'
  | 'stack_formed'
  | 'stack_dissolved'
  | 'stack_split'
  | 'stack_moved'
  | 'awaiting_choice'
  | 'awaiting_capture_choice'

// Base event interface
export interface BaseGameEvent {
  event_type: GameEventType
  seq: number
}

// Roll Events
export type RollGrantedReason = 'turn_start' | 'rolled_six' | 'capture_bonus'

export interface RollGrantedEvent extends BaseGameEvent {
  event_type: 'roll_granted'
  player_id: string
  reason: RollGrantedReason
}

export interface DiceRolledEvent extends BaseGameEvent {
  event_type: 'dice_rolled'
  player_id: string
  value: number
  roll_number: number
  grants_extra_roll: boolean
}

export interface ThreeSixesPenaltyEvent extends BaseGameEvent {
  event_type: 'three_sixes_penalty'
  player_id: string
  rolls: [6, 6, 6]
}

// Move Events
export interface TokenMovedEvent extends BaseGameEvent {
  event_type: 'token_moved'
  player_id: string
  token_id: string
  from_state: TokenState
  to_state: TokenState
  from_progress: number
  to_progress: number
  roll_used: number
}

export interface TokenExitedHellEvent extends BaseGameEvent {
  event_type: 'token_exited_hell'
  player_id: string
  token_id: string
  roll_used: number
}

export interface TokenReachedHeavenEvent extends BaseGameEvent {
  event_type: 'token_reached_heaven'
  player_id: string
  token_id: string
}

// Capture Events
export interface TokenCapturedEvent extends BaseGameEvent {
  event_type: 'token_captured'
  capturing_player_id: string
  capturing_token_id: string
  captured_player_id: string
  captured_token_id: string
  position: number
  grants_extra_roll: boolean
}

// Stack Events
export interface StackFormedEvent extends BaseGameEvent {
  event_type: 'stack_formed'
  player_id: string
  stack_id: string
  token_ids: string[]
  position: number
}

export interface StackDissolvedEvent extends BaseGameEvent {
  event_type: 'stack_dissolved'
  player_id: string
  stack_id: string
  token_ids: string[]
  reason: 'captured' | 'split'
}

export interface StackSplitEvent extends BaseGameEvent {
  event_type: 'stack_split'
  player_id: string
  original_stack_id: string
  moving_token_ids: string[]
  remaining_token_ids: string[]
  new_stack_id: string | null
}

export interface StackMovedEvent extends BaseGameEvent {
  event_type: 'stack_moved'
  player_id: string
  stack_id: string
  token_ids: string[]
  from_progress: number
  to_progress: number
  roll_used: number
  effective_roll: number
}

// Turn Events
export interface TurnStartedEvent extends BaseGameEvent {
  event_type: 'turn_started'
  player_id: string
  turn_number: number
}

export interface TurnEndedEvent extends BaseGameEvent {
  event_type: 'turn_ended'
  player_id: string
  reason: 'no_legal_moves' | 'all_rolls_used' | 'three_sixes'
  next_player_id: string
}

// Awaiting Events
export interface AwaitingChoiceEvent extends BaseGameEvent {
  event_type: 'awaiting_choice'
  player_id: string
  legal_moves: string[]
  roll_to_allocate: number
}

export interface AwaitingCaptureChoiceEvent extends BaseGameEvent {
  event_type: 'awaiting_capture_choice'
  player_id: string
  options: string[]
}

// Game Lifecycle Events
export interface GameStartedEvent extends BaseGameEvent {
  event_type: 'game_started'
  player_order: string[]
  first_player_id: string
}

export interface GameEndedEvent extends BaseGameEvent {
  event_type: 'game_ended'
  winner_id: string
  final_rankings: string[]
}

// Union type for all game events
export type GameEvent =
  | DiceRolledEvent
  | ThreeSixesPenaltyEvent
  | TokenMovedEvent
  | TokenExitedHellEvent
  | TokenReachedHeavenEvent
  | TokenCapturedEvent
  | StackFormedEvent
  | StackDissolvedEvent
  | StackSplitEvent
  | StackMovedEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | RollGrantedEvent
  | AwaitingChoiceEvent
  | AwaitingCaptureChoiceEvent
  | GameStartedEvent
  | GameEndedEvent

// ============================================================================
// Animation Types
// ============================================================================

export type AnimationType =
  | 'dice_roll'
  | 'token_move'
  | 'token_exit_hell'
  | 'token_reach_heaven'
  | 'token_capture'
  | 'stack_form'
  | 'stack_dissolve'
  | 'stack_split'
  | 'stack_move'

export interface AnimationQueueItem {
  id: string
  type: AnimationType
  event: GameEvent
  duration: number
  startTime?: number
}

// ============================================================================
// UI State Types
// ============================================================================

export interface HighlightedToken {
  tokenId: string
  playerId: string
  type: 'selectable' | 'selected' | 'enemy'
}

export interface CaptureOption {
  id: string
  label: string
  type: 'stack' | 'capture' | 'target'
}

// ============================================================================
// Board Rendering Types
// ============================================================================

export interface Point {
  x: number
  y: number
}

export interface BoardPosition {
  point: Point
  rotation?: number
  scale?: number
}

// Token position on the board
export interface TokenPosition {
  tokenId: string
  playerId: string
  state: TokenState
  progress: number
  boardPosition: BoardPosition
  inStack: boolean
  stackId?: string
}

// Player color configuration
export interface PlayerColorConfig {
  primary: number // Hex color for token fill
  secondary: number // Hex color for outline/accent
  home: number // Hex color for home area
  homestretch: number // Hex color for homestretch path
}

export const PLAYER_COLORS: Record<PlayerColor, PlayerColorConfig> = {
  red: {
    primary: 0xe53935,
    secondary: 0xb71c1c,
    home: 0xffcdd2,
    homestretch: 0xef9a9a,
  },
  blue: {
    primary: 0x1e88e5,
    secondary: 0x0d47a1,
    home: 0xbbdefb,
    homestretch: 0x90caf9,
  },
  green: {
    primary: 0x43a047,
    secondary: 0x1b5e20,
    home: 0xc8e6c9,
    homestretch: 0xa5d6a7,
  },
  yellow: {
    primary: 0xfdd835,
    secondary: 0xf9a825,
    home: 0xfff9c4,
    homestretch: 0xfff59d,
  },
}

// ============================================================================
// Parsed Legal Move Types
// ============================================================================

export interface ParsedLegalMove {
  rawId: string           // Original ID from server
  type: 'token' | 'stack'
  entityId: string        // Token ID or Stack ID (without :count)
  stackSplitCount?: number
}

export interface StackSplitSelection {
  stackId: string
  options: ParsedLegalMove[]
  position: { x: number; y: number }
}

// ============================================================================
// Event Log Types
// ============================================================================

export type EventLogSeverity = 'info' | 'success' | 'warning' | 'danger'

export interface GameLogEntry {
  id: string
  timestamp: number
  eventType: GameEventType
  message: string
  playerId: string | null
  playerColor: PlayerColor | null
  severity: EventLogSeverity
}
