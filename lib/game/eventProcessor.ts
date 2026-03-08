import type {
  GameEvent,
  GameStartedEvent,
  GameEndedEvent,
  TurnStartedEvent,
  TurnEndedEvent,
  RollGrantedEvent,
  DiceRolledEvent,
  ThreeSixesPenaltyEvent,
  StackMovedEvent,
  StackExitedHellEvent,
  StackReachedHeavenEvent,
  StackCapturedEvent,
  StackUpdateEvent,
  AwaitingChoiceEvent,
  AwaitingCaptureChoiceEvent,
  AnimationQueueItem,
  AnimationType,
  CaptureOption,
  HighlightedStack,
  GameState,
} from '@/types/game'
import { ANIMATION_DURATIONS } from './constants'
import { useGameStore, type GameStore } from '@/stores/gameStore'
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

// Build composite key for animating token tracking: `${playerId}:${stackId}`
function makeCompositeKey(playerId: string, stackId: string): string {
  return `${playerId}:${stackId}`
}

// Extract composite keys (playerId:stackId) that will be animated from an event
function getAnimatedStackIds(event: GameEvent): string[] {
  switch (event.event_type) {
    case 'stack_moved': {
      const e = event as StackMovedEvent
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_exited_hell': {
      const e = event as StackExitedHellEvent
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_reached_heaven': {
      const e = event as StackReachedHeavenEvent
      return [makeCompositeKey(e.player_id, e.stack_id)]
    }
    case 'stack_captured': {
      const e = event as StackCapturedEvent
      return [
        makeCompositeKey(e.capturing_player_id, e.capturing_stack_id),
        makeCompositeKey(e.captured_player_id, e.captured_stack_id),
      ]
    }
    case 'stack_update': {
      const e = event as StackUpdateEvent
      return [
        ...e.add_stacks.map(s => makeCompositeKey(e.player_id, s.stack_id)),
        ...e.remove_stacks.map(s => makeCompositeKey(e.player_id, s.stack_id)),
      ]
    }
    default:
      return []
  }
}

// Pre-register stack IDs as animating BEFORE any store updates
// to prevent position jumps when Zustand subscribers fire
function registerAnimatingStacks(store: GameStore, event: GameEvent): void {
  const stackIds = getAnimatedStackIds(event)
  if (stackIds.length > 0) {
    store.addAnimatingTokens(stackIds)
  }
}

