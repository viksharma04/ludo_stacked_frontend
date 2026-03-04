import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
import { BoardGeometry } from '@/lib/game/boardGeometry'
import { TOKEN_VISUAL, Z_LAYERS } from '@/lib/game/constants'
import { PLAYER_COLORS, type Player, type PlayerColor, type HighlightedStack } from '@/types/game'

interface StackSprite {
  stackId: string
  playerId: string
  playerColor: PlayerColor
  graphics: Graphics
  badge: Container
  isHighlighted: boolean
  isSelected: boolean
}

export class TokenRenderer {
  private app: Application
  private geometry: BoardGeometry
  private container: Container
  private stacks: Map<string, StackSprite> = new Map()
  private highlightedStackIds: Set<string> = new Set()
  private animatingTokenIds: Set<string> = new Set()
  private selectedStackId: string | null = null
  private clickHandler: ((stackId: string) => void) | null = null
  private pulseTime = 0

  constructor(app: Application, geometry: BoardGeometry) {
    this.app = app
    this.geometry = geometry

    this.container = new Container()
    this.container.zIndex = Z_LAYERS.TOKENS_BASE
    this.container.sortableChildren = true
    this.app.stage.addChild(this.container)

    this.app.ticker.add(this.animate.bind(this))
  }

  setGeometry(geometry: BoardGeometry): void {
    this.geometry = geometry
  }

  setClickHandler(handler: (stackId: string) => void): void {
    this.clickHandler = handler
  }

  setHighlightedEntities(entities: HighlightedStack[]): void {
    this.highlightedStackIds.clear()
    for (const entity of entities) {
      this.highlightedStackIds.add(entity.stackId)
    }
    this.updateHighlightState()
  }

  setSelectedToken(stackId: string | null): void {
    this.selectedStackId = stackId
    this.updateHighlightState()
  }

  updateTokens(players: Player[], storeAnimatingTokenIds?: string[]): void {
    const currentStackIds = new Set<string>()

    players.forEach((player) => {
      player.stacks.forEach((stack, idx) => {
        currentStackIds.add(stack.stack_id)

        const isAnimating = this.animatingTokenIds.has(stack.stack_id) ||
          (storeAnimatingTokenIds?.includes(stack.stack_id) ?? false)

        let sprite = this.stacks.get(stack.stack_id)

        if (!sprite) {
          sprite = this.createStackSprite(
            stack.stack_id,
            player.player_id,
            player.color,
            stack.height
          )
          this.stacks.set(stack.stack_id, sprite)
          this.container.addChild(sprite.graphics)
        } else {
          this.updateBadgeCount(sprite, stack.height)
        }

        // Update position (skip if animating)
        if (!isAnimating) {
          const position = this.geometry.getTokenPosition(
            player.color,
            player.abs_starting_index,
            stack.state,
            stack.progress,
            idx
          )
          sprite.graphics.x = position.x
          sprite.graphics.y = position.y
        }

        // Hide stacks in heaven after animation
        sprite.graphics.visible = stack.state !== 'heaven' || isAnimating
      })
    })

    // Remove stacks that no longer exist
    for (const [stackId, sprite] of this.stacks) {
      if (!currentStackIds.has(stackId)) {
        this.container.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.stacks.delete(stackId)
      }
    }
  }

  private createStackSprite(
    stackId: string,
    playerId: string,
    playerColor: PlayerColor,
    height: number
  ): StackSprite {
    const graphics = new Graphics()
    const colorConfig = PLAYER_COLORS[playerColor]
    const cellSize = this.geometry.getCellSize()
    const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

    this.drawToken(graphics, radius, colorConfig.primary, colorConfig.secondary)

    // Create badge for stack height
    const badge = this.createStackBadge(radius)
    this.updateBadgeCount({ badge } as StackSprite, height)
    badge.visible = height > 1
    graphics.addChild(badge)

    // Make interactive
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'

    graphics.on('pointerdown', () => {
      if (this.clickHandler && this.highlightedStackIds.has(stackId)) {
        this.clickHandler(stackId)
      }
    })

    return {
      stackId,
      playerId,
      playerColor,
      graphics,
      badge,
      isHighlighted: false,
      isSelected: false,
    }
  }

