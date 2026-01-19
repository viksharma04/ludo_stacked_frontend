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

## Room Data

```typescript
interface Room {
  room_id: string    // Internal UUID
  code: string       // 6-character shareable code (e.g., "AAVLEA")
  seat_index: number // Player's seat (0-3)
  is_host: boolean   // Whether player is room host
}
```

## Room Lobby Page

Located at `/room/[code]`, the room lobby displays:

- **Room code** with copy button for sharing
- **Player list** showing connected players and empty seats
- **Game settings** (placeholder for future features)
- **Action buttons**:
  - "Leave Room" - Returns to main lobby
  - "Start Game" - Begins the game (host only, coming soon)

### URL Structure

```
/room/AAVLEA
```

The room code in the URL allows players to bookmark or share direct links (future feature).

## State Management

Room state is managed through `WebSocketContext`:

```typescript
const { currentRoom, clearRoom } = useWebSocket()
```

- `currentRoom` - Current room data (null if not in a room)
- `clearRoom()` - Clears room state when leaving

## Joining a Room (Coming Soon)

Players will be able to join existing rooms by:
1. Entering a room code in the "Join Room" dialog
2. Following a direct link to `/room/[code]`

## Files

| File | Purpose |
|------|---------|
| `app/(protected)/room/[code]/page.tsx` | Room lobby page |
| `components/lobby/CreateRoomOptionsModal.tsx` | Player count selector |
| `components/lobby/LobbyActions.tsx` | Create/Join room buttons |
| `types/room.ts` | Room type definition |
| `hooks/useCreateRoom.ts` | Room creation hook |
