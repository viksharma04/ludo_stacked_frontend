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

## Project Structure

```
app/
├── (auth)/              # Public auth pages (signin, signup)
├── (protected)/         # Authenticated routes (lobby, room)
│   ├── lobby/           # Lobby page
│   └── room/[code]/     # Dynamic room page
├── api/auth/            # API routes for auth
├── auth/callback/       # OAuth callback handler
├── layout.tsx           # Root layout with providers
└── page.tsx             # Landing page
components/
├── auth/                # Auth-related components
├── landing/             # Landing page components
├── lobby/               # Lobby components (ProfileDropdown, LobbyActions, modals)
│   ├── CreateRoomModal.tsx
│   ├── EditProfileModal.tsx
│   ├── JoinRoomModal.tsx
│   ├── LobbyActions.tsx
│   └── ProfileDropdown.tsx
└── room/                # Room components
    └── SeatCard.tsx     # Player seat display
contexts/
├── AuthContext.tsx      # Authentication state management
├── ProfileContext.tsx   # User profile state management
├── RoomContext.tsx      # Room state management
└── ThemeContext.tsx     # Theme state management
hooks/
└── useRoomWebSocket.ts  # WebSocket hook for real-time room updates
lib/
├── api/
│   └── client.ts        # Backend API client
└── supabase/
    ├── client.ts        # Browser Supabase client
    └── server.ts        # Server Supabase client
types/
├── auth.ts              # Auth type definitions
├── profile.ts           # Profile type definitions
└── room.ts              # Room and WebSocket type definitions
specs/
├── backend_room_logic.md          # Room endpoints documentation
└── backend_room_logic_schemas.md  # Room schema reference
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

## Backend

This frontend works with a separate FastAPI backend running on http://localhost:8000.

### REST API Communication

The frontend communicates with the backend via `lib/api/client.ts`, which handles:
- Authentication via Bearer token (from Supabase session)
- Profile endpoints (`GET /api/v1/profile`, `PATCH /api/v1/profile`)
- Room endpoints (`POST /api/v1/rooms`, `POST /api/v1/rooms/join`)
- Request timeout (30 seconds default, configurable via `timeoutMs`)
- Request cancellation via AbortController support

### WebSocket Communication

The frontend uses WebSockets for real-time room updates:
- WebSocket endpoint: `ws://localhost:8000/api/v1/ws`
- Authentication via message after connection (not query parameters):
  1. Connect to WebSocket endpoint
  2. Send `authenticate` message with `token` and `room_code` in payload
  3. Receive `authenticated` response on success or `error` on failure
- Managed by `useRoomWebSocket` hook
- Supports automatic reconnection with exponential backoff
- Heartbeat/keepalive via ping/pong messages (works before authentication)
- Real-time updates for player connections, ready states, and room status

### Room Features

- **Create Room**: Create a new game room for 2-4 players
- **Join Room**: Join an existing room using a 6-character code
- **Room Lobby**: 
  - Real-time player status display
  - Connection indicators for each player
  - Host designation and controls
  - Ready/Not Ready system
  - Host can start game when all players are ready
  - Room closes when host leaves
- **Room Navigation**: Dynamic routing (`/room/[code]`)

## UI Features

- **Theme System**: Light/dark mode with system detection
- **Cursor Management**: Proper cursor states for interactive elements via `.btn` class
- **User Selection**: Text selection disabled by default, enabled for input fields
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Updates**: WebSocket-powered live room state

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
