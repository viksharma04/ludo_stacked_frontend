// Room system types based on backend schemas
// Source: specs/backend_room_logic_schemas.md

// WebSocket close codes
export const WS_CLOSE_CODES = {
  AUTH_FAILED: 4001,
  AUTH_EXPIRED: 4002,
  ROOM_NOT_FOUND: 4003,
  ROOM_ACCESS_DENIED: 4004,
} as const

// Message types for WebSocket communication
export type MessageType =
  | 'ping'
  | 'pong'
  | 'connected'
  | 'error'
  | 'room_updated'
  | 'toggle_ready'
  | 'leave_room'
  | 'room_closed'

// Client to server message envelope
export interface WSClientMessage {
  type: MessageType
  request_id?: string
  payload?: Record<string, unknown>
}

// Server to client message envelope
export interface WSServerMessage {
  type: MessageType
  request_id?: string
  payload?: Record<string, unknown>
}

// Seat snapshot within a room
export interface SeatSnapshot {
  seat_index: number
  user_id?: string | null
  display_name?: string | null
  ready: 'not_ready' | 'ready'
  connected: boolean
  is_host: boolean
}

// Full room state snapshot
export interface RoomSnapshot {
  room_id: string
  code: string
  status: string
  visibility: string
  ruleset_id: string
  max_players: number
  seats: SeatSnapshot[]
  version: number
}

// Payload for connected message
export interface ConnectedPayload {
  connection_id: string
  user_id: string
  server_id: string
  room: RoomSnapshot
}

// Payload for pong message
export interface PongPayload {
  server_time: string
}

// Payload for error message
export interface ErrorPayload {
  error_code: string
  message: string
}

// Payload for room_closed message
export interface RoomClosedPayload {
  reason: string
  room_id: string
}

// REST API types

// Seat info returned from create/join room
export interface SeatInfo {
  seat_index: 0 | 1 | 2 | 3
  is_host: boolean
}

// Create room request body
export interface CreateRoomRequest {
  n_players: 2 | 3 | 4
}

// Create room response
export interface CreateRoomResponse {
  room_id: string
  code: string
  seat: SeatInfo
  cached: boolean
}

// Join room request body
export interface JoinRoomRequest {
  code: string // ^[A-Z0-9]{6}$
}

// Join room response
export interface JoinRoomResponse {
  room_id: string
  code: string
  seat: SeatInfo
}
