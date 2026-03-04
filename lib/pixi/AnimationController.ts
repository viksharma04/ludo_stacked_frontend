import gsap from 'gsap'
import type { PixiApp } from './PixiApp'
import type {
  GameEvent,
  StackMovedEvent,
  StackExitedHellEvent,
  StackReachedHeavenEvent,
  StackCapturedEvent,
  StackUpdateEvent,
  DiceRolledEvent,
  Player,
} from '@/types/game'
import { ANIMATION_DURATIONS, FAST_FORWARD_SPEED } from '@/lib/game/constants'
import { useGameStore } from '@/stores/gameStore'

export class AnimationController {
  private pixiApp: PixiApp
  private isPlaying = false
  private isFastForward = false
  private currentTimeline: gsap.core.Timeline | null = null

  constructor(pixiApp: PixiApp) {
    this.pixiApp = pixiApp
  }

  setFastForward(enabled: boolean): void {
    this.isFastForward = enabled
    if (this.currentTimeline) {
      this.currentTimeline.timeScale(enabled ? 1 / FAST_FORWARD_SPEED : 1)
    }
  }

  private getDuration(baseDuration: number): number {
    return this.isFastForward ? baseDuration * FAST_FORWARD_SPEED : baseDuration
  }

  async playEventAnimation(event: GameEvent): Promise<void> {
    this.isPlaying = true

    try {
      switch (event.event_type) {
        case 'dice_rolled':
          await this.animateDiceRoll(event as DiceRolledEvent)
          break
        case 'stack_moved':
          await this.animateStackMove(event as StackMovedEvent)
          break
        case 'stack_exited_hell':
          await this.animateStackExitHell(event as StackExitedHellEvent)
          break
        case 'stack_reached_heaven':
          await this.animateStackReachHeaven(event as StackReachedHeavenEvent)
          break
        case 'stack_captured':
          await this.animateStackCapture(event as StackCapturedEvent)
          break
        case 'stack_update':
          await this.animateStackUpdate(event as StackUpdateEvent)
          break
        case 'turn_started':
        case 'turn_ended':
        case 'awaiting_choice':
        case 'awaiting_capture_choice':
        case 'game_started':
        case 'game_ended':
        case 'three_sixes_penalty':
        case 'roll_granted':
          break
        default:
          console.warn(`Unknown event type for animation: ${(event as GameEvent).event_type}`)
      }
    } finally {
      this.isPlaying = false
    }
  }

  private async animateDiceRoll(event: DiceRolledEvent): Promise<void> {
    const store = useGameStore.getState()

    store.setDiceRolling(true)
    await this.delay(this.getDuration(ANIMATION_DURATIONS.DICE_ROLL))
    store.setDiceRolling(false)
    store.setDiceValue(event.value)
  }

  private async animateStackMove(event: StackMovedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const player = this.getPlayerById(event.player_id)
    if (!player) return

    const startPosition = geometry.getTokenPosition(
      player.color,
      player.abs_starting_index,
      event.from_state,
      event.from_progress
    )

    const path = geometry.getMovePath(
      player.color,
      player.abs_starting_index,
      event.from_progress,
      event.to_progress,
      event.from_state,
      event.to_state
    )

    const durationPerSquare = this.getDuration(ANIMATION_DURATIONS.STACK_MOVE_PER_SQUARE)
    await tokenRenderer.animateTokenMove(event.player_id, event.stack_id, path, durationPerSquare, startPosition)
  }

  private async animateStackExitHell(event: StackExitedHellEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const player = this.getPlayerById(event.player_id)
    if (!player) return

    const targetPos = geometry.getTokenPosition(
      player.color,
      player.abs_starting_index,
      'road',
      0
    )

    await tokenRenderer.animateExitHell(event.player_id, event.stack_id, targetPos)
  }

  private async animateStackReachHeaven(event: StackReachedHeavenEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    if (!tokenRenderer) return

    await tokenRenderer.animateReachHeaven(event.player_id, event.stack_id)
  }

  private async animateStackCapture(event: StackCapturedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const capturedPlayer = this.getPlayerById(event.captured_player_id)
    if (!capturedPlayer) return

    const returnPos = geometry.getTokenPosition(
      capturedPlayer.color,
      capturedPlayer.abs_starting_index,
      'hell',
      0,
      0
    )

    await tokenRenderer.animateCapture(
      event.capturing_player_id,
      event.capturing_stack_id,
      event.captured_player_id,
      event.captured_stack_id,
      returnPos
    )
  }

  private async animateStackUpdate(_event: StackUpdateEvent): Promise<void> {
    await this.delay(this.getDuration(ANIMATION_DURATIONS.STACK_UPDATE))
  }

  private getPlayerById(playerId: string): Player | null {
    const state = useGameStore.getState()
    return state.players.find((p) => p.player_id === playerId) ?? null
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  stop(): void {
    if (this.currentTimeline) {
      this.currentTimeline.kill()
      this.currentTimeline = null
    }
    this.isPlaying = false
  }

  isAnimating(): boolean {
    return this.isPlaying
  }
}
