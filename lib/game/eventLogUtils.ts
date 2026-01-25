import type {
  GameEvent,
  GameLogEntry,
  EventLogSeverity,
  Player,
  PlayerColor,
  GameStartedEvent,
  GameEndedEvent,
  TurnStartedEvent,
  TurnEndedEvent,
  RollGrantedEvent,
  DiceRolledEvent,
  ThreeSixesPenaltyEvent,
  TokenMovedEvent,
  TokenExitedHellEvent,
  TokenReachedHeavenEvent,
  TokenCapturedEvent,
  StackFormedEvent,
  StackDissolvedEvent,
  StackSplitEvent,
  StackMovedEvent,
  AwaitingChoiceEvent,
  AwaitingCaptureChoiceEvent,
} from '@/types/game'

let logIdCounter = 0
function generateLogId(): string {
  return `log_${++logIdCounter}_${Date.now()}`
}

function getPlayerName(playerId: string, players: Player[]): string {
  const player = players.find((p) => p.player_id === playerId)
  return player?.name ?? 'Unknown'
}

function getPlayerColor(playerId: string, players: Player[]): PlayerColor | null {
  const player = players.find((p) => p.player_id === playerId)
  return player?.color ?? null
}

interface LogEntryData {
  message: string
  severity: EventLogSeverity
  playerId: string | null
}

function createLogData(
  event: GameEvent,
  players: Player[]
): LogEntryData | null {
  switch (event.event_type) {
    case 'game_started': {
      const e = event as GameStartedEvent
      const firstName = getPlayerName(e.first_player_id, players)
      return {
        message: `Game started! ${firstName} goes first`,
        severity: 'info',
        playerId: e.first_player_id,
      }
    }

    case 'game_ended': {
      const e = event as GameEndedEvent
      const winnerName = getPlayerName(e.winner_id, players)
      return {
        message: `${winnerName} wins!`,
        severity: 'success',
        playerId: e.winner_id,
      }
    }

    case 'turn_started': {
      const e = event as TurnStartedEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName}'s turn`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'turn_ended': {
      const e = event as TurnEndedEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName}'s turn ended`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'roll_granted': {
      const e = event as RollGrantedEvent
      // Only log bonus rolls, not turn_start rolls (since turn_started already logs the turn)
      if (e.reason === 'turn_start') {
        return null
      }
      const playerName = getPlayerName(e.player_id, players)
      const reasonText = e.reason === 'rolled_six' ? 'rolled a 6' : 'capture bonus'
      return {
        message: `${playerName} gets extra roll (${reasonText})`,
        severity: 'success',
        playerId: e.player_id,
      }
    }

    case 'dice_rolled': {
      const e = event as DiceRolledEvent
      const playerName = getPlayerName(e.player_id, players)
      const extraRollText = e.grants_extra_roll ? ' (+extra roll)' : ''
      return {
        message: `${playerName} rolled ${e.value}${extraRollText}`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'three_sixes_penalty': {
      const e = event as ThreeSixesPenaltyEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName} rolled three 6s - loses turn!`,
        severity: 'warning',
        playerId: e.player_id,
      }
    }

    case 'token_exited_hell': {
      const e = event as TokenExitedHellEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName} entered the board`,
        severity: 'success',
        playerId: e.player_id,
      }
    }

    case 'token_moved': {
      const e = event as TokenMovedEvent
      const playerName = getPlayerName(e.player_id, players)
      const distance = Math.abs(e.to_progress - e.from_progress)
      return {
        message: `${playerName} moved ${distance} space${distance !== 1 ? 's' : ''}`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'token_reached_heaven': {
      const e = event as TokenReachedHeavenEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName}'s token reached heaven!`,
        severity: 'success',
        playerId: e.player_id,
      }
    }

    case 'token_captured': {
      const e = event as TokenCapturedEvent
      const capturingName = getPlayerName(e.capturing_player_id, players)
      const capturedName = getPlayerName(e.captured_player_id, players)
      return {
        message: `${capturingName} captured ${capturedName}'s token!`,
        severity: 'danger',
        playerId: e.capturing_player_id,
      }
    }

    case 'stack_formed': {
      const e = event as StackFormedEvent
      const playerName = getPlayerName(e.player_id, players)
      const count = e.token_ids.length
      return {
        message: `${playerName} formed a stack of ${count}`,
        severity: 'success',
        playerId: e.player_id,
      }
    }

    case 'stack_dissolved': {
      const e = event as StackDissolvedEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName}'s stack dissolved`,
        severity: 'warning',
        playerId: e.player_id,
      }
    }

    case 'stack_split': {
      const e = event as StackSplitEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName} split their stack`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'stack_moved': {
      const e = event as StackMovedEvent
      const playerName = getPlayerName(e.player_id, players)
      const distance = Math.abs(e.to_progress - e.from_progress)
      return {
        message: `${playerName} moved stack ${distance} space${distance !== 1 ? 's' : ''}`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'awaiting_choice': {
      const e = event as AwaitingChoiceEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName} choosing a move...`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    case 'awaiting_capture_choice': {
      const e = event as AwaitingCaptureChoiceEvent
      const playerName = getPlayerName(e.player_id, players)
      return {
        message: `${playerName} choosing capture option...`,
        severity: 'info',
        playerId: e.player_id,
      }
    }

    default:
      return null
  }
}

/**
 * Create a log entry from a game event
 */
export function createLogEntry(
  event: GameEvent,
  players: Player[]
): GameLogEntry | null {
  const logData = createLogData(event, players)
  if (!logData) return null

  const playerColor = logData.playerId
    ? getPlayerColor(logData.playerId, players)
    : null

  return {
    id: generateLogId(),
    timestamp: Date.now(),
    eventType: event.event_type,
    message: logData.message,
    playerId: logData.playerId,
    playerColor,
    severity: logData.severity,
  }
}
