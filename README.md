# Ludo Stacked Frontend

Frontend for the Ludo Stacked game. Ludo Stacked is a variation of the popular game known as Ludo or Pachisi. The game introduces new fun rules that take strategy to the next level and increase the importance of each player decision.

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project with authentication enabled

### Environment Setup

Copy the example environment file and configure your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project values (from https://app.supabase.com/project/_/settings/api):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS v4
- **State Management**: Zustand with Immer middleware
- **Game Rendering**: Pixi.js 8
- **Authentication**: Supabase Auth
- **Real-time**: WebSocket for game state synchronization
- **Notifications**: Sonner for toast notifications

## Project Structure

```
app/
├── (auth)/                    # Public auth pages
│   ├── signin/page.tsx        # Sign in page
│   ├── signup/page.tsx        # Sign up page
│   └── layout.tsx             # Centered card layout
├── (protected)/               # Authenticated routes
│   ├── lobby/page.tsx         # Game lobby
│   ├── room/[code]/page.tsx   # Dynamic room/game page
│   └── layout.tsx             # Auth guard layout
├── api/auth/me/route.ts       # User info API endpoint
├── auth/callback/route.ts     # OAuth callback handler
├── layout.tsx                 # Root layout with providers
├── page.tsx                   # Landing page
└── globals.css                # Global styles & CSS variables

components/
├── auth/                      # Authentication components
│   ├── SignInForm.tsx
│   ├── SignUpForm.tsx
│   └── GoogleSignInButton.tsx
├── game/                      # Game UI components
│   ├── GameBoard.tsx          # Main game orchestration
│   ├── GameCanvas.tsx         # Pixi.js canvas wrapper
│   ├── GameHUD.tsx            # Turn info & player progress
│   ├── DicePanel.tsx          # Dice rolling interface
│   ├── EventLog.tsx           # Game event history
│   ├── MoveChoiceModal.tsx    # Token selection modal
│   ├── CaptureChoiceModal.tsx # Capture/stack choice modal
│   ├── VictoryScreen.tsx      # Game end screen
│   └── TurnTransitionToast.tsx # Turn change notifications
├── landing/                   # Landing page components
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── HowItWorks.tsx
│   ├── Footer.tsx
│   └── StackVisual.tsx
├── lobby/                     # Lobby components
│   ├── LobbyActions.tsx       # Create/join room cards
│   ├── CreateRoomModal.tsx    # Room creation modal
│   ├── JoinRoomModal.tsx      # Room join modal
│   ├── ProfileDropdown.tsx    # User profile menu
│   └── EditProfileModal.tsx   # Display name editor
├── room/                      # Room components
│   └── SeatCard.tsx           # Player seat display
└── ThemeToggle.tsx            # Dark/light mode toggle

contexts/
├── AuthContext.tsx            # Authentication state & methods
├── ProfileContext.tsx         # User profile management
├── RoomContext.tsx            # Room state & game coordination
└── ThemeContext.tsx           # Theme persistence

hooks/
├── useRoomWebSocket.ts        # WebSocket connection management
├── useGameWebSocket.ts        # Game-specific message handling
├── usePixiApp.ts              # Pixi.js lifecycle management
└── useAnimationQueue.ts       # Animation sequencing

lib/
├── api/
│   └── client.ts              # Backend API client
├── game/                      # Game logic utilities
│   ├── constants.ts           # Animation durations, colors, Z-layers
│   ├── boardGeometry.ts       # Board position calculations
│   ├── eventProcessor.ts      # Game event handling
│   ├── eventLogUtils.ts       # Event log formatting
│   ├── legalMoveParser.ts     # Move validation & parsing
│   └── sequenceManager.ts     # Event sequence management
├── pixi/                      # Pixi.js rendering
│   ├── PixiApp.ts             # Main application manager
│   ├── BoardRenderer.ts       # Board rendering
│   ├── TokenRenderer.ts       # Token & stack rendering
│   └── AnimationController.ts # Animation playback
└── supabase/
    ├── client.ts              # Browser Supabase client
    └── server.ts              # Server Supabase client

stores/
├── gameStore.ts               # Combined Zustand store
├── selectors.ts               # Memoized store selectors
└── slices/                    # Store slices
    ├── boardSlice.ts          # Board & player state
    ├── turnSlice.ts           # Turn & roll state
    ├── animationSlice.ts      # Animation queue
    ├── uiSlice.ts             # UI state (modals, highlights)
    └── eventLogSlice.ts       # Event log state

types/
├── game.ts                    # Game state, events, animations
├── auth.ts                    # Authentication types
├── profile.ts                 # User profile types
└── room.ts                    # Room & WebSocket types

specs/                         # Game specification documents
├── rolls_granted.md           # Roll mechanics documentation
└── ...
```

## Authentication

This frontend uses Supabase Auth with support for:

- Email/password authentication
- Google OAuth

### Google OAuth Setup

Configure these URLs in Google Cloud Console:
- JavaScript Origin: `http://localhost:3000`
- Redirect URI: `https://<project>.supabase.co/auth/v1/callback`
- Redirect URI: `http://localhost:3000/auth/callback`

## Game Features

### Core Gameplay
- **Token Stacking**: Stack your tokens together for strategic advantage
- **Stack Movement**: Stacks move roll/height squares (e.g., roll 6 with 2-stack = move 3)
- **Captures**: Equal or greater stack heights can capture opponent tokens
- **Safe Spaces**: Protected positions where tokens cannot be captured
- **Bonus Rolls**: Rolling 6 or capturing tokens grants extra rolls

### UI Features
- **Real-time Board**: Pixi.js-powered game board with smooth animations
- **Animation Queue**: Sequential playback of game events
- **Event Log**: Scrolling history of game events
- **Turn Transitions**: Toast notifications for turn changes
- **Victory Screen**: Game end display with final rankings

## Backend Integration

### REST API Communication

The frontend communicates with the backend via `lib/api/client.ts`:
- Authentication via Bearer token (from Supabase session)
- Profile endpoints (`GET /api/v1/profile`, `PATCH /api/v1/profile`)
- Room endpoints (`POST /api/v1/rooms`, `POST /api/v1/rooms/join`)
- Request timeout (30 seconds default, configurable via `timeoutMs`)
- Request cancellation via AbortController support

### WebSocket Communication

Real-time game updates via WebSocket:
- **Endpoint**: `ws://localhost:8000/api/v1/ws`
- **Authentication**: Token sent in message payload after connection
- **Reconnection**: Exponential backoff (1s base, 30s max, 5 attempts)
- **Keepalive**: Ping/pong every 25 seconds

#### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `authenticate` | Client → Server | Initial auth with token and room code |
| `game_action` | Client → Server | Player actions (roll, move, capture_choice) |
| `game_events` | Server → Client | Game event broadcasts |
| `game_state` | Server → Client | Full state sync on reconnect |
| `game_error` | Server → Client | Error responses |
| `room_updated` | Server → Client | Room state changes |

## State Management

### Zustand Store

Game state is managed via a centralized Zustand store with 5 slices:

| Slice | Purpose |
|-------|---------|
| `BoardSlice` | Game phase, players, tokens, stacks, board setup |
| `TurnSlice` | Current turn, legal moves, capture options, rolls |
| `AnimationSlice` | Animation queue, animating token tracking |
| `UiSlice` | Dice state, highlights, modals, victory screen |
| `EventLogSlice` | Game event history (max 50 entries) |

### Selectors

40+ memoized selectors in `stores/selectors.ts`:
- `usePhase`, `usePlayers`, `useCurrentTurn`
- `useCurrentPlayer`, `useIsMyTurn`, `useMyPlayer`
- `useCanRoll`, `useNeedsMoveSelection`, `useNeedsCaptureChoice`
- `useTokenById`, `useStackById`
- And many more...

## UI Features

- **Theme System**: Light/dark mode with localStorage persistence
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Updates**: WebSocket-powered live game state
- **User Selection**: Text selection disabled by default, enabled for inputs
- **Cursor Management**: Proper cursor states for interactive elements

## Development

### Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Run production server
npm run lint      # Run ESLint
```

### Code Conventions

- Path alias: `@/*` maps to project root
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling
- Roboto Mono font (monospace)
- Light theme default, dark mode via `.dark` class

### Accent Colors

Use CSS variable-based accent colors instead of hardcoded values:
- `bg-accent`, `hover:bg-accent-hover`
- `text-accent`, `focus:ring-accent`

Configured in `app/globals.css` via `--accent` and `--accent-hover` CSS variables.

## Documentation

### Architecture & Reference
- `docs/ARCHITECTURE.md` - Comprehensive technical architecture documentation
- `docs/COMPONENTS.md` - Detailed component reference guide
- `CLAUDE.md` - Project guidelines for Claude Code

### Specifications
- `frontend_game_integration.md` - WebSocket protocol and game events
- `game_start_implementation.md` - Game start flow
- `specs/rolls_granted.md` - Roll mechanics specification

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Pixi.js Documentation](https://pixijs.com/guides)
