# Room System

This document describes the room system for multiplayer game sessions.

## Overview

Rooms are game sessions where players gather before starting a game. Each room has a unique 6-character code that players can share to invite others.

## Room Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Create Room │ ──► │  Room Lobby  │ ──► │  Game Start  │
│   (Host)     │     │  (Waiting)   │     │  (Playing)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │ Join Room   │
                     │ (Players)   │
                     └─────────────┘
```

## Creating a Room

1. User clicks "Create Room" in lobby
2. Options modal opens to select player count (2-4)
3. WebSocket sends `create_room` message
4. Server responds with room details
5. User redirected to `/room/[code]`

### Room Creation Options

| Option | Values | Description |
|--------|--------|-------------|
| `max_players` | 2, 3, 4 | Maximum number of players |
| `visibility` | private | Room visibility (currently only private) |
| `ruleset_id` | classic | Game ruleset to use |

## Joining a Room

Players can join existing rooms in two ways:

### Via Join Room Modal

1. User clicks "Join Room" in lobby
2. Modal opens with code input field
3. User enters 6-character room code
4. WebSocket sends `join_room` message with `room_code`
5. Server responds with room snapshot
6. User redirected to `/room/[code]`

### Via Direct URL

1. User navigates directly to `/room/[code]`
2. Page auto-joins on WebSocket connection
3. Room state is populated from server response

### Join Room Message

```json
{
  "type": "join_room",
  "request_id": "uuid",
  "payload": {
    "room_code": "ABC123"
  }
}
```

### Error Handling

| Error Code | Description |
|------------|-------------|
| `ROOM_NOT_FOUND` | Room does not exist |
| `ROOM_FULL` | No available seats |
| `ALREADY_IN_ROOM` | User already in another room |

## Room Data

```typescript
interface RoomState {
  room_id: string       // Internal UUID
  code: string          // 6-character shareable code (e.g., "AAVLEA")
  seat_index: number    // Player's seat (0-3)
  is_host: boolean      // Whether player is room host
  max_players: number   // Maximum players (2-4)
  seats: Seat[]         // All seats with player info
}

interface Seat {
  seat_index: number
  player: SeatPlayer | null
  is_ready: boolean
  is_host: boolean
}

interface SeatPlayer {
  user_id: string
  display_name: string
  avatar_url: string | null
}
```

## Room Lobby Page

Located at `/room/[code]`, the room lobby displays:

- **Room code** with copy button for sharing
- **Player list** showing connected players and empty seats
- **Ready status** for each player
- **Host badge** indicating the room creator
- **Game settings** (placeholder for future features)
- **Action buttons**:
  - "Leave Room" - Returns to main lobby
  - "Start Game" - Begins the game (host only, coming soon)

### URL Structure

```
/room/AAVLEA
```

The room code in the URL allows players to bookmark or share direct links.

## State Management

Room state is managed through `WebSocketContext`:

```typescript
const { currentRoom, createRoom, joinRoom, clearRoom } = useWebSocket()
```

- `currentRoom` - Current room state (null if not in a room)
- `createRoom(maxPlayers)` - Create a new room
- `joinRoom(roomCode)` - Join an existing room by code
- `clearRoom()` - Clears room state when leaving

### Real-time Updates

The frontend handles the `room_updated` message which is broadcast to other room members when someone joins or leaves:

```json
{
  "type": "room_updated",
  "payload": {
    "room": { ... }
  }
}
```

## Files

| File | Purpose |
|------|---------|
| `app/(protected)/room/[code]/page.tsx` | Room lobby page |
| `components/lobby/CreateRoomOptionsModal.tsx` | Player count selector |
| `components/lobby/JoinRoomModal.tsx` | Room code input modal |
| `components/lobby/LobbyActions.tsx` | Create/Join room buttons |
| `contexts/WebSocketContext.tsx` | Room state management |
| `hooks/useCreateRoom.ts` | Room creation hook |
| `hooks/useJoinRoom.ts` | Room joining hook |
| `types/room.ts` | Room type definitions |
