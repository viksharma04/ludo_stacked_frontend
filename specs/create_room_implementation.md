# Story 1.1: Create Private Room (Frontend)

**Role:** Frontend Implementation Agent

**Stack:** React/Next.js, TypeScript, WebSocket API

---

## 🛠 Context & Constraints

* **Backend:** FastAPI WebSocket server is already implemented and running.
* **Authentication:** User is authenticated via Supabase. JWT token is available from the Supabase client.
* **Protocol:** WebSocket-only communication for room operations.
* **UI State:** A "Create Room" button placeholder already exists in the UI.

---

## 🔌 WebSocket Connection

### Endpoint
```
ws://localhost:8000/api/v1/ws?token=<jwt>
```

Production:
```
wss://<your-domain>/api/v1/ws?token=<jwt>
```

### Connection Flow

1. Get the JWT access token from Supabase auth session
2. Connect to WebSocket with token as query parameter
3. Wait for `connected` message confirming successful authentication
4. Handle connection errors and reconnection logic

### Initial Connection Response

Upon successful connection, the server sends:
```json
{
  "type": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "payload": {
    "connection_id": "<uuid>",
    "user_id": "<uuid>",
    "server_id": "<string>"
  }
}
```

### Heartbeat (Keep-Alive)

Send periodic ping messages to maintain connection:
```json
{
  "type": "ping",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Server responds with:
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "payload": {
    "server_time": "2024-01-15T10:30:00.000Z"
  }
}
```

**Recommended interval:** 30 seconds

---

## 📩 Message Contract: Create Room

### Client → Server: `create_room`

```json
{
  "type": "create_room",
  "request_id": "<uuid>",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "payload": {
    "visibility": "private",
    "max_players": 4,
    "ruleset_id": "classic",
    "ruleset_config": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"create_room"` |
| `request_id` | UUID | Yes | Client-generated UUID for idempotency |
| `timestamp` | ISO 8601 | No | Client timestamp |
| `payload.visibility` | string | Yes | Must be `"private"` (only option for now) |
| `payload.max_players` | number | Yes | Range: 2-4, default: 4 |
| `payload.ruleset_id` | string | Yes | Must be `"classic"` (only option for now) |
| `payload.ruleset_config` | object | No | Empty object `{}` for now |

### Server → Client Success: `create_room_ok`

```json
{
  "type": "create_room_ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request_id": "<uuid>",
  "payload": {
    "room_id": "<uuid>",
    "code": "AB12CD",
    "seat_index": 0,
    "is_host": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload.room_id` | UUID | Unique room identifier |
| `payload.code` | string | 6-character join code to share with friends |
| `payload.seat_index` | number | Your seat (0 = host seat) |
| `payload.is_host` | boolean | Always `true` for room creator |

### Server → Client Error: `create_room_error`

```json
{
  "type": "create_room_error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request_id": "<uuid>",
  "payload": {
    "error_code": "VALIDATION_ERROR",
    "message": "Human readable error message"
  }
}
```

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Invalid payload (visibility, max_players, ruleset_id, or request_id) |
| `REQUEST_IN_PROGRESS` | Same request_id is already being processed |
| `CODE_GENERATION_FAILED` | Server couldn't generate unique room code (rare) |
| `INTERNAL_ERROR` | Unexpected server error |

---

## ⚙️ Functional Requirements

### 1. WebSocket Service/Hook

Create a reusable WebSocket service or React hook that handles:

- **Connection management:** Connect, disconnect, reconnect on failure
- **Authentication:** Pass JWT token from Supabase session
- **Message sending:** Type-safe message dispatch
- **Message receiving:** Event-based message handling
- **Heartbeat:** Automatic ping every 30 seconds
- **State tracking:** Connection status (connecting, connected, disconnected, error)

### 2. Request ID Generation

```typescript
// Use the native crypto API
const requestId = crypto.randomUUID();
```

**Important:** Store the `request_id` until you receive a response. If connection drops, you can retry with the same `request_id` for idempotent behavior.

### 3. Create Room Flow

1. User clicks "Create Room" button
2. Generate a new `request_id` (UUID)
3. Show loading state on button
4. Send `create_room` message via WebSocket
5. Wait for `create_room_ok` or `create_room_error` response
6. On success: Navigate to lobby/room view, display the room code
7. On error: Show error message to user, reset button state

### 4. UI States

| State | UI |
|-------|-----|
| Disconnected | "Create Room" button disabled, show connection status |
| Connected | "Create Room" button enabled |
| Creating | Button shows loading spinner, disabled |
| Success | Navigate to room lobby, show room code prominently |
| Error | Show toast/alert with error message, re-enable button |

### 5. Room Code Display

After successful room creation, prominently display:
- The 6-character room code (e.g., "AB12CD")
- A "Copy" button to copy code to clipboard
- Instructions like "Share this code with friends to join"

---

### Type Definitions Example

```typescript
// Message types enum
enum MessageType {
  PING = 'ping',
  PONG = 'pong',
  CONNECTED = 'connected',
  ERROR = 'error',
  CREATE_ROOM = 'create_room',
  CREATE_ROOM_OK = 'create_room_ok',
  CREATE_ROOM_ERROR = 'create_room_error',
}

// Outgoing message
interface CreateRoomMessage {
  type: MessageType.CREATE_ROOM;
  request_id: string;
  timestamp?: string;
  payload: {
    visibility: 'private';
    max_players: 2 | 3 | 4;
    ruleset_id: 'classic';
    ruleset_config: Record<string, unknown>;
  };
}

// Success response
interface CreateRoomOkMessage {
  type: MessageType.CREATE_ROOM_OK;
  request_id: string;
  timestamp: string;
  payload: {
    room_id: string;
    code: string;
    seat_index: number;
    is_host: boolean;
  };
}

// Error response
interface CreateRoomErrorMessage {
  type: MessageType.CREATE_ROOM_ERROR;
  request_id: string;
  timestamp: string;
  payload: {
    error_code: string;
    message: string;
  };
}
```

---

## 🧪 Test Cases

### Manual Testing

1. **Happy Path:**
   - Click "Create Room" → See loading state → Navigate to room with code displayed

2. **Connection Lost:**
   - Disconnect network → Click "Create Room" → Should show connection error

3. **Idempotency:**
   - Create room → Note room_id → Manually resend same request_id → Should return same room_id

4. **Validation Errors:**
   - Modify code to send invalid `max_players: 5` → Should show error message

### Automated Testing

1. Mock WebSocket connection
2. Test loading states
3. Test success navigation
4. Test error handling and display
5. Test reconnection logic

---

## 🚫 Out of Scope (Future Stories)

- Join room via code
- Room lobby UI (player list, ready states)
- Leave room
- Start game
- Public room listing

---

## 📝 Notes

- The WebSocket connection should be established when the user logs in or navigates to a page where real-time features are needed
- Consider using a WebSocket connection context provider at a high level in the component tree
- The room code is designed to be human-friendly and easy to share verbally