// Event handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, EventHandler<any>> = {
  game_started: (event: GameStartedEvent, store: GameStore) => {
    store.setPhase('in_progress')
  },

  game_ended: (event: GameEndedEvent, store: GameStore) => {
    store.setPhase('finished')
    store.setWinner(event.winner_id, event.final_rankings)
  },

  turn_started: (event: TurnStartedEvent, store: GameStore) => {
    const player = store.players.find((p) => p.player_id === event.player_id)
    const isMyTurn = event.player_id === store.myPlayerId

    if (player) {
      store.setTurnTransition({
        playerName: player.name,
        playerColor: player.color,
        isMyTurn,
      })

      setTimeout(() => {
        store.setTurnTransition(null)
      }, ANIMATION_DURATIONS.TURN_TRANSITION + 1500)
    }

    store.setCurrentTurn({
      player_id: event.player_id,
      initial_roll: true,
      rolls_to_allocate: [],
      legal_moves: [],
      current_turn_order: event.turn_number,
      extra_rolls: 0,
      pending_capture: null,
    })
    store.clearHighlightedTokens()
    store.setDiceValue(null)
    store.setRollReason(null)
  },

  turn_ended: (event: TurnEndedEvent, store: GameStore) => {
    store.clearHighlightedTokens()
    store.setDiceValue(null)
    store.setRollReason(null)
  },

  roll_granted: (event: RollGrantedEvent, store: GameStore) => {
    store.setCurrentEvent('player_roll')
    store.setRollReason(event.reason)
  },

  dice_rolled: (event: DiceRolledEvent, store: GameStore) => {
    const isMyRoll = event.player_id === store.myPlayerId

    if (event.grants_extra_roll) {
      store.updateTurn({ extra_rolls: (store.currentTurn?.extra_rolls ?? 0) + 1 })
    }
    store.addRoll(event.value)

    store.enqueueAnimation(
      createAnimationItem('dice_roll', event, ANIMATION_DURATIONS.DICE_ROLL)
    )

    if (isMyRoll) {
      store.setDiceValue(event.value)
    } else {
      store.setDiceRolling(true)

      setTimeout(() => {
        store.setDiceValue(event.value)
        store.setDiceRolling(false)
      }, ANIMATION_DURATIONS.DICE_ROLL)
    }
  },

  three_sixes_penalty: (event: ThreeSixesPenaltyEvent, store: GameStore) => {
    store.setShowPenaltyAnimation(true, event.player_id)
    setTimeout(() => {
      store.setShowPenaltyAnimation(false)
    }, ANIMATION_DURATIONS.PENALTY_DISPLAY)
  },

  stack_moved: (event: StackMovedEvent, store: GameStore) => {
    registerAnimatingStacks(store, event)
    store.updateStackById(event.player_id, event.stack_id, {
      state: event.to_state,
      progress: event.to_progress,
    })
    store.consumeRoll(event.roll_used)

    const duration =
      Math.abs(event.to_progress - event.from_progress) *
      ANIMATION_DURATIONS.STACK_MOVE_PER_SQUARE
    store.enqueueAnimation(createAnimationItem('stack_move', event, duration))
  },

  stack_exited_hell: (event: StackExitedHellEvent, store: GameStore) => {
    registerAnimatingStacks(store, event)
    store.updateStackById(event.player_id, event.stack_id, {
      state: 'road',
      progress: 0,
    })
    store.consumeRoll(event.roll_used)
    store.enqueueAnimation(createAnimationItem('stack_exit_hell', event, ANIMATION_DURATIONS.STACK_EXIT_HELL))
  },

  stack_reached_heaven: (event: StackReachedHeavenEvent, store: GameStore) => {
    registerAnimatingStacks(store, event)
    store.updateStackById(event.player_id, event.stack_id, {
      state: 'heaven',
    })
    store.enqueueAnimation(createAnimationItem('stack_reach_heaven', event, ANIMATION_DURATIONS.STACK_REACH_HEAVEN))
  },

  stack_captured: (event: StackCapturedEvent, store: GameStore) => {
    if (event.grants_extra_roll) {
      store.updateTurn({
        extra_rolls: (store.currentTurn?.extra_rolls ?? 0) + 1,
      })
    }
    registerAnimatingStacks(store, event)
    store.updateStackById(event.captured_player_id, event.captured_stack_id, {
      state: 'hell',
      progress: 0,
    })
    store.enqueueAnimation(createAnimationItem('stack_capture', event, ANIMATION_DURATIONS.STACK_CAPTURE))
  },

  stack_update: (event: StackUpdateEvent, store: GameStore) => {
    registerAnimatingStacks(store, event)
    for (const removed of event.remove_stacks) {
      store.removeStack(event.player_id, removed.stack_id)
    }
    for (const added of event.add_stacks) {
      store.addStack(event.player_id, added)
    }
    store.enqueueAnimation(createAnimationItem('stack_update', event, ANIMATION_DURATIONS.STACK_UPDATE))
  },

  awaiting_choice: (event: AwaitingChoiceEvent, store: GameStore) => {
    store.setCurrentEvent('player_choice')
    store.setAvailableMoves(event.available_moves)

    if (event.player_id === store.myPlayerId) {
      // Flatten available_moves to get all selectable stack IDs
      const stackIds = new Set<string>()
      for (const rollGroup of event.available_moves) {
        for (const moveGroup of rollGroup.move_groups) {
          stackIds.add(moveGroup.stack_id)
        }
      }
      const highlighted: HighlightedStack[] = Array.from(stackIds).map(stackId => ({
        stackId,
        playerId: event.player_id,
        type: 'selectable' as const,
      }))
      store.setHighlightedTokens(highlighted)
    }
  },

  awaiting_capture_choice: (event: AwaitingCaptureChoiceEvent, store: GameStore) => {
    store.setCurrentEvent('capture_choice')

    const options: CaptureOption[] = event.options.map(opt => {
      const [playerId, stackId] = opt.split(':')
      const player = store.players.find(p => p.player_id === playerId)
      const stack = player?.stacks.find(s => s.stack_id === stackId)
      return {
        target: opt,
        playerColor: player?.color ?? 'red',
        stackId,
        stackHeight: stack?.height ?? 1,
      }
    })

    store.setCaptureOptions(options)

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
  const sorted = [...events].sort((a, b) => a.seq - b.seq)

  for (const event of sorted) {
    processEvent(event)
  }
}

/**
 * Apply a full game state (for reconnection)
 */
export function applyGameState(
  state: GameState,
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

  if (state.current_turn) {
    store.setCurrentTurn(state.current_turn)
    store.setCurrentEvent(state.current_event)
  }
}
