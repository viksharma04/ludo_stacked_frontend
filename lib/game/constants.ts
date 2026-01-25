// Animation durations in milliseconds
export const ANIMATION_DURATIONS = {
  DICE_ROLL: 250,
  TOKEN_MOVE_PER_SQUARE: 300,
  TOKEN_CAPTURE: 500,
  STACK_FORM: 400,
  STACK_DISSOLVE: 400,
  TOKEN_EXIT_HELL: 500,
  TOKEN_REACH_HEAVEN: 800,
  TURN_TRANSITION: 300,
  PENALTY_DISPLAY: 2000,
} as const

// Fast forward multiplier (for reconnection)
export const FAST_FORWARD_SPEED = 0.1

// Board visual constants
export const BOARD_COLORS = {
  BACKGROUND: 0xf5f5dc, // Beige/cream
  TRACK: 0xffffff, // White track squares
  SAFE_SPACE: 0xffd700, // Gold for safe spaces
  CENTER: 0x808080, // Gray center
  GRID_LINE: 0xcccccc, // Light gray grid lines
} as const

// Token visual constants
export const TOKEN_VISUAL = {
  RADIUS_RATIO: 0.35, // Relative to cell size
  OUTLINE_WIDTH: 2,
  STACK_OFFSET: 3, // Pixels offset for stacked tokens
  HIGHLIGHT_PULSE_SPEED: 1.5, // Seconds for full pulse cycle
  SELECTED_SCALE: 1.15,
} as const

// Dice visual constants
export const DICE_VISUAL = {
  SIZE: 60,
  CORNER_RADIUS: 8,
  DOT_RADIUS: 6,
  BACKGROUND: 0xffffff,
  DOT_COLOR: 0x000000,
  ROLLING_FRAMES: 10,
} as const

// Z-index layers for rendering order
export const Z_LAYERS = {
  BOARD_BACKGROUND: 0,
  BOARD_TRACK: 1,
  SAFE_SPACES: 2,
  HOME_AREAS: 3,
  TOKENS_BASE: 10,
  TOKENS_MOVING: 20,
  TOKENS_HIGHLIGHTED: 30,
  EFFECTS: 40,
  UI_OVERLAY: 50,
} as const

// WebSocket message types for game
export const GAME_MESSAGE_TYPES = {
  GAME_ACTION: 'game_action',
  GAME_EVENTS: 'game_events',
  GAME_STATE: 'game_state',
  GAME_ERROR: 'game_error',
} as const

// Action types
export const ACTION_TYPES = {
  ROLL: 'roll',
  MOVE: 'move',
  CAPTURE_CHOICE: 'capture_choice',
  START_GAME: 'start_game',
} as const
