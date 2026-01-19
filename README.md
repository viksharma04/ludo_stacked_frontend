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
│   └── room/[code]/     # Room lobby page
├── api/auth/            # API routes for auth
├── auth/callback/       # OAuth callback handler
├── layout.tsx           # Root layout with providers
└── page.tsx             # Landing page
components/
├── auth/                # Auth-related components
├── lobby/               # Lobby components (LobbyActions, CreateRoomOptionsModal)
└── providers/           # Client-side provider wrappers
contexts/
├── AuthContext.tsx      # Authentication state management
├── ProfileContext.tsx   # User profile state management
├── ThemeContext.tsx     # Theme state management
└── WebSocketContext.tsx # WebSocket connection and room state
hooks/
└── useCreateRoom.ts     # Room creation hook with loading/error states
lib/
├── api/
│   └── client.ts        # Backend REST API client
├── supabase/
│   ├── client.ts        # Browser Supabase client
│   └── server.ts        # Server Supabase client
└── websocket/
    └── client.ts        # WebSocket client class
types/
├── auth.ts              # Auth type definitions
├── profile.ts           # Profile type definitions
├── room.ts              # Room type definitions
└── websocket.ts         # WebSocket message types
docs/
├── websocket.md         # WebSocket integration docs
└── rooms.md             # Room system docs
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

### REST API

The frontend communicates with the backend via `lib/api/client.ts`, which handles:
- Authentication via Bearer token (from Supabase session)
- Profile endpoints (`GET /api/v1/profile`, `PATCH /api/v1/profile`)
- Request timeout (30 seconds default, configurable via `timeoutMs`)
- Request cancellation via AbortController support

### WebSocket

Real-time features use WebSocket connection at `ws://localhost:8000/api/v1/ws`:
- Authenticated via JWT token in query parameter
- Heartbeat every 30 seconds
- Auto-reconnect with exponential backoff
- Request/response pattern with `request_id` for matching

See [docs/websocket.md](docs/websocket.md) for detailed documentation.

## Rooms

Players can create private game rooms and invite friends via a 6-character room code.

### Creating a Room

1. Navigate to the lobby (`/lobby`)
2. Click "Create Room"
3. Select number of players (2-4)
4. Share the room code with friends

### Room Lobby

After creating a room, users are redirected to `/room/[code]` where they can:
- View and copy the room code
- See connected players
- Start the game (host only, coming soon)

See [docs/rooms.md](docs/rooms.md) for detailed documentation.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