  private createStackBadge(tokenRadius: number): Container {
    const badge = new Container()
    const badgeRadius = tokenRadius * 0.45

    badge.position.set(tokenRadius * 0.6, -tokenRadius * 0.6)

    const bg = new Graphics()
    bg.circle(0, 0, badgeRadius)
    bg.fill({ color: 0x000000, alpha: 0.8 })
    bg.circle(0, 0, badgeRadius)
    bg.stroke({ color: 0xffffff, width: 1.5 })
    badge.addChild(bg)

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: badgeRadius * 1.4,
      fill: 0xffffff,
      fontWeight: 'bold',
    })
    const text = new Text({ text: '2', style })
    text.anchor.set(0.5, 0.5)
    text.name = 'badgeText'
    badge.addChild(text)

    return badge
  }

  private updateBadgeCount(sprite: StackSprite, count: number): void {
    const text = sprite.badge.getChildByName('badgeText') as Text
    if (text) {
      text.text = String(count)
    }
    sprite.badge.visible = count > 1
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

    // Shadow
    graphics.circle(2, 2, scaledRadius)
    graphics.fill({ color: 0x000000, alpha: 0.3 })

    // Main circle
    graphics.circle(0, 0, scaledRadius)
    graphics.fill({ color: fillColor })

    // Outline
    graphics.circle(0, 0, scaledRadius)
    graphics.stroke({ color: strokeColor, width: TOKEN_VISUAL.OUTLINE_WIDTH })

    // Inner highlight
    graphics.circle(-scaledRadius * 0.3, -scaledRadius * 0.3, scaledRadius * 0.2)
    graphics.fill({ color: 0xffffff, alpha: 0.4 })
  }

  private updateHighlightState(): void {
    for (const [stackId, sprite] of this.stacks) {
      const isHighlighted = this.highlightedStackIds.has(stackId)
      const isSelected = stackId === this.selectedStackId

      sprite.isHighlighted = isHighlighted
      sprite.isSelected = isSelected

      if (isSelected) {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED + 1
      } else if (isHighlighted) {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED
      } else {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      }

      sprite.graphics.cursor = isHighlighted ? 'pointer' : 'default'
    }
  }

  private animate(ticker: { deltaTime: number }): void {
    this.pulseTime += ticker.deltaTime * 0.05

    for (const [, sprite] of this.stacks) {
      if (sprite.isHighlighted || sprite.isSelected) {
        const colorConfig = PLAYER_COLORS[sprite.playerColor]
        const cellSize = this.geometry.getCellSize()
        const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

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

        // Re-add badge after redrawing (drawToken clears graphics)
        if (!sprite.graphics.children.includes(sprite.badge)) {
          sprite.graphics.addChild(sprite.badge)
        }

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

  // Animation methods — now use stack_id as the key

  async animateTokenMove(
    stackId: string,
    path: { x: number; y: number }[],
    durationPerSquare: number,
    startPosition?: { x: number; y: number }
  ): Promise<void> {
    const sprite = this.stacks.get(stackId)
    if (!sprite || path.length === 0) return

    this.animatingTokenIds.add(stackId)

    if (startPosition) {
      sprite.graphics.x = startPosition.x
      sprite.graphics.y = startPosition.y
    }

    sprite.graphics.zIndex = Z_LAYERS.TOKENS_MOVING

    try {
      for (const point of path) {
        await this.animateToPosition(sprite.graphics, point.x, point.y, durationPerSquare)
      }
    } finally {
      sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      this.animatingTokenIds.delete(stackId)
    }
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

  async animateExitHell(stackId: string, targetPosition: { x: number; y: number }): Promise<void> {
    const sprite = this.stacks.get(stackId)
    if (!sprite) return

    this.animatingTokenIds.add(stackId)

    try {
      sprite.graphics.scale.set(0.1)
      sprite.graphics.x = targetPosition.x
      sprite.graphics.y = targetPosition.y
      sprite.graphics.visible = true

      await this.animateScale(sprite.graphics, 1, 500)
    } finally {
      this.animatingTokenIds.delete(stackId)
    }
  }

  async animateReachHeaven(stackId: string): Promise<void> {
    const sprite = this.stacks.get(stackId)
    if (!sprite) return

    this.animatingTokenIds.add(stackId)

    try {
      await this.animateScale(sprite.graphics, 1.5, 400)
      await this.animateFade(sprite.graphics, 0, 400)

      sprite.graphics.visible = false
      sprite.graphics.alpha = 1
      sprite.graphics.scale.set(1)
    } finally {
      this.animatingTokenIds.delete(stackId)
    }
  }

  async animateCapture(
    capturingStackId: string,
    capturedStackId: string,
    capturedReturnPos: { x: number; y: number }
  ): Promise<void> {
    const capturedSprite = this.stacks.get(capturedStackId)
    if (!capturedSprite) return

    this.animatingTokenIds.add(capturedStackId)

    try {
      await this.animateFlash(capturedSprite.graphics)
      await this.animateToPosition(
        capturedSprite.graphics,
        capturedReturnPos.x,
        capturedReturnPos.y,
        300
      )
    } finally {
      this.animatingTokenIds.delete(capturedStackId)
    }
  }

  private animateScale(graphics: Graphics, targetScale: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startScale = graphics.scale.x
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
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

  getTokenGraphics(stackId: string): Graphics | null {
    return this.stacks.get(stackId)?.graphics ?? null
  }

  getStackGraphics(stackId: string): Graphics | null {
    return this.stacks.get(stackId)?.graphics ?? null
  }

  destroy(): void {
    this.app.ticker.remove(this.animate.bind(this))

    for (const sprite of this.stacks.values()) {
      sprite.graphics.destroy()
    }
    this.stacks.clear()

    this.container.destroy()
  }
}
