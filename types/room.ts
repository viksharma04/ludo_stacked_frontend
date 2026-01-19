export interface Room {
  room_id: string
  code: string
  seat_index: number
  is_host: boolean
  max_players: number
}

export interface SeatPlayer {
  user_id: string
  display_name: string
  avatar_url: string | null
}

export interface Seat {
  seat_index: number
  player: SeatPlayer | null
  is_ready: boolean
  is_host: boolean
}

export interface RoomState extends Room {
  seats: Seat[]
}
