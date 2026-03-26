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
import { useGameStore } from '@/stores/gameStore'

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
  // Keyed by composite key: `${playerId}:${stackId}`
  private stacks: Map<string, StackSprite> = new Map()
  private highlightedKeys: Set<string> = new Set()
  private animatingTokenIds: Set<string> = new Set()
  private pendingAnimationKeys: Set<string> = new Set()
  private selectedKey: string | null = null
  private clickHandler: ((stackId: string, screenX: number, screenY: number) => void) | null = null
  private pulseTime = 0

  private static makeKey(playerId: string, stackId: string): string {
    return `${playerId}:${stackId}`
  }

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

  setClickHandler(handler: (stackId: string, screenX: number, screenY: number) => void): void {
    this.clickHandler = handler
  }

  setHighlightedEntities(entities: HighlightedStack[]): void {
    this.highlightedKeys.clear()
    for (const entity of entities) {
      this.highlightedKeys.add(TokenRenderer.makeKey(entity.playerId, entity.stackId))
    }
    this.updateHighlightState()
  }

  setSelectedToken(stackId: string | null, playerId?: string | null): void {
    this.selectedKey = stackId && playerId
      ? TokenRenderer.makeKey(playerId, stackId)
      : null
    this.updateHighlightState()
  }

  updateTokens(players: Player[], storeAnimatingTokenIds?: string[]): void {
    const currentKeys = new Set<string>()
    // Track base positions for non-animating stacks to detect sharing
    const positionGroups = new Map<string, string[]>() // "x,y" -> keys[]

    // First pass: create/update sprites, compute base positions
    players.forEach((player) => {
      player.stacks.forEach((stack, idx) => {
        const key = TokenRenderer.makeKey(player.player_id, stack.stack_id)
        currentKeys.add(key)

        const isAnimating = this.animatingTokenIds.has(key) ||
          (storeAnimatingTokenIds?.includes(key) ?? false)

        let sprite = this.stacks.get(key)

        if (!sprite) {
          sprite = this.createStackSprite(
            stack.stack_id,
            player.player_id,
            player.color,
            stack.height
          )
          this.stacks.set(key, sprite)
          this.container.addChild(sprite.graphics)

          // Hide newly created sprites that are pending animation (e.g. merge results)
          if (isAnimating) {
            this.pendingAnimationKeys.add(key)
          }
        } else {
          this.updateBadgeCount(sprite, stack.height)
          // Clear pending state once animation is done
          if (!isAnimating) {
            this.pendingAnimationKeys.delete(key)
          }
        }

        // Compute base position (skip if animating)
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

          // Group by base position for offset calculation
          if (stack.state !== 'heaven' && stack.state !== 'hell') {
            const posKey = `${Math.round(position.x)},${Math.round(position.y)}`
            if (!positionGroups.has(posKey)) {
              positionGroups.set(posKey, [])
            }
            positionGroups.get(posKey)!.push(key)
          }
        }

        // Hide stacks in heaven after animation; hide pending animation sprites
        const isPending = this.pendingAnimationKeys.has(key)
        sprite.graphics.visible = (stack.state !== 'heaven' || isAnimating) && !isPending
      })
    })

    // Second pass: apply x-offsets for stacks sharing the same position
    const cellSize = this.geometry.getCellSize()
    const offsetStep = cellSize * 0.3

    for (const [, keys] of positionGroups) {
      if (keys.length <= 1) continue
      const totalWidth = (keys.length - 1) * offsetStep
      keys.forEach((key, i) => {
        const sprite = this.stacks.get(key)
        if (sprite) {
          sprite.graphics.x += -totalWidth / 2 + i * offsetStep
        }
      })
    }

    // Remove stacks that no longer exist (skip if still animating)
    for (const [key, sprite] of this.stacks) {
      if (!currentKeys.has(key)) {
        const isAnimating = this.animatingTokenIds.has(key) ||
          (storeAnimatingTokenIds?.includes(key) ?? false)
        if (isAnimating) continue
        this.container.removeChild(sprite.graphics)
        sprite.graphics.destroy()
        this.stacks.delete(key)
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
    const badge = this.createStackBadge(radius, colorConfig.secondary)
    this.updateBadgeCount({ badge } as StackSprite, height)
    badge.visible = height > 1
    graphics.addChild(badge)

    // Make interactive
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'

    graphics.on('pointerdown', () => {
      const key = TokenRenderer.makeKey(playerId, stackId)
      if (this.clickHandler && this.highlightedKeys.has(key)) {
        // Get screen position relative to canvas
        const bounds = this.app.canvas.getBoundingClientRect()
        const globalPos = graphics.toGlobal({ x: 0, y: 0 })
        const screenX = globalPos.x + bounds.left
        const screenY = globalPos.y + bounds.top
        this.clickHandler(stackId, screenX, screenY)
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

  private createStackBadge(tokenRadius: number, playerColor: number): Container {
    const badge = new Container()
    const badgeRadius = tokenRadius * 0.45

    badge.position.set(tokenRadius * 0.6, -tokenRadius * 0.6)

    const bg = new Graphics()
    bg.circle(0, 0, badgeRadius)
    bg.fill({ color: playerColor })
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
    const w = scaledRadius * 1.5
    const h = scaledRadius * 1.8

    // Shield path helper: flat top with rounded shoulders, tapers to a point at bottom
    const drawShield = (ox: number, oy: number) => {
      const top = oy - h / 2
      const bottom = oy + h / 2
      const left = ox - w / 2
      const right = ox + w / 2
      const r = w * 0.25 // shoulder radius

      graphics.moveTo(left + r, top)
      graphics.lineTo(right - r, top)
      graphics.quadraticCurveTo(right, top, right, top + r)
      graphics.lineTo(right, oy)
      graphics.quadraticCurveTo(right, bottom - h * 0.15, ox, bottom)
      graphics.quadraticCurveTo(left, bottom - h * 0.15, left, oy)
      graphics.lineTo(left, top + r)
      graphics.quadraticCurveTo(left, top, left + r, top)
      graphics.closePath()
    }

    // Shadow
    drawShield(2, 2)
    graphics.fill({ color: 0x000000, alpha: 0.1 })

    // Main shape
    drawShield(0, 0)
    graphics.fill({ color: fillColor, alpha: 0.4 })

    // Outline
    drawShield(0, 0)
    graphics.stroke({ color: strokeColor, width: TOKEN_VISUAL.OUTLINE_WIDTH })

    // Inner highlight
    graphics.circle(-scaledRadius * 0.2, -scaledRadius * 0.25, scaledRadius * 0.15)
    graphics.fill({ color: 0xffffff, alpha: 0.4 })
  }

  private updateHighlightState(): void {
    for (const [key, sprite] of this.stacks) {
      const isHighlighted = this.highlightedKeys.has(key)
      const isSelected = key === this.selectedKey

      const wasActive = sprite.isHighlighted || sprite.isSelected
      const isActive = isHighlighted || isSelected

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

      // Redraw at normal scale when transitioning out of highlight/selected state
      // to clear the frozen pulse scale and glow outline
      if (wasActive && !isActive) {
        const colorConfig = PLAYER_COLORS[sprite.playerColor]
        const cellSize = this.geometry.getCellSize()
        const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO
        this.drawToken(sprite.graphics, radius, colorConfig.primary, colorConfig.secondary)
        if (!sprite.graphics.children.includes(sprite.badge)) {
          sprite.graphics.addChild(sprite.badge)
        }
      }
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
          const hRadius = radius * scale * 1.2
          const hw = hRadius * 1.5
          const hh = hRadius * 1.8
          const hTop = -hh / 2
          const hBottom = hh / 2
          const hLeft = -hw / 2
          const hRight = hw / 2
          const hr = hw * 0.25

          sprite.graphics.moveTo(hLeft + hr, hTop)
          sprite.graphics.lineTo(hRight - hr, hTop)
          sprite.graphics.quadraticCurveTo(hRight, hTop, hRight, hTop + hr)
          sprite.graphics.lineTo(hRight, 0)
          sprite.graphics.quadraticCurveTo(hRight, hBottom - hh * 0.15, 0, hBottom)
          sprite.graphics.quadraticCurveTo(hLeft, hBottom - hh * 0.15, hLeft, 0)
          sprite.graphics.lineTo(hLeft, hTop + hr)
          sprite.graphics.quadraticCurveTo(hLeft, hTop, hLeft + hr, hTop)
          sprite.graphics.closePath()
          sprite.graphics.stroke({
            color: colorConfig.secondary,
            width: 3,
            alpha: 0.3 + Math.sin(this.pulseTime * 2) * 0.2,
          })
        }
      }
    }
  }

  // Animation methods — use composite key `${playerId}:${stackId}`

  async animateTokenMove(
    playerId: string,
    stackId: string,
    path: { x: number; y: number }[],
    durationPerSquare: number,
    startPosition?: { x: number; y: number }
  ): Promise<void> {
    const key = TokenRenderer.makeKey(playerId, stackId)
    const sprite = this.stacks.get(key)
    if (!sprite || path.length === 0) return

    this.animatingTokenIds.add(key)

    if (startPosition) {
      sprite.graphics.x = startPosition.x
      sprite.graphics.y = startPosition.y
    }

    sprite.graphics.zIndex = Z_LAYERS.TOKENS_MOVING

    try {
      for (const point of path) {
        if (!sprite.graphics || sprite.graphics.destroyed) break
        await this.animateToPosition(sprite.graphics, point.x, point.y, durationPerSquare)
      }
    } finally {
      if (sprite.graphics && !sprite.graphics.destroyed) {
        sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      }
      this.animatingTokenIds.delete(key)
      this.cleanupIfOrphaned(key)
    }
  }

  private animateToPosition(
    graphics: Graphics | null,
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    if (!graphics || graphics.destroyed) return Promise.resolve()
    return new Promise((resolve) => {
      const startX = graphics.x
      const startY = graphics.y
      const startTime = Date.now()

      const animate = () => {
        if (graphics.destroyed) { resolve(); return }
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

  async animateExitHell(playerId: string, stackId: string, targetPosition: { x: number; y: number }): Promise<void> {
    const key = TokenRenderer.makeKey(playerId, stackId)
    const sprite = this.stacks.get(key)
    if (!sprite) return

    this.animatingTokenIds.add(key)

    try {
      sprite.graphics.scale.set(0.1)
      sprite.graphics.x = targetPosition.x
      sprite.graphics.y = targetPosition.y
      sprite.graphics.visible = true

      await this.animateScale(sprite.graphics, 1, 500)
    } finally {
      this.animatingTokenIds.delete(key)
    }
  }

  async animateReachHeaven(playerId: string, stackId: string): Promise<void> {
    const key = TokenRenderer.makeKey(playerId, stackId)
    const sprite = this.stacks.get(key)
    if (!sprite) return

    this.animatingTokenIds.add(key)

    try {
      await this.animateScale(sprite.graphics, 1.5, 400)
      await this.animateFade(sprite.graphics, 0, 400)

      sprite.graphics.visible = false
      sprite.graphics.alpha = 1
      sprite.graphics.scale.set(1)
    } finally {
      this.animatingTokenIds.delete(key)
    }
  }

  async animateCapture(
    capturingPlayerId: string,
    capturingStackId: string,
    capturedPlayerId: string,
    capturedStackId: string,
    capturedReturnPos: { x: number; y: number }
  ): Promise<void> {
    const capturedKey = TokenRenderer.makeKey(capturedPlayerId, capturedStackId)
    const capturedSprite = this.stacks.get(capturedKey)
    if (!capturedSprite) return

    this.animatingTokenIds.add(capturedKey)

    try {
      await this.animateFlash(capturedSprite.graphics)
      await this.animateToPosition(
        capturedSprite.graphics,
        capturedReturnPos.x,
        capturedReturnPos.y,
        300
      )
    } finally {
      this.animatingTokenIds.delete(capturedKey)
    }
  }

  private animateScale(graphics: Graphics, targetScale: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startScale = graphics.scale.x
      const startTime = Date.now()

      const animate = () => {
        if (graphics.destroyed) { resolve(); return }
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
        if (graphics.destroyed) { resolve(); return }
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
        if (graphics.destroyed) { resolve(); return }
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

  /**
   * Clean up a sprite that was kept alive for animation but no longer exists in state.
   */
  private cleanupIfOrphaned(key: string): void {
    const sprite = this.stacks.get(key)
    if (!sprite) return

    // If the sprite's graphics was already destroyed externally, just remove from map
    if (sprite.graphics.destroyed) {
      this.stacks.delete(key)
      return
    }

    // Check if any player still has this stack — if not, destroy it now
    const store = useGameStore.getState()
    const stillExists = store.players.some(p =>
      p.stacks.some(s => TokenRenderer.makeKey(p.player_id, s.stack_id) === key)
    )

    if (!stillExists) {
      this.container.removeChild(sprite.graphics)
      sprite.graphics.destroy()
      this.stacks.delete(key)
    }
  }

  getTokenGraphics(playerId: string, stackId: string): Graphics | null {
    return this.stacks.get(TokenRenderer.makeKey(playerId, stackId))?.graphics ?? null
  }

  getStackGraphics(playerId: string, stackId: string): Graphics | null {
    return this.stacks.get(TokenRenderer.makeKey(playerId, stackId))?.graphics ?? null
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
