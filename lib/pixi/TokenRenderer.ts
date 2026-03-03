import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
import { BoardGeometry } from '@/lib/game/boardGeometry'
import { TOKEN_VISUAL, Z_LAYERS } from '@/lib/game/constants'
import { PLAYER_COLORS, type Player, type Token, type PlayerColor, type ParsedLegalMove, type HighlightedToken } from '@/types/game'

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

interface StackSprite {
  stackId: string
  playerId: string
  playerColor: PlayerColor
  graphics: Graphics
  badge: Container
  isHighlighted: boolean
}

export class TokenRenderer {
  private app: Application
  private geometry: BoardGeometry
  private container: Container
  private stackContainer: Container
  private splitOptionsContainer: Container
  private tokens: Map<string, TokenSprite> = new Map()
  private stacks: Map<string, StackSprite> = new Map()
  private splitOptions: SplitOption[] = []
  private highlightedTokenIds: Set<string> = new Set()
  private highlightedStackIds: Set<string> = new Set()
  private animatingTokenIds: Set<string> = new Set()
  private selectedTokenId: string | null = null
  private clickHandler: ((tokenId: string) => void) | null = null
  private splitOptionSelectHandler: ((rawId: string) => void) | null = null
  private pulseTime = 0

  constructor(app: Application, geometry: BoardGeometry) {
    this.app = app
    this.geometry = geometry

    // Create container for tokens
    this.container = new Container()
    this.container.zIndex = Z_LAYERS.TOKENS_BASE
    this.container.sortableChildren = true
    this.app.stage.addChild(this.container)

    // Create container for stacks (rendered above individual tokens)
    this.stackContainer = new Container()
    this.stackContainer.zIndex = Z_LAYERS.TOKENS_BASE + 1
    this.stackContainer.sortableChildren = true
    this.app.stage.addChild(this.stackContainer)

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

  /**
   * Set highlighted entities (tokens and stacks) from the store's highlightedTokens array
   * Separates token IDs and stack IDs into different sets for proper highlighting
   */
  setHighlightedEntities(entities: HighlightedToken[]): void {
    this.highlightedTokenIds.clear()
    this.highlightedStackIds.clear()

    for (const entity of entities) {
      if (entity.entityType === 'token') {
        this.highlightedTokenIds.add(entity.tokenId)
      } else {
        this.highlightedStackIds.add(entity.tokenId)
      }
    }

    this.updateHighlightState()
    this.updateStackHighlightState()
  }

  setSelectedToken(tokenId: string | null): void {
    this.selectedTokenId = tokenId
    this.updateHighlightState()
  }

  updateTokens(players: Player[], storeAnimatingTokenIds?: string[]): void {
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

        // Update position (skip if token is being animated or has pending animation)
        // Check both local animatingTokenIds (active animations) and store's array (pending animations)
        const isAnimating = this.animatingTokenIds.has(token.token_id) ||
          (storeAnimatingTokenIds?.includes(token.token_id) ?? false)

        if (!isAnimating) {
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

        // Hide tokens that are in a stack UNLESS they're animating
        // During animation, tokens remain visible; after animation completes, stack sprite takes over
        sprite.graphics.visible = !token.in_stack || isAnimating
        // Token badges no longer needed (badges are on stack sprites)
        sprite.stackBadge.visible = false

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

    // Update stack sprites
    this.updateStacks(players, storeAnimatingTokenIds)
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

  private updateStackHighlightState(): void {
    for (const [stackId, stackSprite] of this.stacks) {
      const isHighlighted = this.highlightedStackIds.has(stackId)
      stackSprite.isHighlighted = isHighlighted
      stackSprite.graphics.cursor = isHighlighted ? 'pointer' : 'default'

      if (isHighlighted) {
        stackSprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED
      } else {
        stackSprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
      }
    }
  }

  private animate(ticker: { deltaTime: number }): void {
    this.pulseTime += ticker.deltaTime * 0.05

    // Animate highlighted tokens
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

    // Animate highlighted stacks
    for (const [stackId, stackSprite] of this.stacks) {
      if (stackSprite.isHighlighted && stackSprite.graphics.visible) {
        const colorConfig = PLAYER_COLORS[stackSprite.playerColor]
        const cellSize = this.geometry.getCellSize()
        const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

        // Pulse scale for highlighted stacks
        const scale = 1 + Math.sin(this.pulseTime * TOKEN_VISUAL.HIGHLIGHT_PULSE_SPEED) * 0.08

        this.drawToken(
          stackSprite.graphics,
          radius,
          colorConfig.primary,
          colorConfig.secondary,
          scale
        )

        // Re-add badge after redrawing (drawToken clears graphics)
        if (!stackSprite.graphics.children.includes(stackSprite.badge)) {
          stackSprite.graphics.addChild(stackSprite.badge)
        }

        // Add glow effect for highlighted stacks
        stackSprite.graphics.circle(0, 0, radius * scale * 1.2)
        stackSprite.graphics.stroke({
          color: 0xffffff,
          width: 3,
          alpha: 0.3 + Math.sin(this.pulseTime * 2) * 0.2,
        })
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

  /**
   * Update stack sprites - stacks are rendered as distinct entities
   */
  private updateStacks(players: Player[], storeAnimatingTokenIds?: string[]): void {
    const currentStackIds = new Set<string>()

    // Build token lookup for position calculation
    const tokenLookup = new Map<string, { token: Token; player: Player }>()
    players.forEach((player) => {
      player.tokens.forEach((token) => {
        tokenLookup.set(token.token_id, { token, player })
      })
    })

    players.forEach((player) => {
      player.stacks?.forEach((stack) => {
        currentStackIds.add(stack.stack_id)

        // Check if any token in stack is animating
        const isAnimating = stack.tokens.some(
          (tokenId) =>
            this.animatingTokenIds.has(tokenId) ||
            (storeAnimatingTokenIds?.includes(tokenId) ?? false)
        )

        let stackSprite = this.stacks.get(stack.stack_id)

        if (!stackSprite) {
          // Create new stack sprite
          stackSprite = this.createStackSprite(
            stack.stack_id,
            player.player_id,
            player.color,
            stack.tokens.length
          )
          this.stacks.set(stack.stack_id, stackSprite)
          this.stackContainer.addChild(stackSprite.graphics)
        } else {
          // Update badge count
          this.updateBadgeCount(stackSprite, stack.tokens.length)
        }

        // Update position from first token's progress (all tokens share same progress)
        if (!isAnimating && stack.tokens.length > 0) {
          const firstTokenId = stack.tokens[0]
          const tokenData = tokenLookup.get(firstTokenId)
          if (tokenData) {
            const position = this.geometry.getTokenPosition(
              player.color,
              player.abs_starting_index,
              tokenData.token.state,
              tokenData.token.progress,
              0 // idx doesn't matter for road/homestretch
            )
            stackSprite.graphics.x = position.x
            stackSprite.graphics.y = position.y
          }
        }

        // Hide stack sprite if tokens are animating (tokens show during animation)
        stackSprite.graphics.visible = !isAnimating

        // Update highlight state - direct check against highlightedStackIds
        const isHighlighted = this.highlightedStackIds.has(stack.stack_id)
        stackSprite.isHighlighted = isHighlighted
        stackSprite.graphics.cursor = isHighlighted ? 'pointer' : 'default'
        if (isHighlighted) {
          stackSprite.graphics.zIndex = Z_LAYERS.TOKENS_HIGHLIGHTED
        } else {
          stackSprite.graphics.zIndex = Z_LAYERS.TOKENS_BASE
        }
      })
    })

    // Remove stacks that no longer exist
    for (const [stackId, stackSprite] of this.stacks) {
      if (!currentStackIds.has(stackId)) {
        this.stackContainer.removeChild(stackSprite.graphics)
        stackSprite.graphics.destroy()
        this.stacks.delete(stackId)
      }
    }
  }

  /**
   * Create a stack sprite with badge
   */
  private createStackSprite(
    stackId: string,
    playerId: string,
    playerColor: PlayerColor,
    tokenCount: number
  ): StackSprite {
    const graphics = new Graphics()
    const colorConfig = PLAYER_COLORS[playerColor]
    const cellSize = this.geometry.getCellSize()
    const radius = cellSize * TOKEN_VISUAL.RADIUS_RATIO

    // Draw stack visual (same as token)
    this.drawToken(graphics, radius, colorConfig.primary, colorConfig.secondary)

    // Create badge container
    const badge = this.createStackBadge(radius)
    this.updateBadgeCount({ badge } as StackSprite, tokenCount)
    badge.visible = tokenCount > 1
    graphics.addChild(badge)

    // Make interactive
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'

    // Click handler - use stack_id to allow legalMoveParser to identify it
    graphics.on('pointerdown', () => {
      const stackSprite = this.stacks.get(stackId)
      if (this.clickHandler) {
        // Only allow click if stack is highlighted (has legal moves)
        if (stackSprite?.isHighlighted) {
          this.clickHandler(stackId)
        }
      }
    })

    return {
      stackId,
      playerId,
      playerColor,
      graphics,
      badge,
      isHighlighted: false,
    }
  }

  /**
   * Update badge count for a stack sprite
   */
  private updateBadgeCount(sprite: StackSprite, count: number): void {
    const text = sprite.badge.getChildByName('badgeText') as Text
    if (text) {
      text.text = String(count)
    }
    sprite.badge.visible = count > 1
  }

  /**
   * Get a stack sprite by ID (for animation controller)
   */
  getStackSprite(stackId: string): StackSprite | null {
    return this.stacks.get(stackId) ?? null
  }

  /**
   * Get stack graphics for direct manipulation (for animation)
   */
  getStackGraphics(stackId: string): Graphics | null {
    return this.stacks.get(stackId)?.graphics ?? null
  }

  destroy(): void {
    this.app.ticker.remove(this.animate.bind(this))

    for (const sprite of this.tokens.values()) {
      sprite.graphics.destroy()
    }
    this.tokens.clear()

    for (const stackSprite of this.stacks.values()) {
      stackSprite.graphics.destroy()
    }
    this.stacks.clear()

    this.clearSplitOptions()
    this.splitOptionsContainer.destroy()
    this.stackContainer.destroy()
    this.container.destroy()
  }
}
