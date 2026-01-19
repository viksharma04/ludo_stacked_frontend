# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontend for Ludo Stacked, a strategic variation of the classic Ludo/Pachisi board game. Built with Next.js 16, React 19, and Supabase for authentication.

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
  - `/lobby` - Main lobby with create/join room actions
  - `/room/[code]` - Room lobby page (dynamic route with room code)

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Integration

A separate FastAPI backend exists (documented in `backend-readme.md`). Backend runs on http://localhost:8000 with API docs at `/docs`. The frontend and backend both use Supabase Auth - frontend handles OAuth flows, backend validates JWTs via JWKS.

**API Client** (`lib/api/client.ts`): Creates authenticated requests to the backend using the Supabase session access token. Use `createApiClient({ accessToken })` to get a client with `get()` and `patch()` methods.

- Supports configurable timeout via `timeoutMs` option (default: 30 seconds)
- Supports request cancellation via optional `signal` parameter on `get()` and `patch()`
- Example: `client.get('/path', { signal: controller.signal })`

### Profile Management

Profile state is managed through `ProfileContext` (`contexts/ProfileContext.tsx`) which provides:
- `useProfile()` hook for accessing profile state
- `profile`: User's profile data (id, display_name, avatar_url)
- `isLoading`, `error`: Loading and error states
- `updateDisplayName(name)`: Update the user's display name (validates non-empty, max 50 chars)
- `refreshProfile()`: Refetch profile from backend

The profile is automatically fetched when a user session exists. The context uses AbortController to prevent race conditions between concurrent fetches and updates.

### WebSocket Integration

Real-time features use WebSocket connection managed through `WebSocketContext` (`contexts/WebSocketContext.tsx`):

**WebSocket Client** (`lib/websocket/client.ts`):
- Connects to `ws(s)://<API_URL>/api/v1/ws?token=<jwt>`
- Heartbeat: Sends `ping` every 30 seconds
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s max)
- Request/response pattern using `request_id` (UUID) for matching

**WebSocketContext** provides:
- `useWebSocket()` hook for accessing connection state
- `status`: Connection status (`'disconnected' | 'connecting' | 'connected' | 'error'`)
- `currentRoom`: Current room data (if in a room)
- `createRoom(maxPlayers)`: Creates a new room, returns `Room` object
- `disconnect()`: Manually disconnect

**Message Types** (`types/websocket.ts`):
- `MessageType` enum with all message types
- `IncomingMessage` / `OutgoingMessage` union types
- Individual message interfaces (e.g., `CreateRoomMessage`, `CreateRoomOkMessage`)

### Room System

Rooms are game sessions where players gather before starting. See `docs/rooms.md` for details.

**Room type** (`types/room.ts`):
```typescript
interface Room {
  room_id: string    // Internal UUID
  code: string       // 6-character shareable code
  seat_index: number // Player's seat (0-3)
  is_host: boolean   // Whether player is room host
}
```

**useCreateRoom hook** (`hooks/useCreateRoom.ts`): Wraps WebSocket context for UI integration
- `createRoom(maxPlayers)`: Create a room
- `isCreating`, `error`: Loading/error states
- `isConnected`, `connectionStatus`: Connection state

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
