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
│  - Exposes status, currentRoom, createRoom(), joinRoom()    │
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

// Join Room
{
  "type": "join_room",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "room_code": "ABC123"
  }
}
```

### Server → Client

```typescript
// Connected (on connection)
{ "type": "connected", "user_id": "..." }

// Pong (heartbeat response)
{ "type": "pong" }

// Create Room Success (payload is room data directly)
{
  "type": "create_room_ok",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "room_id": "...",
    "code": "AAVLEA",
    "status": "waiting",
    "visibility": "private",
    "ruleset_id": "classic",
    "max_players": 4,
    "seats": [...],
    "version": 1
  }
}

// Create Room Error
{
  "type": "create_room_error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "error_code": "VALIDATION_ERROR",
    "message": "Invalid max_players value"
  }
}

// Join Room Success (payload is room data directly)
{
  "type": "join_room_ok",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "room_id": "...",
    "code": "ABC123",
    "status": "waiting",
    "visibility": "private",
    "ruleset_id": "classic",
    "max_players": 4,
    "seats": [...],
    "version": 1
  }
}

// Join Room Error
{
  "type": "join_room_error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "error_code": "ROOM_NOT_FOUND",
    "message": "Room not found"
  }
}

// Room Updated (broadcast to other room members when someone joins/leaves)
{
  "type": "room_updated",
  "payload": {
    "room": { ... }
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
  const { status, currentRoom, createRoom, joinRoom } = useWebSocket()

  // status: 'disconnected' | 'connecting' | 'connected' | 'error'
  // currentRoom: RoomState | null
  // createRoom: (maxPlayers: number) => Promise<RoomState>
  // joinRoom: (roomCode: string) => Promise<RoomState>
}
```

### Creating a Room

```typescript
const { createRoom, status } = useWebSocket()

async function handleCreateRoom() {
  if (status !== 'connected') return

  try {
    const room = await createRoom(4) // 4 players
    // room: { room_id, code, seat_index, is_host, max_players, seats }
  } catch (error) {
    // Handle error
  }
}
```

### Joining a Room

```typescript
const { joinRoom, status } = useWebSocket()

async function handleJoinRoom(code: string) {
  if (status !== 'connected') return

  try {
    const room = await joinRoom(code) // e.g., "ABC123"
    // room: { room_id, code, seat_index, is_host, max_players, seats }
  } catch (error) {
    // Handle error (e.g., room not found)
  }
}
```

### Using the Hooks

For UI integration with loading/error states, use the dedicated hooks:

```typescript
import { useCreateRoom } from '@/hooks/useCreateRoom'
import { useJoinRoom } from '@/hooks/useJoinRoom'

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

function JoinRoomButton() {
  const { joinRoom, isJoining, error, isConnected } = useJoinRoom()

  return (
    <button
      onClick={() => joinRoom('ABC123')}
      disabled={!isConnected || isJoining}
    >
      {isJoining ? 'Joining...' : 'Join Room'}
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
- Individual message interfaces (e.g., `CreateRoomMessage`, `JoinRoomMessage`)

## Error Handling

| Error Type | Handling |
|------------|----------|
| Connection failed | Auto-reconnect with backoff |
| Request timeout | Promise rejected after 30s |
| Server error response | Promise rejected with error message |
| Network drop | Pending requests rejected, auto-reconnect |

### Join Room Error Codes

| Code | Description |
|------|-------------|
| `ROOM_NOT_FOUND` | Room does not exist |
| `ROOM_FULL` | No available seats |
| `ALREADY_IN_ROOM` | User already in another room |

## Files

| File | Purpose |
|------|---------|
| `lib/websocket/client.ts` | WebSocket client class |
| `contexts/WebSocketContext.tsx` | React context provider |
| `hooks/useCreateRoom.ts` | Hook for create room UI |
| `hooks/useJoinRoom.ts` | Hook for join room UI |
| `types/websocket.ts` | TypeScript definitions |
| `types/room.ts` | Room type definition |
