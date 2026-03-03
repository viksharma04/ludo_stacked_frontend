import type {
  GameEvent,
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
  StackMovedEvent,
  AwaitingChoiceEvent,
  AwaitingCaptureChoiceEvent,
  AnimationQueueItem,
  AnimationType,
  CaptureOption,
  HighlightedToken,
} from '@/types/game'
import { ANIMATION_DURATIONS } from './constants'
import { useGameStore, type GameStore } from '@/stores/gameStore'
import { getHighlightableEntities } from './legalMoveParser'
import { createLogEntry } from './eventLogUtils'

type EventHandler<T extends GameEvent = GameEvent> = (
  event: T,
  store: GameStore
) => void

// Generate unique animation ID
let animationIdCounter = 0
function generateAnimationId(): string {
  return `anim_${++animationIdCounter}_${Date.now()}`
}

// Create animation queue item from event
function createAnimationItem(
  type: AnimationType,
  event: GameEvent,
  duration: number
): AnimationQueueItem {
  return {
    id: generateAnimationId(),
    type,
    event,
    duration,
  }
}

// Extract token IDs that will be animated from an event
function getAnimatedTokenIds(event: GameEvent): string[] {
  switch (event.event_type) {
    case 'token_moved':
      return [(event as TokenMovedEvent).token_id]
    case 'token_exited_hell':
      return [(event as TokenExitedHellEvent).token_id]
    case 'token_reached_heaven':
      return [(event as TokenReachedHeavenEvent).token_id]
    case 'token_captured':
      return [
        (event as TokenCapturedEvent).capturing_token_id,
        (event as TokenCapturedEvent).captured_token_id,
      ]
    case 'stack_formed':
      return (event as StackFormedEvent).token_ids
    case 'stack_dissolved':
      return (event as StackDissolvedEvent).token_ids
    case 'stack_moved':
      return (event as StackMovedEvent).token_ids
    default:
      return []
  }
}

// Helper to enqueue animation and pre-register token IDs
function enqueueWithTokenRegistration(
  store: GameStore,
  type: AnimationType,
  event: GameEvent,
  duration: number
): void {
  const tokenIds = getAnimatedTokenIds(event)
  if (tokenIds.length > 0) {
    store.addAnimatingTokens(tokenIds)
  }
  store.enqueueAnimation(createAnimationItem(type, event, duration))
}

