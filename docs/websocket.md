# WebSocket Integration

This document describes the WebSocket implementation for real-time communication between the frontend and backend.

## Overview

The frontend maintains a persistent WebSocket connection to the backend for real-time game features like room creation, player updates, and game state synchronization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│  WebSocketContext (contexts/WebSocketContext.tsx)           │
│  - Manages connection lifecycle                              │
│  - Exposes status, currentRoom, createRoom()                │
├─────────────────────────────────────────────────────────────┤
│  WebSocketClient (lib/websocket/client.ts)                  │
│  - Handles connection, heartbeat, reconnection              │
│  - Request/response pattern with request_id                 │
├─────────────────────────────────────────────────────────────┤
│                    WebSocket Connection                      │
│            ws(s)://<API_URL>/api/v1/ws?token=<jwt>          │
└─────────────────────────────────────────────────────────────┘
```

## Connection

### URL Format

```
ws://localhost:8000/api/v1/ws?token=<access_token>
wss://api.example.com/api/v1/ws?token=<access_token>
```

The access token is the JWT from the Supabase session.

### Connection Lifecycle

1. User authenticates via Supabase
2. `WebSocketProvider` detects `session.access_token`
3. `WebSocketClient.connect()` establishes connection
4. Server sends `connected` message with `user_id`
5. Client starts heartbeat (ping every 30s)

### Reconnection

On connection loss, the client automatically reconnects with exponential backoff:
- Delays: 1s, 2s, 4s, 8s, 16s (max)
- Reconnection stops if user explicitly disconnects

## Message Format

All messages are JSON with a `type` field. Request messages include a `request_id` (UUID) for response matching.

### Client → Server

```typescript
// Ping (heartbeat)
{ "type": "ping" }

// Create Room
{
  "type": "create_room",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "visibility": "private",
    "max_players": 4,
    "ruleset_id": "classic",
    "ruleset_config": {}
  }
}
```

### Server → Client

```typescript
// Connected (on connection)
{ "type": "connected", "user_id": "..." }

// Pong (heartbeat response)
{ "type": "pong" }

// Create Room Success
{
  "type": "create_room_ok",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "room_id": "...",
    "code": "AAVLEA",
    "seat_index": 0,
    "is_host": true
  }
}

// Create Room Error
{
  "type": "create_room_error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "error_code": "VALIDATION_ERROR",
    "message": "Invalid max_players value"
  }
}

// Generic Error
{ "type": "error", "error": "..." }
```

## Usage

### Accessing WebSocket State

```typescript
import { useWebSocket } from '@/contexts/WebSocketContext'

function MyComponent() {
  const { status, currentRoom, createRoom } = useWebSocket()

  // status: 'disconnected' | 'connecting' | 'connected' | 'error'
  // currentRoom: Room | null
  // createRoom: (maxPlayers: number) => Promise<Room>
}
```

### Creating a Room

```typescript
const { createRoom, status } = useWebSocket()

async function handleCreateRoom() {
  if (status !== 'connected') return

  try {
    const room = await createRoom(4) // 4 players
    // room: { room_id, code, seat_index, is_host }
  } catch (error) {
    // Handle error
  }
}
```

### Using the Hook

For UI integration with loading/error states, use the `useCreateRoom` hook:

```typescript
import { useCreateRoom } from '@/hooks/useCreateRoom'

function CreateRoomButton() {
  const { createRoom, isCreating, error, isConnected } = useCreateRoom()

  return (
    <button
      onClick={() => createRoom(4)}
      disabled={!isConnected || isCreating}
    >
      {isCreating ? 'Creating...' : 'Create Room'}
    </button>
  )
}
```

## Type Definitions

See `types/websocket.ts` for complete type definitions:

- `WebSocketStatus` - Connection status type
- `MessageType` - Enum of all message types
- `IncomingMessage` - Union of all server messages
- `OutgoingMessage` - Union of all client messages
- Individual message interfaces (e.g., `CreateRoomMessage`, `CreateRoomOkMessage`)

## Error Handling

| Error Type | Handling |
|------------|----------|
| Connection failed | Auto-reconnect with backoff |
| Request timeout | Promise rejected after 30s |
| Server error response | Promise rejected with error message |
| Network drop | Pending requests rejected, auto-reconnect |

## Files

| File | Purpose |
|------|---------|
| `lib/websocket/client.ts` | WebSocket client class |
| `contexts/WebSocketContext.tsx` | React context provider |
| `hooks/useCreateRoom.ts` | Hook for create room UI |
| `types/websocket.ts` | TypeScript definitions |
| `types/room.ts` | Room type definition |
