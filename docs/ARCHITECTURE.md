# Architecture Documentation

This document provides a comprehensive technical overview of the Ludo Stacked Frontend architecture.

## Table of Contents

1. [System Overview](#system-overview)
2. [Directory Structure](#directory-structure)
3. [State Management](#state-management)
4. [React Contexts](#react-contexts)
5. [Custom Hooks](#custom-hooks)
6. [Game Rendering](#game-rendering)
7. [Game Logic](#game-logic)
8. [WebSocket Communication](#websocket-communication)
9. [Data Flow](#data-flow)
10. [Component Architecture](#component-architecture)

---

## System Overview

The Ludo Stacked Frontend is a Next.js 16 application that provides a real-time multiplayer board game experience. The architecture is designed around several key concerns:

- **Authentication**: Supabase Auth with OAuth support
- **State Management**: Zustand store with slice-based architecture
- **Real-time Communication**: WebSocket for game state synchronization
- **Game Rendering**: Pixi.js for performant 2D graphics
- **Animation System**: Queue-based sequential animation playback

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 | App Router, SSR, API routes |
| UI Library | React 19 | Component-based UI |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State | Zustand + Immer | Global game state |
| Graphics | Pixi.js 8 | 2D game rendering |
| Auth | Supabase Auth | User authentication |
| Real-time | WebSocket | Game state sync |
| Notifications | Sonner | Toast notifications |

---

## Directory Structure

```
ludo_stacked_frontend/
├── app/                    # Next.js App Router
├── components/             # React components (by feature)
├── contexts/               # React context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and services
│   ├── api/                # Backend API client
│   ├── game/               # Game logic utilities
│   ├── pixi/               # Pixi.js renderers
│   └── supabase/           # Supabase clients
├── stores/                 # Zustand store and slices
├── types/                  # TypeScript type definitions
├── specs/                  # Game specification documents
└── docs/                   # Documentation
```

---

## State Management

### Zustand Store Architecture

The game state is managed via a centralized Zustand store (`stores/gameStore.ts`) that combines 5 domain-specific slices:

```typescript
// Store creation with middleware stack
export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector(
      immer((...args) => ({
        ...createBoardSlice(...args),
        ...createTurnSlice(...args),
        ...createAnimationSlice(...args),
        ...createUiSlice(...args),
        ...createEventLogSlice(...args),
      }))
    ),
    { name: 'GameStore', enabled: process.env.NODE_ENV === 'development' }
  )
)
```

### Slice Responsibilities

#### BoardSlice (`stores/slices/boardSlice.ts`)
Manages core game board state:
- `phase`: GamePhase (not_started, in_progress, finished)
- `players`: Player[] with tokens and stacks
- `boardSetup`: Board configuration (squares, safe spaces)
- `globalStacks`: Stack[] for cross-player stacks
- `myPlayerId`: Current user's player ID
- `eventSeq`: Event sequence counter

#### TurnSlice (`stores/slices/turnSlice.ts`)
Manages turn and action state:
- `currentTurn`: Active turn data
- `currentEvent`: CurrentEventType (player_roll, player_choice, capture_choice)
- `legalMoves`: string[] of valid move IDs
- `captureOptions`: CaptureOption[] for capture choices
- `rollToAllocate`: Pending roll value

#### AnimationSlice (`stores/slices/animationSlice.ts`)
Manages animation queue:
- `animationQueue`: AnimationQueueItem[] pending animations
- `isAnimating`: Currently playing animation
- `isFastForwarding`: Fast-forward mode enabled
- `lastProcessedSeq`: Last processed event sequence
- `currentAnimation`: Active animation item
- `animatingTokenIds`: string[] tokens with active animations

#### UiSlice (`stores/slices/uiSlice.ts`)
Manages UI state:
- `diceValue`, `diceRolling`, `rollReason`: Dice state
- `highlightedTokens`, `selectedTokenId`: Token selection
- `showMoveChoiceModal`, `showCaptureChoiceModal`: Modal visibility
- `showVictoryScreen`, `winnerId`, `finalRankings`: Game end
- `turnTransition`: Turn change notification data
- `stackSplitSelection`: Stack split UI state

#### EventLogSlice (`stores/slices/eventLogSlice.ts`)
Manages event history:
- `logEntries`: GameLogEntry[] (max 50 entries)

### Selectors (`stores/selectors.ts`)

40+ memoized selectors provide computed values:

```typescript
// Basic selectors
export const usePhase = () => useGameStore((state) => state.phase)
export const usePlayers = () => useGameStore((state) => state.players)

// Computed selectors
export const useCurrentPlayer = () => useGameStore((state) => {
  const turn = state.currentTurn
  if (!turn) return null
  return state.players.find((p) => p.player_id === turn.player_id) ?? null
})

export const useIsMyTurn = () => useGameStore((state) => {
  return state.currentTurn?.player_id === state.myPlayerId
})

export const useCanRoll = () => useGameStore((state) => {
  return state.currentEvent === 'player_roll' &&
         state.currentTurn?.player_id === state.myPlayerId
})
```

---

## React Contexts

### Provider Hierarchy

```
html
  └── ThemeProvider
      └── AuthProvider
          └── ProfileProvider
              └── children
                  └── Toaster
```

### AuthContext (`contexts/AuthContext.tsx`)

Manages Supabase authentication:

**State:**
- `user: User | null`
- `session: Session | null`
- `isLoading: boolean`

**Methods:**
- `signIn(email, password)`
- `signUp(email, password)`
- `signInWithGoogle()`
- `signOut()`

**Pattern:** Singleton Supabase client via `useRef`

### ProfileContext (`contexts/ProfileContext.tsx`)

Manages user profile data:

**State:**
- `profile: Profile | null`
- `isLoading: boolean`
- `error: Error | null`

**Methods:**
- `updateDisplayName(name)`
- `refreshProfile()`

**Pattern:** AbortController for race condition prevention

### RoomContext (`contexts/RoomContext.tsx`)

Orchestrates room and game state:

**State:**
- `room: RoomSnapshot | null`
- `userId: string | null`
- `isInGame: boolean`
- `isConnected`, `isConnecting`, `connectionError`

**Computed:**
- `isHost`, `isReady`, `canStartGame`

**Methods:**
- `toggleReady()`, `leaveRoom()`, `startGame()`, `sendGameMessage()`

**Responsibilities:**
- Routes WebSocket messages to appropriate handlers
- Coordinates with SequenceManager for event ordering
- Updates Zustand store via `processEvents()` and `applyGameState()`

### ThemeContext (`contexts/ThemeContext.tsx`)

Manages theme state:

**State:**
- `theme: 'light' | 'dark'`
- `mounted: boolean` (hydration flag)

**Methods:**
- `toggleTheme()`

**Storage:** localStorage key `'theme'`

---

## Custom Hooks

### useRoomWebSocket (`hooks/useRoomWebSocket.ts`)

Low-level WebSocket connection management.

**Parameters:**
```typescript
{
  accessToken: string
  roomCode: string
  onConnected?: (room: RoomSnapshot, userId: string) => void
  onRoomUpdated?: (room: RoomSnapshot) => void
  onRoomClosed?: () => void
  onError?: (message: string) => void
  onGameMessage?: (message: object) => void
}
```

**Returns:**
```typescript
{
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  toggleReady: () => void
  leaveRoom: () => void
  disconnect: () => void
  sendGameMessage: (message: object) => void
}
```

**Features:**
- Exponential backoff reconnection (1s base, 30s max, 5 attempts)
- Keepalive ping every 25 seconds
- Callback-in-refs pattern for stable references

### useGameWebSocket (`hooks/useGameWebSocket.ts`)

Game-specific message handling.

**Parameters:**
```typescript
{
  sendMessage: (message: object) => void
  myPlayerId: string | null
  onError?: (message: string) => void
  onStateResync?: () => void
}
```

**Returns:**
```typescript
{
  handleGameMessage: (message: object) => void
  rollDice: (value: number) => void
  selectMove: (tokenOrStackId: string) => void
  selectCaptureChoice: (choice: string) => void
  startGame: () => void
  requestStateResync: () => void
}
```

### usePixiApp (`hooks/usePixiApp.ts`)

Pixi.js application lifecycle management.

**Parameters:**
```typescript
{
  containerRef: React.RefObject<HTMLDivElement>
  onTokenClick?: (tokenId: string) => void
}
```

**Returns:**
```typescript
{
  pixiApp: PixiApp | null
  animationController: AnimationController | null
  isInitialized: boolean
  error: Error | null
}
```

**Features:**
- Async initialization with cancellation
- Store subscription for board/player updates
- Cleanup on unmount

### useAnimationQueue (`hooks/useAnimationQueue.ts`)

Animation queue orchestration.

**Parameters:**
```typescript
{
  animationController: AnimationController | null
  onAnimationComplete?: (event: GameEvent) => void
}
```

**Returns:**
```typescript
{
  skipAll: () => void
  setFastForward: (enabled: boolean) => void
}
```

**Features:**
- Sequential animation playback
- Buffer delays between animations
- Token ID cleanup after animation
- Processing guard to prevent concurrency

---

## Game Rendering

### Pixi.js Architecture

```
PixiApp (main manager)
├── BoardRenderer (static elements)
└── TokenRenderer (dynamic tokens)
    └── AnimationController (event animations)
```

### PixiApp (`lib/pixi/PixiApp.ts`)

Main application manager:
- Initializes Pixi.js with canvas dimensions
- Creates and manages renderers
- Sets up ResizeObserver for responsive sizing
- Subscribes to Zustand store for reactive updates

**Store Subscriptions:**
- Players update → Token re-render
- Board setup update → Geometry update, board re-render
- Highlighted tokens → Visual state update
- Selected token → Selection visual

### BoardRenderer (`lib/pixi/BoardRenderer.ts`)

Renders static board elements:
- Background (beige)
- Home areas (colored corners)
- Track squares (52 white squares)
- Safe spaces (gold stars)
- Homestretch paths (colored squares)
- Center/Heaven area
- Starting markers

### TokenRenderer (`lib/pixi/TokenRenderer.ts`)

Renders tokens with interactions:
- Token sprites with player colors
- Stack badges showing count
- Pulse effect for highlighted tokens
- Selection scale (1.15x)
- Glow effect for interactable tokens

**Animation Methods:**
- `animateTokenMove(tokenId, path, durationPerSquare)`
- `animateExitHell(tokenId, targetPosition)`
- `animateReachHeaven(tokenId)`
- `animateCapture(capturingId, capturedId, returnPos)`

**Stack Split UI:**
- `showStackSplitOptions(options, position, stackHeight, color, onSelect)`

### AnimationController (`lib/pixi/AnimationController.ts`)

Plays event animations:
- Wraps PixiApp and geometry
- Promise-based async/await for sequencing
- Fast-forward mode (0.1x duration)

**Supported Events:**
- dice_rolled, token_moved, token_exited_hell, token_reached_heaven
- token_captured, stack_formed, stack_dissolved, stack_moved

---

## Game Logic

### Event Processing (`lib/game/eventProcessor.ts`)

Processes game events and updates store:

```typescript
export function processEvent(event: GameEvent): void {
  switch (event.event_type) {
    case 'game_started':
      // Set phase, process initial events
      break
    case 'dice_rolled':
      // Queue dice animation, update turn
      break
    case 'token_moved':
      // Update token state, queue movement animation
      break
    // ... other event handlers
  }
}

export function processEvents(events: GameEvent[]): void {
  // Sort by sequence, process in order
  events.sort((a, b) => a.seq - b.seq)
  events.forEach(processEvent)
}

export function applyGameState(state: GameState, myPlayerId: string): void {
  // Full state reconstruction for reconnection
}
```

### Board Geometry (`lib/game/boardGeometry.ts`)

Calculates pixel positions:
- 15x15 grid layout
- 52-square main track
- 6-square homestretch per player
- 4 home positions per player (2x2 grid)

**Key Methods:**
- `getTokenPosition(color, startingIndex, state, progress, tokenIndex)`
- `getMovePath(...)`
- `getSafeSpacePositions()`
- `isSafeSpace(absolutePosition)`

### Legal Move Parser (`lib/game/legalMoveParser.ts`)

Parses server move strings:

```typescript
// Token move: "{player_id}_token_{1-4}"
// Stack split: "{stack_id}:{partial_count}"
// Stack move: "{stack_id}"

export function parseLegalMove(moveId: string): ParsedLegalMove
export function groupLegalMoves(moveIds: string[]): Map<string, ParsedLegalMove[]>
export function getHighlightableTokenIds(moveIds: string[], players: Player[]): string[]
export function findEntityForToken(clickedTokenId: string, players: Player[], legalMoves: string[]): string | null
```

### Sequence Manager (`lib/game/sequenceManager.ts`)

Handles event ordering:

```typescript
class SequenceManager {
  processEvents(events: GameEvent[]): GameEvent[]  // Returns consecutive events
  setGapHandler(handler: GapHandler): void
  hasPendingEvents(): boolean
  reset(newSeq?: number): void
  flushPending(): GameEvent[]
}
```

**Gap Detection:**
- Identifies missing sequence numbers
- Reports `{ expectedSeq, receivedSeq, missingCount }`
- Triggers state resync on gaps

### Constants (`lib/game/constants.ts`)

```typescript
// Animation Durations (ms)
TOKEN_MOVE_DURATION_PER_SQUARE = 300
DICE_ROLL_DURATION = 250
TOKEN_CAPTURE_DURATION = 500
STACK_OPERATION_DURATION = 400
TOKEN_EXIT_HELL_DURATION = 500
TOKEN_REACH_HEAVEN_DURATION = 800

// Board Colors
BOARD_BACKGROUND_COLOR = 0xf5f5dc  // Beige
TRACK_COLOR = 0xffffff            // White
SAFE_SPACE_COLOR = 0xffd700       // Gold
CENTER_COLOR = 0x808080           // Gray

// Z-Layers
Z_BOARD_BACKGROUND = 0
Z_TOKENS_BASE = 10
Z_TOKENS_MOVING = 20
Z_TOKENS_HIGHLIGHTED = 30
Z_EFFECTS = 40
Z_UI_OVERLAY = 50
```

---

## WebSocket Communication

### Connection Flow

```
1. Client connects to ws://localhost:8000/api/v1/ws
2. Client sends: { type: "authenticate", payload: { token, room_code } }
3. Server responds: { type: "authenticated", payload: { room, user_id } }
4. Real-time bidirectional communication begins
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `authenticate` | C → S | Initial auth |
| `authenticated` | S → C | Auth success with room data |
| `room_updated` | S → C | Room state changes |
| `room_closed` | S → C | Host left room |
| `error` | S → C | Error response |
| `ping` / `pong` | Both | Keepalive |
| `start_game` | C → S | Host starts game |
| `game_started` | S → C | Game initialized with state |
| `game_action` | C → S | Player action |
| `game_events` | S → C | Event broadcast |
| `game_state` | S → C | Full state sync |
| `game_error` | S → C | Game error |

### Game Action Format

```typescript
{
  type: "game_action",
  request_id: "uuid",
  payload: {
    action_type: "roll" | "move" | "capture_choice" | "start_game",
    value?: number,            // For roll
    token_or_stack_id?: string, // For move
    choice?: string            // For capture_choice
  }
}
```

### Reconnection Strategy

- **Base delay**: 1 second
- **Max delay**: 30 seconds
- **Max attempts**: 5
- **Backoff formula**: `min(baseDelay * 2^attempt, maxDelay)`
- **Fatal errors** (no reconnect): AUTH_FAILED, AUTH_EXPIRED, ROOM_NOT_FOUND, ROOM_ACCESS_DENIED

---

## Data Flow

### Game Event Flow

```
WebSocket Message
    ↓
RoomContext.onGameMessage()
    ↓
SequenceManager.processEvents() → Gap detection → requestStateResync()
    ↓
processEvents() / processEvent()
    ├─→ Update Zustand store (board, turn, UI state)
    └─→ enqueueAnimations()
            ↓
        AnimationSlice.animationQueue
            ↓
        useAnimationQueue (subscription)
            ↓
        AnimationController.playEventAnimation()
            ↓
        TokenRenderer animations
            ↓
        Update lastProcessedSeq
```

### Token Click Flow

```
User clicks token on canvas
    ↓
TokenRenderer click handler
    ↓
onTokenClick callback (via usePixiApp)
    ↓
GameBoard.handleTokenClick()
    ├─→ Has split options? → TokenRenderer.showStackSplitOptions()
    └─→ Single move → sendGameMessage({ action_type: "move", token_or_stack_id })
            ↓
        WebSocket → Backend
            ↓
        game_events broadcast
            ↓
        [Game Event Flow]
```

### Authentication Flow

```
User submits credentials
    ↓
AuthContext.signIn/signUp/signInWithGoogle
    ↓
Supabase Auth
    ├─→ OAuth: Redirect → /auth/callback → exchangeCodeForSession
    └─→ Email/Password: Direct session creation
            ↓
        AuthContext.onAuthStateChange
            ↓
        Update user/session state
            ↓
        ProfileContext.useEffect → Fetch profile
            ↓
        Ready for protected routes
```

---

## Component Architecture

### Component Organization

```
components/
├── auth/          # Authentication flows
├── game/          # In-game UI
├── landing/       # Marketing pages
├── lobby/         # Pre-game lobby
├── room/          # Room setup
└── ThemeToggle.tsx
```

### Key Component Relationships

```
RoomPage (/room/[code])
├── RoomProvider
│   └── (when room.status === 'in_game')
│       └── GameBoard
│           ├── GameCanvas
│           │   └── usePixiApp → PixiApp
│           ├── GameHUD
│           ├── DicePanel
│           ├── EventLog
│           ├── CaptureChoiceModal
│           ├── VictoryScreen
│           └── TurnTransitionToast
│   └── (when room.status !== 'in_game')
│       └── SeatCard (multiple)
```

### Component Patterns

#### Modal Pattern
All modals follow a consistent pattern:
- Fixed overlay with backdrop
- Click-outside detection
- Escape key handling
- Loading and error states
- Focus management

#### Color Mapping Pattern
```typescript
function getColorClass(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
  }
  return colorMap[color] || 'bg-gray-500'
}
```

#### Callback Ref Pattern
Used throughout hooks to maintain fresh callbacks without triggering re-renders:
```typescript
const onTokenClickRef = useRef(onTokenClick)
useEffect(() => {
  onTokenClickRef.current = onTokenClick
}, [onTokenClick])
```

---

## Performance Considerations

### Animation State Tracking

`animatingTokenIds` in AnimationSlice prevents position updates during animations:

```typescript
// In PixiApp store subscription
useGameStore.subscribe(
  (state) => state.players,
  (players) => {
    const animatingIds = useGameStore.getState().animatingTokenIds
    // Skip updating tokens that are animating
    tokenRenderer.updateTokens(players, animatingIds)
  }
)
```

### Memoized Selectors

All derived state uses selectors from `stores/selectors.ts` to prevent unnecessary re-renders:

```typescript
// Instead of computing in component
const isMyTurn = currentTurn?.player_id === myPlayerId

// Use memoized selector
const isMyTurn = useIsMyTurn()
```

### Store Subscriptions

Use `subscribeWithSelector` middleware for fine-grained updates:

```typescript
useGameStore.subscribe(
  (state) => state.highlightedTokens,
  (highlighted) => tokenRenderer.setHighlighted(highlighted),
  { equalityFn: shallow }
)
```