// Event handlers
const handlers: Record<string, EventHandler<any>> = {
  game_started: (event: GameStartedEvent, store: GameStore) => {
    store.setPhase('in_progress')
    // Reorder players if needed based on player_order
    // The first player's turn should start
  },

  game_ended: (event: GameEndedEvent, store: GameStore) => {
    store.setPhase('finished')
    store.setWinner(event.winner_id, event.final_rankings)
  },

  turn_started: (event: TurnStartedEvent, store: GameStore) => {
    // Find the player whose turn it is
    const player = store.players.find((p) => p.player_id === event.player_id)
    const isMyTurn = event.player_id === store.myPlayerId

    // Show turn transition notification
    if (player) {
      store.setTurnTransition({
        playerName: player.name,
        playerColor: player.color,
        isMyTurn,
      })

      // Auto-hide after transition duration
      setTimeout(() => {
        store.setTurnTransition(null)
      }, ANIMATION_DURATIONS.TURN_TRANSITION + 1500) // Show for 1.5s after animation
    }

    store.setCurrentTurn({
      player_id: event.player_id,
      initial_roll: true,
      rolls_to_allocate: [],
      legal_moves: [],
      current_turn_order: event.turn_number,
      extra_rolls: 0,
    })
    // Note: dice UI trigger moved to roll_granted handler
    store.clearHighlightedTokens()
    store.setDiceValue(null)
    store.setRollReason(null)
  },

  turn_ended: (event: TurnEndedEvent, store: GameStore) => {
    store.clearHighlightedTokens()
    store.setDiceValue(null)
    store.setRollReason(null)
    // Turn will be set by next turn_started event
  },

  roll_granted: (event: RollGrantedEvent, store: GameStore) => {
    // This is the single trigger for enabling the dice roll UI
    store.setCurrentEvent('player_roll')
    store.setRollReason(event.reason)
  },

  dice_rolled: (event: DiceRolledEvent, store: GameStore) => {
    const isMyRoll = event.player_id === store.myPlayerId

    // Update state immediately for game logic
    if (event.grants_extra_roll) {
      store.updateTurn({ extra_rolls: (store.currentTurn?.extra_rolls ?? 0) + 1 })
    }
    store.addRoll(event.value)

    // Queue animation
    store.enqueueAnimation(
      createAnimationItem('dice_roll', event, ANIMATION_DURATIONS.DICE_ROLL)
    )

    if (isMyRoll) {
      // For the rolling player, they have local animation in DicePanel
      // Just set the dice value immediately - localRolling state handles display
      store.setDiceValue(event.value)
    } else {
      // For opponents, trigger animation via diceRolling state
      store.setDiceRolling(true)

      // Clear rolling state and show dice value after animation completes
      setTimeout(() => {
        store.setDiceValue(event.value)
        store.setDiceRolling(false)
      }, ANIMATION_DURATIONS.DICE_ROLL)
    }
  },

  three_sixes_penalty: (event: ThreeSixesPenaltyEvent, store: GameStore) => {
    store.setShowPenaltyAnimation(true, event.player_id)
    // Penalty display will be handled by UI component
    setTimeout(() => {
      store.setShowPenaltyAnimation(false)
    }, ANIMATION_DURATIONS.PENALTY_DISPLAY)
  },

  token_moved: (event: TokenMovedEvent, store: GameStore) => {
    // Update token state
    store.updateToken(event.player_id, event.token_id, {
      state: event.to_state,
      progress: event.to_progress,
    })

    // Consume the roll used
    store.consumeRoll(event.roll_used)

    // Queue animation (pre-registers token to prevent position updates during animation)
    const duration =
      Math.abs(event.to_progress - event.from_progress) *
      ANIMATION_DURATIONS.TOKEN_MOVE_PER_SQUARE
    enqueueWithTokenRegistration(store, 'token_move', event, duration)
  },

  token_exited_hell: (event: TokenExitedHellEvent, store: GameStore) => {
    // Update token state
    store.updateToken(event.player_id, event.token_id, {
      state: 'road',
      progress: 0,
    })

    // Consume the roll used
    store.consumeRoll(event.roll_used)

    // Queue animation
    enqueueWithTokenRegistration(
      store,
      'token_exit_hell',
      event,
      ANIMATION_DURATIONS.TOKEN_EXIT_HELL
    )
  },

  token_reached_heaven: (event: TokenReachedHeavenEvent, store: GameStore) => {
    // Update token state
    store.updateToken(event.player_id, event.token_id, {
      state: 'heaven',
    })

    // Queue animation
    enqueueWithTokenRegistration(
      store,
      'token_reach_heaven',
      event,
      ANIMATION_DURATIONS.TOKEN_REACH_HEAVEN
    )
  },

  token_captured: (event: TokenCapturedEvent, store: GameStore) => {
    // Update captured token state back to hell
    store.updateToken(event.captured_player_id, event.captured_token_id, {
      state: 'hell',
      progress: 0,
      in_stack: false,
    })

    // Grant extra roll if applicable
    if (event.grants_extra_roll) {
      store.updateTurn({
        extra_rolls: (store.currentTurn?.extra_rolls ?? 0) + 1,
      })
    }

    // Queue animation
    enqueueWithTokenRegistration(
      store,
      'token_capture',
      event,
      ANIMATION_DURATIONS.TOKEN_CAPTURE
    )
  },

  stack_formed: (event: StackFormedEvent, store: GameStore) => {
    // Add stack to player
    store.addStack(event.player_id, {
      stack_id: event.stack_id,
      tokens: event.token_ids,
    })

    // Queue animation
    enqueueWithTokenRegistration(
      store,
      'stack_form',
      event,
      ANIMATION_DURATIONS.STACK_FORM
    )
  },

  stack_dissolved: (event: StackDissolvedEvent, store: GameStore) => {
    // Use the results field to determine which tokens become individual vs stay in stacks
    // This prevents visual flicker from briefly showing tokens before new stacks form
    const tokensBecomingIndividual = new Set<string>()

    if (event.results) {
      for (const result of event.results) {
        if (result.type === 'token') {
          tokensBecomingIndividual.add(result.id)
        }
      }
    }

    // Remove the stack but only mark appropriate tokens as not in stack
    store.removeStackWithResults(event.player_id, event.stack_id, tokensBecomingIndividual)

    // Queue animation
    enqueueWithTokenRegistration(
      store,
      'stack_dissolve',
      event,
      ANIMATION_DURATIONS.STACK_FORM
    )
  },

  stack_moved: (event: StackMovedEvent, store: GameStore) => {
    // Update all tokens in stack
    const progressInHomestretch =
      event.to_progress >= (useGameStore.getState().boardSetup?.squares_to_homestretch ?? 52)

    event.token_ids.forEach((tokenId) => {
      store.updateToken(event.player_id, tokenId, {
        progress: event.to_progress,
        state: progressInHomestretch ? 'homestretch' : 'road',
      })
    })

    // Consume roll
    store.consumeRoll(event.roll_used)

    // Queue animation
    const duration =
      Math.abs(event.to_progress - event.from_progress) *
      ANIMATION_DURATIONS.TOKEN_MOVE_PER_SQUARE
    enqueueWithTokenRegistration(store, 'stack_move', event, duration)
  },

  awaiting_choice: (event: AwaitingChoiceEvent, store: GameStore) => {
    store.setCurrentEvent('player_choice')
    store.setLegalMoves(event.legal_moves)
    store.setRollToAllocate(event.roll_to_allocate)

    // Highlight legal moves if it's my turn
    const isMyTurn = event.player_id === store.myPlayerId
    if (isMyTurn) {
      // Use the parser to get highlightable entities (tokens and stacks)
      const entities = getHighlightableEntities(event.legal_moves)

      const highlighted: HighlightedToken[] = entities.map((entity) => ({
        tokenId: entity.id,           // Can be token_id OR stack_id
        playerId: event.player_id,
        type: 'selectable' as const,
        entityType: entity.type,      // 'token' or 'stack'
      }))
      store.setHighlightedTokens(highlighted)
    }
  },

  awaiting_capture_choice: (event: AwaitingCaptureChoiceEvent, store: GameStore) => {
    store.setCurrentEvent('capture_choice')

    // Parse options into capture options
    const options: CaptureOption[] = event.options.map((opt) => {
      if (opt === 'stack') {
        return { id: 'stack', label: 'Stack with your token', type: 'stack' as const }
      } else if (opt === 'capture') {
        return { id: 'capture', label: 'Capture enemy token', type: 'capture' as const }
      } else {
        return { id: opt, label: `Capture ${opt}`, type: 'target' as const }
      }
    })

    store.setCaptureOptions(options)

    // Show modal if it's my turn
    if (event.player_id === store.myPlayerId) {
      store.setShowCaptureChoiceModal(true)
    }
  },
}

