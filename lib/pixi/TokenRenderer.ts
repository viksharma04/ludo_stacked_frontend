import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
import { BoardGeometry } from '@/lib/game/boardGeometry'
import { TOKEN_VISUAL, Z_LAYERS } from '@/lib/game/constants'
import { PLAYER_COLORS, type Player, type Token, type PlayerColor, type ParsedLegalMove } from '@/types/game'

interface TokenSprite {
  tokenId: string
  playerId: string
  playerColor: PlayerColor
  graphics: Graphics
  stackBadge: Container
  isHighlighted: boolean
  isSelected: boolean
}

interface SplitOption {
  graphics: Graphics
  rawId: string
}

export class TokenRenderer {
  private app: Application
  private geometry: BoardGeometry
  private container: Container
  private splitOptionsContainer: Container
  private tokens: Map<string, TokenSprite> = new Map()
  private splitOptions: SplitOption[] = []
  private highlightedTokenIds: Set<string> = new Set()
  private animatingTokenIds: Set<string> = new Set()
  private selectedTokenId: string | null = null
  private clickHandler: ((tokenId: string) => void) | null = null
  private splitOptionSelectHandler: ((rawId: string) => void) | null = null
  private pulseTime = 0

  /**
   * Deterministically select lead token from a stack.
   * Uses lowest token number to ensure all clients agree.
   */
  private getLeadTokenId(tokens: string[]): string | null {
    if (tokens.length === 0) return null

    // Sort tokens by their numeric suffix (e.g., token_1 < token_2)
    return tokens.slice().sort((a, b) => {
      const numA = parseInt(a.split('_').pop() || '0', 10)
      const numB = parseInt(b.split('_').pop() || '0', 10)
      return numA - numB
    })[0]
  }

  constructor(app: Application, geometry: BoardGeometry) {
    this.app = app
    this.geometry = geometry

    // Create container for tokens
    this.container = new Container()
    this.container.zIndex = Z_LAYERS.TOKENS_BASE
    this.container.sortableChildren = true
    this.app.stage.addChild(this.container)

    // Create container for split options overlay
    this.splitOptionsContainer = new Container()
    this.splitOptionsContainer.zIndex = Z_LAYERS.UI_OVERLAY
    this.app.stage.addChild(this.splitOptionsContainer)

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

    // Build a map of lead token IDs to stack size
    // Lead token is deterministically selected (lowest token number) to ensure all clients agree
    const leadTokenStackSize = new Map<string, number>()
    players.forEach((player) => {
      player.stacks?.forEach((stack) => {
        const leadToken = this.getLeadTokenId(stack.tokens)
        if (leadToken) {
          leadTokenStackSize.set(leadToken, stack.tokens.length)
        }
      })
    })

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

        // Update position (skip if token is being animated)
        if (!this.animatingTokenIds.has(token.token_id)) {
          const position = this.geometry.getTokenPosition(
            player.color,
            player.abs_starting_index,
            token.state,
            token.progress,
            idx
          )

          sprite.graphics.x = position.x
          sprite.graphics.y = position.y
        }

        // Update visibility based on stack state
        // Show token if it's not in a stack, OR if it's the lead token of a stack
        const stackSize = leadTokenStackSize.get(token.token_id)
        const isLeadToken = stackSize !== undefined
        sprite.graphics.visible = !token.in_stack || isLeadToken

        // Update stack badge
        if (isLeadToken && stackSize > 1) {
          this.updateStackBadge(sprite, stackSize)
          sprite.stackBadge.visible = true
        } else {
          sprite.stackBadge.visible = false
          // Clear text to prevent stale content if re-render timing is off
          const text = sprite.stackBadge.getChildByName('badgeText') as Text
          if (text) text.text = ''
        }

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

    // Create stack badge container (positioned at top-right of token)
    const stackBadge = this.createStackBadge(radius)
    stackBadge.visible = false
    graphics.addChild(stackBadge)

    // Make interactive
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'

    graphics.on('pointerdown', () => {
      if (this.clickHandler && this.highlightedTokenIds.has(token.token_id)) {
        this.clickHandler(token.token_id)
      }
    })

    return {
      tokenId: token.token_id,
      playerId,
      playerColor,
      graphics,
      stackBadge,
      isHighlighted: false,
      isSelected: false,
    }
  }

