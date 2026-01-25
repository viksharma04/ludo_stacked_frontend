import {
  Application,
  Container,
  Graphics,
  FederatedPointerEvent,
} from 'pixi.js'
import { BoardGeometry } from '@/lib/game/boardGeometry'
import { TOKEN_VISUAL, Z_LAYERS } from '@/lib/game/constants'
import { PLAYER_COLORS, type Player, type Token, type PlayerColor } from '@/types/game'

interface TokenSprite {
  tokenId: string
  playerId: string
  playerColor: PlayerColor
  graphics: Graphics
  isHighlighted: boolean
  isSelected: boolean
}

export class TokenRenderer {
  private app: Application
  private geometry: BoardGeometry
  private container: Container
  private tokens: Map<string, TokenSprite> = new Map()
  private highlightedTokenIds: Set<string> = new Set()
  private selectedTokenId: string | null = null
  private clickHandler: ((tokenId: string) => void) | null = null
  private pulseTime = 0

  constructor(app: Application, geometry: BoardGeometry) {
    this.app = app
    this.geometry = geometry

    // Create container for tokens
    this.container = new Container()
    this.container.zIndex = Z_LAYERS.TOKENS_BASE
    this.container.sortableChildren = true
    this.app.stage.addChild(this.container)

    // Start animation loop for pulse effect
    this.app.ticker.add(this.animate.bind(this))
  }

  setGeometry(geometry: BoardGeometry): void {
    this.geometry = geometry
  }

  setClickHandler(handler: (tokenId: string) => void): void {
    this.clickHandler = handler
  }

  setHighlightedTokens(tokenIds: string[]): void {
    this.highlightedTokenIds = new Set(tokenIds)
    this.updateHighlightState()
  }

  setSelectedToken(tokenId: string | null): void {
    this.selectedTokenId = tokenId
    this.updateHighlightState()
  }

  updateTokens(players: Player[]): void {
    const currentTokenIds = new Set<string>()

    players.forEach((player) => {
      const tokenIndex: Record<string, number> = {}

      player.tokens.forEach((token, idx) => {
        currentTokenIds.add(token.token_id)

        // Track token index for hell positioning
        const stateKey = `${token.state}_${token.progress}`
        tokenIndex[stateKey] = (tokenIndex[stateKey] || 0)

        let sprite = this.tokens.get(token.token_id)

        if (!sprite) {
          // Create new token sprite
          sprite = this.createTokenSprite(
            token,
            player.player_id,
            player.color
          )
          this.tokens.set(token.token_id, sprite)
          this.container.addChild(sprite.graphics)
        }

        // Update position
        const position = this.geometry.getTokenPosition(
          player.color,
          player.abs_starting_index,
          token.state,
          token.progress,
          idx
        )

        sprite.graphics.x = position.x
        sprite.graphics.y = position.y

        // Update visibility based on stack state
        // Tokens in stacks should only show the top one
        sprite.graphics.visible = !token.in_stack

        tokenIndex[stateKey]++
      })
    })

    // Remove tokens that no longer exist
    for (const [tokenId, sprite] of this.tokens) {
      if (!currentTokenIds.has(tokenId)) {
        this.container.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.tokens.delete(tokenId)
      }
    }
  }

