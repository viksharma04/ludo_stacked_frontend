# Component Reference

This document provides a detailed reference for all React components in the Ludo Stacked Frontend.

## Table of Contents

1. [Game Components](#game-components)
2. [Authentication Components](#authentication-components)
3. [Lobby Components](#lobby-components)
4. [Room Components](#room-components)
5. [Landing Page Components](#landing-page-components)
6. [Utility Components](#utility-components)

---

## Game Components

Located in `components/game/`

### GameBoard

**File:** `GameBoard.tsx`

Main game orchestration component that manages the entire game UI.

**Props:**
```typescript
interface GameBoardProps {
  sendMessage: (message: {
    type: string
    request_id?: string
    payload?: unknown
  }) => void
  myPlayerId: string
  onReturnToLobby?: () => void
}
```

**Responsibilities:**
- Initializes and manages PixiApp and AnimationController
- Handles token click events with stack split selection
- Manages game modals (capture choice, victory screen)
- Coordinates animation overlays and penalty animations
- Three-column layout: canvas, HUD, dice panel, event log

**Key Methods:**
- `handleTokenClick(tokenId)` - Processes token selection, shows split options if needed
- `handlePixiInitialized(pixiApp, controller)` - Stores Pixi instances
- `handleReturnToLobby()` - Navigation handler

**Store Dependencies:**
- `usePlayers`, `useCurrentTurn`, `usePhase`
- `useLegalMoves`, `useShowCaptureChoiceModal`
- `useShowVictoryScreen`, `useStackSplitSelection`

---

### GameCanvas

**File:** `GameCanvas.tsx`

Canvas wrapper for Pixi.js game rendering.

**Props:**
```typescript
interface GameCanvasProps {
  onTokenClick?: (tokenId: string) => void
  onInitialized?: (pixiApp: PixiApp, animationController: AnimationController) => void
  className?: string
}
```

**Features:**
- Initializes Pixi app via `usePixiApp()` hook
- Sets up animation queue processing via `useAnimationQueue()`
- Shows loading spinner during initialization
- Displays error messages on failure
- Prevents default touch actions for mobile

---

### GameHUD

**File:** `GameHUD.tsx`

Displays current turn information and player progress.

**Props:**
```typescript
interface GameHUDProps {
  className?: string
}
```

**Features:**
- Current turn indicator with player color
- Progress bars for each player (tokens in heaven)
- Player names with colored indicators
- "It's your turn!" message when applicable
- "Playing..." during animations

**Store Dependencies:**
- `usePlayers`, `useCurrentTurn`, `useMyPlayerId`
- `useIsAnimating`

---

### DicePanel

**File:** `DicePanel.tsx`

Dice rolling interface with visual feedback.

**Props:**
```typescript
interface DicePanelProps {
  onRoll: (value: number) => void
  className?: string
}
```

**Features:**
- SVG dice face visualization (1-6 dots)
- Animated rolling state
- Pending rolls display
- Bonus roll messages ("You rolled a 6!", "Capture bonus!")
- Player color-based button styling
- Waiting indicator for opponent turns
- Move selection indicator

**Store Dependencies:**
- `useDiceValue`, `useDiceRolling`, `useRollReason`
- `useCanRoll`, `useCurrentPlayer`, `useIsMyTurn`
- `useNeedsMoveSelection`, `useRollToAllocate`

---

### EventLog

**File:** `EventLog.tsx`

Displays scrolling game event history.

**Props:** None

**Features:**
- Auto-scroll to newest entries
- Severity-based color coding:
  - Info: slate background
  - Success: green background
  - Warning: amber background
  - Danger: red background
- Player color left borders
- Relative time display ("5s ago", "2m ago")
- Max height with overflow scrolling
- Empty state message

**Store Dependencies:**
- `useLogEntries`

---

### MoveChoiceModal

**File:** `MoveChoiceModal.tsx`

Modal for selecting which token/stack to move (fallback UI).

**Props:**
```typescript
interface MoveChoiceModalProps {
  onSelectMove: (tokenId: string) => void
}
```

**Features:**
- Displays current roll value
- Lists legal moves
- Backdrop click to close
- Escape key support
- Token/Stack naming from move IDs

**Note:** This is a fallback UI; the main flow uses direct board interaction.

---

### CaptureChoiceModal

**File:** `CaptureChoiceModal.tsx`

Modal for choosing between stacking or capturing opponent tokens.

**Props:**
```typescript
interface CaptureChoiceModalProps {
  onSelectChoice: (choice: 'stack' | 'capture' | string) => void
}
```

**Features:**
- Three option types with distinct styling:
  - **Stack** (blue): Join with own token
  - **Capture** (red): Send enemy token back
  - **Custom** (gray): Other options
- Icons with color-coded borders
- Descriptions for each option
- Backdrop and escape key support

**Store Dependencies:**
- `useCaptureOptions`, `useShowCaptureChoiceModal`

---

### VictoryScreen

**File:** `VictoryScreen.tsx`

Game completion screen with final rankings.

**Props:**
```typescript
interface VictoryScreenProps {
  onPlayAgain?: () => void
  onReturnToLobby?: () => void
}
```

**Features:**
- Trophy emoji and victory announcement
- Winner announcement with color indicator
- Final rankings with emoji medals (first three)
- Player color indicators
- "You" indicator for current player
- Optional "Play Again" button
- "Return to Lobby" button
- Centered modal with backdrop

**Store Dependencies:**
- `usePlayers`, `useWinnerId`, `useFinalRankings`, `useMyPlayerId`

---

### TurnTransitionToast

**File:** `TurnTransitionToast.tsx`

Toast notification for turn changes.

**Props:** None

**Features:**
- Animated slide-in animation
- Player color styling (4 color options)
- Pulsing border indicators
- "Your Turn!" vs "{PlayerName}'s Turn"
- Additional message for own turn
- Fixed position at top center
- Auto-dismiss after duration

**Store Dependencies:**
- `useTurnTransition`

---

## Authentication Components

Located in `components/auth/`

### SignInForm

**File:** `SignInForm.tsx`

Email/password sign in form.

**Props:** None

**Features:**
- Email and password inputs
- Form validation
- Error state display
- Loading state with disabled button
- Link to signup page
- Auto-redirect to `/lobby` on success

**Context Dependencies:**
- `useAuth()` - signIn method

---

### SignUpForm

**File:** `SignUpForm.tsx`

User registration form.

**Props:** None

**Features:**
- Email, password, and confirm password fields
- Client-side validation:
  - Password minimum 6 characters
  - Password confirmation matching
- Success state with confirmation email message
- Link to signin page
- Form error display

**Context Dependencies:**
- `useAuth()` - signUp method

---

### GoogleSignInButton

**File:** `GoogleSignInButton.tsx`

OAuth sign-in button with Google.

**Props:** None

**Features:**
- Google logo SVG
- Loading state management
- Disabled state during auth
- Full-width responsive button

**Context Dependencies:**
- `useAuth()` - signInWithGoogle method

---

## Lobby Components

Located in `components/lobby/`

### LobbyActions

**File:** `LobbyActions.tsx`

Main lobby interface with create/join room options.

**Props:** None

**Features:**
- Two action cards in responsive grid
- Create Room card with modal trigger
- Join Room card with modal trigger
- Icon-based visual design
- Hover effects with arrow animation

---

### CreateRoomModal

**File:** `CreateRoomModal.tsx`

Modal for creating new game rooms.

**Props:**
```typescript
interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
}
```

**Features:**
- Player count selection (2, 3, 4)
- Radio button interface
- API integration via `createApiClient`
- Loading and error states
- Escape key support
- Auto-reset on open
- Routes to `/room/{code}` on success

**API Call:**
```typescript
POST /api/v1/rooms
Body: { n_players: 2 | 3 | 4 }
```

---

### JoinRoomModal

**File:** `JoinRoomModal.tsx`

Modal for joining existing rooms with code.

**Props:**
```typescript
interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
}
```

**Features:**
- 6-character room code input
- Auto-uppercase and character filtering
- Real-time validation (`/^[A-Z0-9]{6}$/`)
- Character counter (0/6)
- Enter key submission
- API integration
- Error handling
- Auto-focus on open
- Routes to `/room/{code}` on success

**API Call:**
```typescript
POST /api/v1/rooms/join
Body: { code: string }
```

---

### ProfileDropdown

**File:** `ProfileDropdown.tsx`

User profile menu with account options.

**Props:** None

**Features:**
- Circular avatar button with initials/image
- Dropdown menu with:
  - Display name
  - Email
  - Edit Profile option
  - Theme toggle
  - Sign Out
- Click-outside detection
- Escape key support
- Image error handling with fallback initials
- Auto-refresh avatar on URL change

**Context Dependencies:**
- `useAuth()`, `useProfile()`, `useTheme()`

---

### EditProfileModal

**File:** `EditProfileModal.tsx`

Modal for updating user profile display name.

**Props:**
```typescript
interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}
```

**Features:**
- Display name input
- Character limit: 50 characters
- Character counter (x/50)
- Validation (non-empty, max 50)
- Keyboard submission (Enter)
- Loading and error states
- Auto-focus on open

**Context Dependencies:**
- `useProfile()` - updateDisplayName method

---

## Room Components

Located in `components/room/`

### SeatCard

**File:** `SeatCard.tsx`

Individual seat display in room lobby.

**Props:**
```typescript
interface SeatCardProps {
  seat: SeatSnapshot | null
  seatIndex: number
  isCurrentUser: boolean
}
```

**Features:**

**Empty Seat:**
- Dashed border
- "Waiting for player..." message
- User placeholder icon

**Occupied Seat:**
- Connection status indicator (green dot)
- Host badge with shield icon (if host)
- Ready/Not Ready status badge
- Player avatar with first initial
- Display name or "Player {index}"
- Highlight for current user (accent color border)
- "(you)" indicator

---

## Landing Page Components

Located in `components/landing/`

### Hero

**File:** `Hero.tsx`

Main landing page hero section.

**Props:** None

**Features:**
- Title "Ludo Stacked" with tagline
- Stack visualization component
- Auth-aware CTA buttons:
  - "Play Now" for authenticated users
  - "Sign Up" / "Sign In" for unauthenticated users
- Loading skeleton during auth check

**Context Dependencies:**
- `useAuth()`

---

### Features

**File:** `Features.tsx`

Highlights game features with visual cards.

**Props:** None

**Features:** 4 feature cards:
1. **Stack Your Pieces** - Build powerful stacks
2. **Strategic Movement** - Dice roll / stack height mechanic
3. **Capture Enemies** - Equal/greater height captures
4. **Hop & Capture** - Jump over stacks

Uses emoji icons with responsive grid (1 col mobile, 2 col desktop)

---

### HowItWorks

**File:** `HowItWorks.tsx`

Step-by-step tutorial section.

**Props:** None

**Steps:**
1. Create Stacks
2. Calculate Movement
3. Make Tough Choices
4. Dominate & Win

Numbered circles with descriptions in 4-column responsive grid

---

### StackVisual

**File:** `StackVisual.tsx`

Visual demonstration of token stacking.

**Props:** None

**Features:**
- Shows single token, stack of 2, stack of 3
- Overlapping circles with shadow effects
- Height labels
- Color gradient visualization (lighter at top)
- Responsive spacing

---

### Footer

**File:** `Footer.tsx`

Page footer.

**Props:** None

**Features:**
- Coffee donation link (BuyMeACoffee)
- Copyright notice with dynamic year
- Responsive text sizing
- Dark mode support

---

## Utility Components

### ThemeToggle

**File:** `components/ThemeToggle.tsx`

Dark/light mode toggle button.

**Props:** None

**Features:**
- Sun/moon SVG icons
- Hydration-safe rendering with mounted check
- Smooth theme transitions
- Accessible with aria-label

**Context Dependencies:**
- `useTheme()`

---

## Component Patterns

### Modal Pattern

All modals follow a consistent implementation:

```typescript
// Common modal structure
<>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6">
        {/* Header, body, footer */}
      </div>
    </div>
  )}
</>
```

**Common features:**
- Click-outside to close
- Escape key listener
- Focus management
- Loading states
- Error display

### Color Mapping

Player colors are consistently mapped:

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

function getColorBorderClass(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: 'border-red-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    yellow: 'border-yellow-400',
  }
  return colorMap[color] || 'border-gray-500'
}
```

### Loading State Pattern

```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

async function handleSubmit() {
  setIsLoading(true)
  setError(null)

  try {
    await someAsyncOperation()
    // Success handling
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    setIsLoading(false)
  }
}

// In JSX
<button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
{error && <p className="text-red-500">{error}</p>}
```

### Keyboard Event Handling

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [onClose, isLoading])
```
