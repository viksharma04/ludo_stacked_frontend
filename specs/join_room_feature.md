# Feature: Join Room by Code (Lobby Entry)

## 1. Purpose

Allow users to **join a room lobby using a join code** and immediately view the current room state, with live updates.

---

## 2. User Experience

### Primary Flow

1. User enters a 6-character room code
2. System validates the code format (uppercase alphanumeric)
3. User is navigated to the room lobby
4. Lobby displays current seats and status
5. Lobby updates in realtime via `room_updated` messages

### Error States

* Invalid code format
* Room not found
* Room full
* Connection lost

---

## 3. UI Components

### Join Room Modal

* Join code input (6 characters, auto-uppercase)
* Join button
* Error message area
* Loading state

### Room Lobby Screen

* Seat layout (fixed positions)
* Ready indicators
* Room status indicator
* Connection status indicator

---

## 4. Client Responsibilities

The frontend must:

* Capture and validate join code input (6 alphanumeric chars)
* Establish WebSocket connection (if not already connected)
* Send `join_room` message with `room_code`
* Render room state from response
* Handle `room_updated` broadcasts for real-time updates
* Handle reconnects transparently

---

## 5. Client-Server Interaction

### Join Room via WebSocket

```json
{
  "type": "join_room",
  "request_id": "uuid",
  "payload": {
    "room_code": "ABC123"
  }
}
```

### Success Response

```json
{
  "type": "join_room_ok",
  "request_id": "uuid",
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
```

### Error Response

```json
{
  "type": "join_room_error",
  "request_id": "uuid",
  "payload": {
    "error_code": "ROOM_NOT_FOUND",
    "message": "Room not found"
  }
}
```

### Real-time Updates

After joining, the frontend listens for `room_updated` broadcasts when other players join or leave:

```json
{
  "type": "room_updated",
  "payload": {
    "room": { ... }
  }
}
```

---

## 6. Client State Model

### Server State (authoritative)

* Room metadata
* Seat assignments
* Ready states

### UI State (non-authoritative)

* Loading indicators
* Animations
* Transient errors

---

## 7. Reconnect Behavior

* On reconnect, frontend must:

  * Re-establish WS connection
  * Re-send `join_room` with `room_code`
  * Replace lobby state with fresh response
* No client-side state is assumed valid across reconnects

---

## 8. Error Handling

Errors must be:

* Human-readable
* Non-blocking when possible
* Logged for diagnostics

### Error Codes

| Code | Description |
|------|-------------|
| `ROOM_NOT_FOUND` | Room does not exist |
| `ROOM_FULL` | No available seats |
| `ALREADY_IN_ROOM` | User already in another room |

---

## 9. Implementation

### Files

| File | Purpose |
|------|---------|
| `hooks/useJoinRoom.ts` | Join room hook with loading/error states |
| `components/lobby/JoinRoomModal.tsx` | Modal for entering room code |
| `app/(protected)/room/[code]/page.tsx` | Room lobby page (handles direct URL access) |
| `contexts/WebSocketContext.tsx` | `joinRoom(roomCode)` method |
| `types/websocket.ts` | Message type definitions |

### Usage

```typescript
import { useJoinRoom } from '@/hooks/useJoinRoom'

function JoinRoomButton() {
  const { joinRoom, isJoining, error, isConnected } = useJoinRoom()

  const handleJoin = async (code: string) => {
    const room = await joinRoom(code)
    if (room) {
      router.push(`/room/${room.code}`)
    }
  }

  return (
    <button onClick={() => handleJoin('ABC123')} disabled={!isConnected || isJoining}>
      {isJoining ? 'Joining...' : 'Join Room'}
    </button>
  )
}
```

---

## 10. Acceptance Criteria

* User can join room using 6-character code
* Invalid codes show clear error message
* Room not found shows appropriate error
* Lobby renders from join response
* Real-time updates via `room_updated` reflected without reload
* Refresh or reconnect restores lobby
* Direct URL navigation (`/room/ABC123`) auto-joins

---

## 11. Definition of Done

* Join flow fully functional
* Room state renders lobby correctly
* Errors handled gracefully
* Reconnect tested
* No hard dependency on seat assignment logic
