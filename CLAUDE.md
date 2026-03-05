# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontend for Ludo Stacked, a strategic variation of the classic Ludo/Pachisi board game. Built with Next.js 16, React 19, Supabase for authentication, Zustand for state management, and Pixi.js for game rendering.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Architecture

### Authentication Flow

The app uses Supabase Auth with two client types:

- **Browser client** (`lib/supabase/client.ts`): Singleton pattern, used in client components via `createClient()`
- **Server client** (`lib/supabase/server.ts`): Cookie-based, async `createClient()` for server components and API routes

Authentication state is managed through `AuthContext` (`contexts/AuthContext.tsx`) which provides:
- `useAuth()` hook for accessing user/session state
- Methods: `signIn`, `signUp`, `signInWithGoogle`, `signOut`

OAuth callback handling: `app/auth/callback/route.ts` exchanges auth codes for sessions.

### Route Groups

- `(auth)/` - Public auth pages (signin, signup) with shared layout
- `(protected)/` - Authenticated routes; layout redirects unauthenticated users to `/signin`
  - `/lobby` - Main lobby with create/join room options
  - `/room/[code]` - Dynamic room page for game sessions

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Integration

A separate FastAPI backend exists. Backend runs on http://localhost:8000 with API docs at `/docs`. The frontend and backend both use Supabase Auth - frontend handles OAuth flows, backend validates JWTs via JWKS.

**API Client** (`lib/api/client.ts`): Creates authenticated requests to the backend using the Supabase session access token. Use `createApiClient({ accessToken })` to get a client with `get()`, `post()`, and `patch()` methods.

- Supports configurable timeout via `timeoutMs` option (default: 30 seconds)
- Supports request cancellation via optional `signal` parameter
- Example: `client.get('/path', { signal: controller.signal })`

### State Management

#### Zustand Game Store (`stores/gameStore.ts`)

The game state is managed via a Zustand store with 5 slices combined using `immer` middleware:

- **BoardSlice** (`stores/slices/boardSlice.ts`): Game phase, players, tokens, stacks, board setup
- **TurnSlice** (`stores/slices/turnSlice.ts`): Current turn, legal moves, capture options, rolls
- **AnimationSlice** (`stores/slices/animationSlice.ts`): Animation queue, animating token tracking
- **UiSlice** (`stores/slices/uiSlice.ts`): Dice state, highlights, modals, victory screen
- **EventLogSlice** (`stores/slices/eventLogSlice.ts`): Game event history

**Selectors** (`stores/selectors.ts`): Provides 40+ memoized selectors for computed values like `useCurrentPlayer`, `useIsMyTurn`, `useCanRoll`, etc.

#### React Contexts

- **AuthContext**: User authentication state and methods
- **ProfileContext**: User profile with AbortController for race condition prevention
- **RoomContext**: Room state, WebSocket coordination, game message routing
- **ThemeContext**: Light/dark theme with localStorage persistence

### WebSocket Communication

**useRoomWebSocket** (`hooks/useRoomWebSocket.ts`): Manages WebSocket lifecycle for room updates
- Exponential backoff reconnection (1s base, 30s max, 5 attempts)
- Keepalive ping every 25 seconds
- Token-based authentication via message payload

**RoomContext**: Routes game messages and coordinates with:
- `processEvents()` for game event processing
- `applyGameState()` for full state reconstruction
- `SequenceManager` for event ordering and gap detection

### Game Rendering (Pixi.js)

Located in `lib/pixi/`:

- **PixiApp.ts**: Main application manager, initializes renderers, subscribes to store changes
- **BoardRenderer.ts**: Renders static board elements (track, safe spaces, home areas, homestretch)
- **TokenRenderer.ts**: Token visualization with pulse effects, stack badges, animations
- **AnimationController.ts**: Plays visual animations for game events

**usePixiApp** (`hooks/usePixiApp.ts`): Manages Pixi.js lifecycle in React

**useAnimationQueue** (`hooks/useAnimationQueue.ts`): Orchestrates sequential animation playback

### Game Logic

Located in `lib/game/`:

- **eventProcessor.ts**: Processes game events, updates store, queues animations
- **boardGeometry.ts**: Calculates pixel positions for board squares (15x15 grid)
- **legalMoveParser.ts**: Parses legal move strings, handles stack splitting
- **sequenceManager.ts**: Manages event sequencing and gap detection
- **eventLogUtils.ts**: Formats events for display in event log
- **constants.ts**: Animation durations, board colors, Z-layers

### Profile Management

Profile state is managed through `ProfileContext` (`contexts/ProfileContext.tsx`) which provides:
- `useProfile()` hook for accessing profile state
- `profile`: User's profile data (id, display_name, avatar_url)
- `isLoading`, `error`: Loading and error states
- `updateDisplayName(name)`: Update the user's display name (validates non-empty, max 50 chars)
- `refreshProfile()`: Refetch profile from backend

The profile is automatically fetched when a user session exists. The context uses AbortController to prevent race conditions between concurrent fetches and updates.

### Theming

The app uses class-based dark mode with light as the default theme:

- **ThemeContext** (`contexts/ThemeContext.tsx`): Manages theme state and localStorage persistence
- **ThemeToggle** (`components/ThemeToggle.tsx`): Sun/moon toggle button
- Dark mode is activated by adding `.dark` class to `<html>` element
- Use `dark:` Tailwind prefix for dark mode styles
- **Light theme is the default** - new pages should look good in light mode first

## Code Conventions

- Path alias: `@/*` maps to project root
- Tailwind CSS v4 for styling
- TypeScript strict mode enabled
- Default theme: Light mode (dark mode available via toggle)
- **Font**: Roboto Mono (monospace) - configured in `app/layout.tsx`
- **Accent color**: Use `bg-accent`, `hover:bg-accent-hover`, `text-accent`, `focus:ring-accent` instead of hardcoded blue values. The accent color is configurable in `app/globals.css` via `--accent` and `--accent-hover` CSS variables.

## Key Patterns

### Callback Ref Pattern
Used throughout hooks to keep callbacks fresh without triggering re-renders:
- `useRoomWebSocket`: All callbacks stored in refs
- `usePixiApp`: `onTokenClickRef` for token click handler
- `useAnimationQueue`: `onCompleteRef` for completion callback

### Animation State Tracking
`animatingTokenIds` in AnimationSlice prevents position updates during animations to avoid visual glitches.

### Sequence Manager
Detects gaps in event sequences and triggers state resync when needed.

## Documentation

### Architecture & Reference
- `docs/ARCHITECTURE.md` - Comprehensive technical architecture
- `docs/COMPONENTS.md` - Component reference guide

### Specifications
- `frontend_game_integration.md` - WebSocket protocol, game events, animation guide
- `game_start_implementation.md` - Game start flow documentation
- `specs/rolls_granted.md` - Roll granted event specification
