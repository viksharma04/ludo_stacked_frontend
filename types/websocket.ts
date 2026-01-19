export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export enum MessageType {
  // Server → Client
  CONNECTED = 'connected',
  PONG = 'pong',
  CREATE_ROOM_OK = 'create_room_ok',
  CREATE_ROOM_ERROR = 'create_room_error',
  ERROR = 'error',

  // Client → Server
  PING = 'ping',
  CREATE_ROOM = 'create_room',
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

export interface CreateRoomOkPayload {
  room_id: string
  code: string
  seat_index: number
  is_host: boolean
}

export interface CreateRoomOkMessage extends BaseMessage {
  type: MessageType.CREATE_ROOM_OK
  request_id: string
  payload: CreateRoomOkPayload
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
  | ErrorMessage

export type OutgoingMessage = PingMessage | CreateRoomMessage
