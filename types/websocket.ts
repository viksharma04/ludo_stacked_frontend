export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export enum MessageType {
  // Server → Client
  CONNECTED = 'connected',
  PONG = 'pong',
  CREATE_ROOM_OK = 'create_room_ok',
  CREATE_ROOM_ERROR = 'create_room_error',
  JOIN_ROOM_OK = 'join_room_ok',
  JOIN_ROOM_ERROR = 'join_room_error',
  ROOM_UPDATED = 'room_updated',
  ERROR = 'error',

  // Client → Server
  PING = 'ping',
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
}

// Base message interface
interface BaseMessage {
  type: MessageType
  request_id?: string
}

// Server → Client messages
export interface ConnectedMessage extends BaseMessage {
  type: MessageType.CONNECTED
  user_id: string
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG
}

// Shared payload types for seat data (matches server response)
export interface SeatPayload {
  seat_index: number
  user_id: string | null
  display_name: string | null
  avatar_url?: string | null
  ready: 'not_ready' | 'ready'
  connected: boolean
  is_host: boolean
}

// Room data as returned by the server
export interface RoomPayload {
  room_id: string
  code: string
  status: string
  visibility: string
  ruleset_id: string
  max_players: number
  seats: SeatPayload[]
  version: number
}

// CreateRoomOkMessage payload is RoomPayload directly (flattened)
export interface CreateRoomOkMessage extends BaseMessage {
  type: MessageType.CREATE_ROOM_OK
  request_id: string
  payload: RoomPayload
}

export interface CreateRoomErrorPayload {
  error_code: string
  message: string
}

export interface CreateRoomErrorMessage extends BaseMessage {
  type: MessageType.CREATE_ROOM_ERROR
  request_id: string
  payload: CreateRoomErrorPayload
}

// Join room messages
export interface JoinRoomPayload {
  room_code: string
}

export interface JoinRoomMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM
  request_id: string
  payload: JoinRoomPayload
}

// JoinRoomOkMessage payload is RoomPayload directly (flattened)
export interface JoinRoomOkMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM_OK
  request_id: string
  payload: RoomPayload
}

export interface JoinRoomErrorPayload {
  error_code: string
  message: string
}

export interface JoinRoomErrorMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM_ERROR
  request_id: string
  payload: JoinRoomErrorPayload
}

// Room updated message (broadcast to other room members)
export interface RoomUpdatedPayload {
  room: RoomPayload
}

export interface RoomUpdatedMessage extends BaseMessage {
  type: MessageType.ROOM_UPDATED
  payload: RoomUpdatedPayload
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR
  error: string
}

// Client → Server messages
export interface PingMessage extends BaseMessage {
  type: MessageType.PING
}

export interface CreateRoomPayload {
  visibility: 'private' | 'public'
  max_players: number
  ruleset_id: string
  ruleset_config: Record<string, unknown>
}

export interface CreateRoomMessage extends BaseMessage {
  type: MessageType.CREATE_ROOM
  request_id: string
  payload: CreateRoomPayload
}

// Union types for incoming and outgoing messages
export type IncomingMessage =
  | ConnectedMessage
  | PongMessage
  | CreateRoomOkMessage
  | CreateRoomErrorMessage
  | JoinRoomOkMessage
  | JoinRoomErrorMessage
  | RoomUpdatedMessage
  | ErrorMessage

export type OutgoingMessage = PingMessage | CreateRoomMessage | JoinRoomMessage