/**
 * Process a single game event, updating store and queueing animations
 */
export function processEvent(event: GameEvent): void {
  const store = useGameStore.getState()
  const handler = handlers[event.event_type]

  if (handler) {
    handler(event, store)
  } else {
    console.warn(`No handler for event type: ${event.event_type}`)
  }

  // Add to event log
  const logEntry = createLogEntry(event, store.players)
  if (logEntry) {
    store.addLogEntry(logEntry)
  }
}

/**
 * Process multiple events in order
 */
export function processEvents(events: GameEvent[]): void {
  // Sort by sequence number
  const sorted = [...events].sort((a, b) => a.seq - b.seq)

  for (const event of sorted) {
    processEvent(event)
  }
}

/**
 * Apply a full game state (for reconnection)
 */
export function applyGameState(
  state: {
    phase: 'not_started' | 'in_progress' | 'finished'
    players: any[]
    current_event: 'player_roll' | 'player_choice' | 'capture_choice'
    board_setup: any
    current_turn: any
    event_seq: number
  },
  myPlayerId: string
): void {
  const store = useGameStore.getState()

  store.initializeFromGameState(
    {
      phase: state.phase,
      players: state.players,
      current_event: state.current_event,
      board_setup: state.board_setup,
      current_turn: state.current_turn,
      event_seq: state.event_seq,
    },
    myPlayerId
  )

  // Set current turn info
  if (state.current_turn) {
    store.setCurrentTurn(state.current_turn)
    store.setCurrentEvent(state.current_event)
    store.setLegalMoves(state.current_turn.legal_moves || [])
  }
}