  private createStackBadge(tokenRadius: number): Container {
    const badge = new Container()
    const badgeRadius = tokenRadius * 0.45

    // Position at top-right corner of token
    badge.position.set(tokenRadius * 0.6, -tokenRadius * 0.6)

    // Background circle
    const bg = new Graphics()
    bg.circle(0, 0, badgeRadius)
    bg.fill({ color: 0x000000, alpha: 0.8 })
    bg.circle(0, 0, badgeRadius)
    bg.stroke({ color: 0xffffff, width: 1.5 })
    badge.addChild(bg)

    // Text (will be updated later)
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

  private updateStackBadge(sprite: TokenSprite, count: number): void {
    const text = sprite.stackBadge.getChildByName('badgeText') as Text
    if (text) {
      text.text = String(count)
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
    durationPerSquare: number,
    startPosition?: { x: number; y: number }
  ): Promise<void> {
    const sprite = this.tokens.get(tokenId)
    if (!sprite || path.length === 0) return

    // Mark token as animating to prevent updateTokens from overriding position
    this.animatingTokenIds.add(tokenId)

    // Reset sprite to starting position before animating
    // This fixes the "flash to end position" issue when state updates before animation
    if (startPosition) {
      sprite.graphics.x = startPosition.x
      sprite.graphics.y = startPosition.y
    }

    // Move sprite to higher z-index during animation
    sprite.graphics.zIndex = Z_LAYERS.TOKENS_MOVING

    try {
      for (const point of path) {
        await this.animateToPosition(sprite.graphics, point.x, point.y, durationPerSquare)
      }
    } finally {
      // Reset z-index and remove from animating set
      sprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      this.animatingTokenIds.delete(tokenId)
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

    // Mark token as animating
    this.animatingTokenIds.add(tokenId)

    try {
      // Start from small scale
      sprite.graphics.scale.set(0.1)
      sprite.graphics.x = targetPosition.x
      sprite.graphics.y = targetPosition.y
      sprite.graphics.visible = true

      // Animate scale up with bounce
      await this.animateScale(sprite.graphics, 1, 500)
    } finally {
      this.animatingTokenIds.delete(tokenId)
    }
  }

  // Animate token reaching heaven
  async animateReachHeaven(tokenId: string): Promise<void> {
    const sprite = this.tokens.get(tokenId)
    if (!sprite) return

    // Mark token as animating
    this.animatingTokenIds.add(tokenId)

    try {
      // Animate scale up then fade out
      await this.animateScale(sprite.graphics, 1.5, 400)
      await this.animateFade(sprite.graphics, 0, 400)

      // Hide the token
      sprite.graphics.visible = false
      sprite.graphics.alpha = 1
      sprite.graphics.scale.set(1)
    } finally {
      this.animatingTokenIds.delete(tokenId)
    }
  }

  // Animate capture effect
  async animateCapture(
    capturingTokenId: string,
    capturedTokenId: string,
    capturedReturnPos: { x: number; y: number }
  ): Promise<void> {
    const capturedSprite = this.tokens.get(capturedTokenId)
    if (!capturedSprite) return

    // Mark captured token as animating
    this.animatingTokenIds.add(capturedTokenId)

    try {
      // Flash effect on captured token
      await this.animateFlash(capturedSprite.graphics)

      // Animate back to hell
      await this.animateToPosition(
        capturedSprite.graphics,
        capturedReturnPos.x,
        capturedReturnPos.y,
        300
      )
    } finally {
      this.animatingTokenIds.delete(capturedTokenId)
    }
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

  /**
   * Show stack split options overlay above a stack position
   * @param options - Array of parsed legal moves for this stack
   * @param position - Screen position to show the options
   * @param stackHeight - Total number of tokens in the stack
   * @param playerColor - Color of the player who owns the stack
   * @param onSelect - Callback when an option is selected
   */
  showStackSplitOptions(
    options: ParsedLegalMove[],
    position: { x: number; y: number },
    stackHeight: number,
    playerColor: PlayerColor,
    onSelect: (rawId: string) => void
  ): void {
    // Clear any existing split options
    this.clearSplitOptions()

    this.splitOptionSelectHandler = onSelect
    const colorConfig = PLAYER_COLORS[playerColor]
    const cellSize = this.geometry.getCellSize()
    const miniRadius = cellSize * 0.2
    const optionSpacing = cellSize * 1.2
    const totalWidth = (options.length - 1) * optionSpacing

    // Sort options by stack split count
    const sortedOptions = [...options].sort(
      (a, b) => (a.stackSplitCount ?? 0) - (b.stackSplitCount ?? 0)
    )

    // Create backdrop for the split options
    const backdrop = new Graphics()
    const backdropPadding = cellSize * 0.4
    const backdropWidth = totalWidth + cellSize * 1.5
    const backdropHeight = cellSize * 1.8
    backdrop.roundRect(
      position.x - backdropWidth / 2,
      position.y - cellSize * 2.5 - backdropPadding,
      backdropWidth,
      backdropHeight,
      8
    )
    backdrop.fill({ color: 0x000000, alpha: 0.8 })
    backdrop.stroke({ color: 0xffffff, width: 2, alpha: 0.5 })
    this.splitOptionsContainer.addChild(backdrop)

    // Create label
    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: Math.max(10, cellSize * 0.25),
      fill: 0xffffff,
      fontWeight: 'bold',
    })
    const label = new Text({ text: 'Move how many?', style: labelStyle })
    label.anchor.set(0.5, 0.5)
    label.position.set(position.x, position.y - cellSize * 2.8)
    this.splitOptionsContainer.addChild(label)

    sortedOptions.forEach((option, index) => {
      const count = option.stackSplitCount ?? stackHeight
      const xPos = position.x - totalWidth / 2 + index * optionSpacing

      // Create option graphics
      const optionGraphics = new Graphics()
      optionGraphics.position.set(xPos, position.y - cellSize * 1.8)

      // Draw mini-stack visualization
      for (let i = 0; i < count; i++) {
        const yOffset = -i * (miniRadius * 0.5)
        // Shadow
        optionGraphics.circle(1, yOffset + 1, miniRadius)
        optionGraphics.fill({ color: 0x000000, alpha: 0.3 })
        // Token
        optionGraphics.circle(0, yOffset, miniRadius)
        optionGraphics.fill({ color: colorConfig.primary })
        optionGraphics.circle(0, yOffset, miniRadius)
        optionGraphics.stroke({ color: colorConfig.secondary, width: 1.5 })
      }

      // Draw count label below
      const countStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: Math.max(12, cellSize * 0.35),
        fill: 0xffffff,
        fontWeight: 'bold',
      })
      const countLabel = new Text({ text: String(count), style: countStyle })
      countLabel.anchor.set(0.5, 0)
      countLabel.position.set(0, miniRadius * 0.8)
      optionGraphics.addChild(countLabel)

      // Make interactive
      optionGraphics.eventMode = 'static'
      optionGraphics.cursor = 'pointer'
      optionGraphics.hitArea = {
        contains: (x: number, y: number) => {
          return Math.abs(x) < cellSize * 0.6 && Math.abs(y) < cellSize * 0.8
        },
      }

      // Hover effect
      optionGraphics.on('pointerover', () => {
        optionGraphics.scale.set(1.1)
      })
      optionGraphics.on('pointerout', () => {
        optionGraphics.scale.set(1)
      })

      // Click handler
      optionGraphics.on('pointerdown', () => {
        if (this.splitOptionSelectHandler) {
          this.splitOptionSelectHandler(option.rawId)
        }
      })

      this.splitOptionsContainer.addChild(optionGraphics)
      this.splitOptions.push({ graphics: optionGraphics, rawId: option.rawId })
    })
  }

  /**
   * Clear the stack split options overlay
   */
  clearSplitOptions(): void {
    this.splitOptionsContainer.removeChildren()
    this.splitOptions = []
    this.splitOptionSelectHandler = null
  }

  /**
   * Check if split options are currently visible
   */
  hasSplitOptionsVisible(): boolean {
    return this.splitOptions.length > 0
  }

  destroy(): void {
    this.app.ticker.remove(this.animate.bind(this))

    for (const sprite of this.tokens.values()) {
      sprite.graphics.destroy()
    }
    this.tokens.clear()
    this.clearSplitOptions()
    this.splitOptionsContainer.destroy()
    this.container.destroy()
  }
}
