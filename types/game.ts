// Game types based on specs/frontend_integration_guide.md

// ============================================================================
// Core Game State Types
// ============================================================================

export type GamePhase = 'not_started' | 'in_progress' | 'finished'
export type CurrentEventType = 'player_roll' | 'player_choice' | 'capture_choice'
export type StackState = 'hell' | 'road' | 'homestretch' | 'heaven'

export interface GameState {
  phase: GamePhase
  players: Player[]
  current_event: CurrentEventType
  board_setup: BoardSetup
  current_turn: Turn | null
  event_seq: number
}

export interface Player {
  player_id: string
  name: string
  color: PlayerColor
  turn_order: number
  abs_starting_index: number
  stacks: Stack[]
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow'

export interface Stack {
  stack_id: string       // "stack_1", "stack_1_2", etc.
  state: StackState      // "hell" | "road" | "homestretch" | "heaven"
  height: number         // 1-4
  progress: number       // position along player's track
}

export interface PendingCapture {
  moving_stack_id: string
  position: number
  capturable_targets: string[]  // "{player_id}:{stack_id}" format
}

export interface Turn {
  player_id: string
  initial_roll: boolean
  rolls_to_allocate: number[]
  legal_moves: string[]
  current_turn_order: number
  extra_rolls: number
  pending_capture: PendingCapture | null
}

export interface BoardSetup {
  grid_length: number
  loop_length: number
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

export interface GameActionPayload {
  action_type: GameActionType
  value?: number          // For roll (1-6)
  stack_id?: string       // For move
  roll_value?: number     // For move — which roll to consume
  choice?: string         // For capture_choice — "{player_id}:{stack_id}"
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
  payload: {
    state: GameState
  }
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
  | 'INVALID_ACTION'
  | 'ILLEGAL_MOVE'
  | 'INVALID_ROLL'
  | 'GAME_NOT_FOUND'
  | 'GAME_ALREADY_STARTED'
  | 'GAME_NOT_STARTED'
  | 'GAME_FINISHED'
  | 'NOT_HOST'
  | 'PLAYERS_NOT_READY'
  | 'NOT_IN_ROOM'
  | 'INVALID_CAPTURE_TARGET'
  | 'NO_PENDING_CAPTURE'
  | 'STACK_NOT_FOUND'
  | 'INVALID_GAME_STATE'
  | 'VALIDATION_ERROR'

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
  | 'stack_moved'
  | 'stack_exited_hell'
  | 'stack_reached_heaven'
  | 'stack_captured'
  | 'stack_update'
  | 'awaiting_choice'
  | 'awaiting_capture_choice'

export interface BaseGameEvent {
  event_type: GameEventType
  seq: number
}

// Roll Events
export type RollGrantedReason = 'turn_start' | 'rolled_six' | 'capture_bonus' | 'reached_heaven'

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

// Stack Movement Events
export interface StackMovedEvent extends BaseGameEvent {
  event_type: 'stack_moved'
  player_id: string
  stack_id: string
  from_state: StackState
  to_state: StackState
  from_progress: number
  to_progress: number
  roll_used: number
}

export interface StackExitedHellEvent extends BaseGameEvent {
  event_type: 'stack_exited_hell'
  player_id: string
  stack_id: string
  roll_used: number
}

export interface StackReachedHeavenEvent extends BaseGameEvent {
  event_type: 'stack_reached_heaven'
  player_id: string
  stack_id: string
}

// Capture Events
export interface StackCapturedEvent extends BaseGameEvent {
  event_type: 'stack_captured'
  capturing_player_id: string
  capturing_stack_id: string
  captured_player_id: string
  captured_stack_id: string
  position: number
  grants_extra_roll: boolean
}

// Stack Mutation Event (merge, split, capture decomposition)
export interface StackUpdateEvent extends BaseGameEvent {
  event_type: 'stack_update'
  player_id: string
  add_stacks: Stack[]
  remove_stacks: Stack[]
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
export interface LegalMoveGroup {
  stack_id: string
  moves: string[]
}

export interface RollMoveGroup {
  roll: number
  move_groups: LegalMoveGroup[]
}

export interface AwaitingChoiceEvent extends BaseGameEvent {
  event_type: 'awaiting_choice'
  player_id: string
  available_moves: RollMoveGroup[]
}

export interface AwaitingCaptureChoiceEvent extends BaseGameEvent {
  event_type: 'awaiting_capture_choice'
  player_id: string
  options: string[]  // "{player_id}:{stack_id}" format
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
  | StackMovedEvent
  | StackExitedHellEvent
  | StackReachedHeavenEvent
  | StackCapturedEvent
  | StackUpdateEvent
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
  | 'stack_move'
  | 'stack_exit_hell'
  | 'stack_reach_heaven'
  | 'stack_capture'
  | 'stack_update'

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

export interface HighlightedStack {
  stackId: string
  playerId: string
  type: 'selectable' | 'selected' | 'enemy'
}

export interface CaptureOption {
  target: string          // Raw "{player_id}:{stack_id}" string
  playerColor: PlayerColor
  stackId: string
  stackHeight: number
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
