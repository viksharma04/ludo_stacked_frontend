import gsap from 'gsap'
import type { Graphics } from 'pixi.js'
import type { PixiApp } from './PixiApp'
import type { BoardGeometry } from '@/lib/game/boardGeometry'
import type {
  GameEvent,
  TokenMovedEvent,
  TokenExitedHellEvent,
  TokenReachedHeavenEvent,
  TokenCapturedEvent,
  StackFormedEvent,
  StackDissolvedEvent,
  StackMovedEvent,
  DiceRolledEvent,
  Player,
  PlayerColor,
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

  // Main entry point for playing an animation for a game event
  async playEventAnimation(event: GameEvent): Promise<void> {
    this.isPlaying = true

    try {
      switch (event.event_type) {
        case 'dice_rolled':
          await this.animateDiceRoll(event as DiceRolledEvent)
          break
        case 'token_moved':
          await this.animateTokenMove(event as TokenMovedEvent)
          break
        case 'token_exited_hell':
          await this.animateTokenExitHell(event as TokenExitedHellEvent)
          break
        case 'token_reached_heaven':
          await this.animateTokenReachHeaven(event as TokenReachedHeavenEvent)
          break
        case 'token_captured':
          await this.animateTokenCapture(event as TokenCapturedEvent)
          break
        case 'stack_formed':
          await this.animateStackForm(event as StackFormedEvent)
          break
        case 'stack_dissolved':
          await this.animateStackDissolve(event as StackDissolvedEvent)
          break
        case 'stack_moved':
          await this.animateStackMove(event as StackMovedEvent)
          break
        // Events without animations just update state
        case 'turn_started':
        case 'turn_ended':
        case 'awaiting_choice':
        case 'awaiting_capture_choice':
        case 'game_started':
        case 'game_ended':
        case 'three_sixes_penalty':
          // These are handled by state updates, no visual animation needed
          break
        default:
          console.warn(`Unknown event type for animation: ${event.event_type}`)
      }
    } finally {
      this.isPlaying = false
    }
  }

  private async animateDiceRoll(event: DiceRolledEvent): Promise<void> {
    const store = useGameStore.getState()

    // Set rolling state
    store.setDiceRolling(true)

    // Wait for dice animation duration
    await this.delay(this.getDuration(ANIMATION_DURATIONS.DICE_ROLL))

    // Set final value
    store.setDiceRolling(false)
    store.setDiceValue(event.value)
  }

  private async animateTokenMove(event: TokenMovedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    // Get player info
    const player = this.getPlayerById(event.player_id)
    if (!player) return

    // Calculate the path
    const path = geometry.getMovePath(
      player.color,
      player.abs_starting_index,
      event.from_progress,
      event.to_progress,
      event.from_state,
      event.to_state
    )

    // Animate through the path
    const durationPerSquare = this.getDuration(ANIMATION_DURATIONS.TOKEN_MOVE_PER_SQUARE)
    await tokenRenderer.animateTokenMove(event.token_id, path, durationPerSquare)
  }

  private async animateTokenExitHell(event: TokenExitedHellEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const player = this.getPlayerById(event.player_id)
    if (!player) return

    // Get starting position on road
    const targetPos = geometry.getTokenPosition(
      player.color,
      player.abs_starting_index,
      'road',
      0
    )

    await tokenRenderer.animateExitHell(event.token_id, targetPos)
  }

  private async animateTokenReachHeaven(event: TokenReachedHeavenEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    if (!tokenRenderer) return

    await tokenRenderer.animateReachHeaven(event.token_id)
  }

  private async animateTokenCapture(event: TokenCapturedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const capturedPlayer = this.getPlayerById(event.captured_player_id)
    if (!capturedPlayer) return

    // Get the return position (hell)
    const returnPos = geometry.getTokenPosition(
      capturedPlayer.color,
      capturedPlayer.abs_starting_index,
      'hell',
      0,
      0 // Token index in hell
    )

    await tokenRenderer.animateCapture(
      event.capturing_token_id,
      event.captured_token_id,
      returnPos
    )
  }

  private async animateStackForm(event: StackFormedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    if (!tokenRenderer) return

    // Animate tokens merging
    // For now, just update after a delay
    await this.delay(this.getDuration(ANIMATION_DURATIONS.STACK_FORM))
  }

  private async animateStackDissolve(event: StackDissolvedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    if (!tokenRenderer) return

    await this.delay(this.getDuration(ANIMATION_DURATIONS.STACK_FORM))
  }

  private async animateStackMove(event: StackMovedEvent): Promise<void> {
    const tokenRenderer = this.pixiApp.getTokenRenderer()
    const geometry = this.pixiApp.getGeometry()
    if (!tokenRenderer || !geometry) return

    const player = this.getPlayerById(event.player_id)
    if (!player) return

    // Move each token in the stack
    const path = geometry.getMovePath(
      player.color,
      player.abs_starting_index,
      event.from_progress,
      event.to_progress,
      'road',
      event.to_progress >= (geometry as any).boardSetup?.squares_to_homestretch
        ? 'homestretch'
        : 'road'
    )

    const durationPerSquare = this.getDuration(ANIMATION_DURATIONS.TOKEN_MOVE_PER_SQUARE)

    // Animate all tokens in stack together
    await Promise.all(
      event.token_ids.map((tokenId) =>
        tokenRenderer.animateTokenMove(tokenId, path, durationPerSquare)
      )
    )
  }

  private getPlayerById(playerId: string): Player | null {
    const state = useGameStore.getState()
    return state.players.find((p) => p.player_id === playerId) ?? null
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Kill any running animations
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