  private createTokenSprite(
    token: Token,
    playerId: string,
    playerColor: PlayerColor
  ): TokenSprite {
    const graphics = new Graphics()
    const colorConfig = PLAYER_COLORS[playerColor]
    const cellSize = this.geometry.getCellSize()
    const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

    // Draw token
    this.drawToken(graphics, radius, colorConfig.primary, colorConfig.secondary)

    // Make interactive
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'

    graphics.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.clickHandler && this.highlightedTokenIds.has(token.token_id)) {
        this.clickHandler(token.token_id)
      }
    })

    return {
      tokenId: token.token_id,
      playerId,
      playerColor,
      graphics,
      isHighlighted: false,
      isSelected: false,
    }
  }

  private drawToken(
    graphics: Graphics,
    radius: number,
    fillColor: number,
    strokeColor: number,
    scale: number = 1
  ): void {
    graphics.clear()

    const scaledRadius = radius * scale

    // Draw shadow
    graphics.circle(2, 2, scaledRadius)
    graphics.fill({ color: 0x000000, alpha: 0.3 })

    // Draw main circle
    graphics.circle(0, 0, scaledRadius)
    graphics.fill({ color: fillColor })

    // Draw outline
    graphics.circle(0, 0, scaledRadius)
    graphics.stroke({ color: strokeColor, width: TOKEN_VISUAL.OUTLINE_WIDTH })

    // Draw inner highlight
    graphics.circle(-scaledRadius * 0.3, -scaledRadius * 0.3, scaledRadius * 0.2)
    graphics.fill({ color: 0xffffff, alpha: 0.4 })
  }

  private updateHighlightState(): void {
    for (const [tokenId, sprite] of this.tokens) {
      const isHighlighted = this.highlightedTokenIds.has(tokenId)
      const isSelected = tokenId === this.selectedTokenId

      sprite.isHighlighted = isHighlighted
      sprite.isSelected = isSelected

      // Update z-index
      if (isSelected) {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED + 1
      } else if (isHighlighted) {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED
      } else {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      }

      // Update cursor
      sprite.graphics.cursor = isHighlighted ? 'pointer' : 'default'
    }
  }

  private animate(ticker: { deltaTime: number }): void {
    this.pulseTime += ticker.deltaTime * 0.05

    for (const [tokenId, sprite] of this.tokens) {
      if (sprite.isHighlighted || sprite.isSelected) {
        const colorConfig = PLAYER_COLORS[sprite.playerColor]
        const cellSize = this.geometry.getCellSize()
        const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

        // Pulse scale for highlighted tokens
        let scale = 1
        if (sprite.isSelected) {
          scale = TOKEN_VISUAL.SELECTED_SCALE
        } else if (sprite.isHighlighted) {
          scale = 1 + Math.sin(this.pulseTime * TOKEN_VISUAL.HIGHLIGHT_PULSE_SPEED) * 0.08
        }

        this.drawToken(
          sprite.graphics,
          radius,
          colorConfig.primary,
          sprite.isSelected ? 0xffffff : colorConfig.secondary,
          scale
        )

        // Add glow effect for highlighted tokens
        if (sprite.isHighlighted) {
          sprite.graphics.circle(0, 0, radius * scale * 1.2)
          sprite.graphics.stroke({
            color: 0xffffff,
            width: 3,
            alpha: 0.3 + Math.sin(this.pulseTime * 2) * 0.2,
          })
        }
      }
    }
  }

  // Move a token with animation (returns promise for animation completion)
  async animateTokenMove(
    tokenId: string,
    path: { x: number; y: number }[],
    durationPerSquare: number
  ): Promise<void> {
    const sprite = this.tokens.get(tokenId)
    if (!sprite || path.length === 0) return

    // Move sprite to higher z-index during animation
    sprite.graphics.zIndex = Z_LAYERS.TOKENS_MOVING

    for (const point of path) {
      await this.animateToPosition(sprite.graphics, point.x, point.y, durationPerSquare)
    }

    // Reset z-index
    sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
  }

  private animateToPosition(
    graphics: Graphics,
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startX = graphics.x
      const startY = graphics.y
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3)

        graphics.x = startX + (targetX - startX) * eased
        graphics.y = startY + (targetY - startY) * eased

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          graphics.x = targetX
          graphics.y = targetY
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  // Animate token entering from hell
  async animateExitHell(tokenId: string, targetPosition: { x: number; y: number }): Promise<void> {
    const sprite = this.tokens.get(tokenId)
    if (!sprite) return

    // Start from small scale
    sprite.graphics.scale.set(0.1)
    sprite.graphics.x = targetPosition.x
    sprite.graphics.y = targetPosition.y
    sprite.graphics.visible = true

    // Animate scale up with bounce
    await this.animateScale(sprite.graphics, 1, 500)
  }

  // Animate token reaching heaven
  async animateReachHeaven(tokenId: string): Promise<void> {
    const sprite = this.tokens.get(tokenId)
    if (!sprite) return

    // Animate scale up then fade out
    await this.animateScale(sprite.graphics, 1.5, 400)
    await this.animateFade(sprite.graphics, 0, 400)

    // Hide the token
    sprite.graphics.visible = false
    sprite.graphics.alpha = 1
    sprite.graphics.scale.set(1)
  }

  // Animate capture effect
  async animateCapture(
    capturingTokenId: string,
    capturedTokenId: string,
    capturedReturnPos: { x: number; y: number }
  ): Promise<void> {
    const capturedSprite = this.tokens.get(capturedTokenId)
    if (!capturedSprite) return

    // Flash effect on captured token
    await this.animateFlash(capturedSprite.graphics)

    // Animate back to hell
    await this.animateToPosition(
      capturedSprite.graphics,
      capturedReturnPos.x,
      capturedReturnPos.y,
      300
    )
  }

  private animateScale(graphics: Graphics, targetScale: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startScale = graphics.scale.x
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Bounce easing
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        const scale = startScale + (targetScale - startScale) * eased
        graphics.scale.set(scale)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          graphics.scale.set(targetScale)
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  private animateFade(graphics: Graphics, targetAlpha: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startAlpha = graphics.alpha
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        graphics.alpha = startAlpha + (targetAlpha - startAlpha) * progress

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          graphics.alpha = targetAlpha
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  private animateFlash(graphics: Graphics): Promise<void> {
    return new Promise((resolve) => {
      let flashes = 0
      const maxFlashes = 4
      const flashDuration = 80

      const flash = () => {
        graphics.alpha = graphics.alpha === 1 ? 0.3 : 1
        flashes++

        if (flashes < maxFlashes) {
          setTimeout(flash, flashDuration)
        } else {
          graphics.alpha = 1
          resolve()
        }
      }

      flash()
    })
  }

  // Get token graphics for direct manipulation
  getTokenGraphics(tokenId: string): Graphics | null {
    return this.tokens.get(tokenId)?.graphics ?? null
  }

  destroy(): void {
    this.app.ticker.remove(this.animate.bind(this))

    for (const sprite of this.tokens.values()) {
      sprite.graphics.destroy()
    }
    this.tokens.clear()
    this.container.destroy()
  }
}
