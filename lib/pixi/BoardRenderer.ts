import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import { BoardGeometry, HOME_AREA_BOUNDS } from '@/lib/game/boardGeometry'
import { BOARD_COLORS, Z_LAYERS } from '@/lib/game/constants'
import { PLAYER_COLORS, type PlayerColor, type Player } from '@/types/game'

// Enable to show track position numbers for debugging
const DEBUG_SHOW_POSITIONS = true

export class BoardRenderer {
  private app: Application
  private geometry: BoardGeometry
  private container: Container
  private boardGraphics: Graphics
  private safeSpaceGraphics: Graphics
  private startingMarkerGraphics: Graphics
  private debugContainer: Container
  private debugLabels: Text[] = []

  constructor(app: Application, geometry: BoardGeometry) {
    this.app = app
    this.geometry = geometry

    // Create main container
    this.container = new Container()
    this.container.zIndex = Z_LAYERS.BOARD_BACKGROUND
    this.app.stage.addChild(this.container)

    // Create graphics objects
    this.boardGraphics = new Graphics()
    this.safeSpaceGraphics = new Graphics()
    this.startingMarkerGraphics = new Graphics()
    this.debugContainer = new Container()

    this.container.addChild(this.boardGraphics)
    this.container.addChild(this.safeSpaceGraphics)
    this.container.addChild(this.startingMarkerGraphics)
    this.container.addChild(this.debugContainer)

    // Sort by z-index
    this.app.stage.sortableChildren = true
  }

  setGeometry(geometry: BoardGeometry): void {
    this.geometry = geometry
  }

  render(): void {
    this.drawBoard()
    this.drawSafeSpaces()
    if (DEBUG_SHOW_POSITIONS) {
      this.drawDebugPositions()
    }
  }

  private drawBoard(): void {
    this.boardGraphics.clear()

    const cellSize = this.geometry.getCellSize()
    const bounds = this.geometry.getBoardBounds()

    // Draw background
    this.boardGraphics.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    this.boardGraphics.fill({ color: BOARD_COLORS.BACKGROUND })

    // Draw home areas (corners)
    const colors: PlayerColor[] = ['green', 'yellow', 'blue', 'red']
    colors.forEach((color) => {
      this.drawHomeArea(color)
    })

    // Draw the track squares
    this.drawTrack()

    // Draw center area
    this.drawCenter()

    // Draw homestretch paths
    colors.forEach((color) => {
      this.drawHomestretch(color)
    })

    // Draw grid lines
    this.drawGridLines()
  }

  private drawHomeArea(color: PlayerColor): void {
    const areaBounds = this.geometry.getHomeAreaPixelBounds(color)
    const colorConfig = PLAYER_COLORS[color]

    // Draw the colored corner area
    this.boardGraphics.rect(
      areaBounds.x,
      areaBounds.y,
      areaBounds.width,
      areaBounds.height
    )
    this.boardGraphics.fill({ color: colorConfig.home })

    // Draw border
    this.boardGraphics.rect(
      areaBounds.x,
      areaBounds.y,
      areaBounds.width,
      areaBounds.height
    )
    this.boardGraphics.stroke({ color: colorConfig.secondary, width: 2 })

    // Draw home positions (where tokens wait in hell)
    const homePositions = this.geometry.getHomePositions(color)
    const cellSize = this.geometry.getCellSize()
    const tokenRadius = cellSize * 0.3

    homePositions.forEach((pos) => {
      // Draw circle outline for home position
      this.boardGraphics.circle(pos.x, pos.y, tokenRadius)
      this.boardGraphics.fill({ color: 0xffffff })
      this.boardGraphics.circle(pos.x, pos.y, tokenRadius)
      this.boardGraphics.stroke({ color: colorConfig.secondary, width: 2 })
    })
  }

  private drawTrack(): void {
    const trackPositions = this.geometry.getTrackPositions()
    const cellSize = this.geometry.getCellSize()

    trackPositions.forEach((pos) => {
      // Draw square for each track position
      this.boardGraphics.rect(
        pos.x - cellSize / 2,
        pos.y - cellSize / 2,
        cellSize,
        cellSize
      )
      this.boardGraphics.fill({ color: BOARD_COLORS.TRACK })
      this.boardGraphics.rect(
        pos.x - cellSize / 2,
        pos.y - cellSize / 2,
        cellSize,
        cellSize
      )
      this.boardGraphics.stroke({ color: BOARD_COLORS.GRID_LINE, width: 1 })
    })

    // Starting position indicators are drawn separately after players are loaded
    // See updateStartingMarkers()
  }

  /**
   * Update starting position markers using actual player data from the game state.
   * This ensures markers match where tokens actually spawn.
   */
  updateStartingMarkers(players: Player[]): void {
    this.startingMarkerGraphics.clear()
    const trackPositions = this.geometry.getTrackPositions()
    const cellSize = this.geometry.getCellSize()

    players.forEach((player) => {
      const startIndex = player.abs_starting_index
      if (startIndex < trackPositions.length) {
        const pos = trackPositions[startIndex]
        const colorConfig = PLAYER_COLORS[player.color]

        // Draw a colored circle indicator at start position
        this.startingMarkerGraphics.circle(pos.x, pos.y, cellSize * 0.15)
        this.startingMarkerGraphics.fill({ color: colorConfig.primary })
      }
    })
  }

  private drawHomestretch(color: PlayerColor): void {
    const positions = this.geometry.getHomestretchPositions(color)
    const cellSize = this.geometry.getCellSize()
    const colorConfig = PLAYER_COLORS[color]

    positions.forEach((pos) => {
      // Draw colored homestretch square
      this.boardGraphics.rect(
        pos.x - cellSize / 2,
        pos.y - cellSize / 2,
        cellSize,
        cellSize
      )
      this.boardGraphics.fill({ color: colorConfig.homestretch })
      this.boardGraphics.rect(
        pos.x - cellSize / 2,
        pos.y - cellSize / 2,
        cellSize,
        cellSize
      )
      this.boardGraphics.stroke({ color: colorConfig.secondary, width: 1 })
    })
  }

  private drawCenter(): void {
    const centerPos = this.geometry.getHeavenPosition()
    const cellSize = this.geometry.getCellSize()
    const centerSize = cellSize * 3 // Center is 3x3

    // Draw center area (heaven)
    this.boardGraphics.rect(
      centerPos.x - centerSize / 2,
      centerPos.y - centerSize / 2,
      centerSize,
      centerSize
    )
    this.boardGraphics.fill({ color: BOARD_COLORS.CENTER })

    // Draw triangular sections for each player color
    const colors: PlayerColor[] = ['red', 'blue', 'green', 'yellow']
    const halfSize = centerSize / 2

    colors.forEach((color, index) => {
      const colorConfig = PLAYER_COLORS[color]
      const angle = (index * Math.PI) / 2 - Math.PI / 4

      // Calculate triangle points
      const cx = centerPos.x
      const cy = centerPos.y

      // Draw a triangle pointing to center
      this.boardGraphics.moveTo(cx, cy)

      switch (index) {
        case 0: // Green (top-left, coming from bottom)
          this.boardGraphics.lineTo(cx - halfSize, cy + halfSize)
          this.boardGraphics.lineTo(cx + halfSize, cy + halfSize)
          break
        case 1: // Yellow (top-right, coming from left)
          this.boardGraphics.lineTo(cx - halfSize, cy - halfSize)
          this.boardGraphics.lineTo(cx - halfSize, cy + halfSize)
          break
        case 2: // Blue (bottom-right, coming from top)
          this.boardGraphics.lineTo(cx - halfSize, cy - halfSize)
          this.boardGraphics.lineTo(cx + halfSize, cy - halfSize)
          break
        case 3: // Red (bottom-left, coming from right)
          this.boardGraphics.lineTo(cx + halfSize, cy - halfSize)
          this.boardGraphics.lineTo(cx + halfSize, cy + halfSize)
          break
      }

      this.boardGraphics.closePath()
      this.boardGraphics.fill({ color: colorConfig.primary, alpha: 0.7 })
    })

    // Draw center border
    this.boardGraphics.rect(
      centerPos.x - centerSize / 2,
      centerPos.y - centerSize / 2,
      centerSize,
      centerSize
    )
    this.boardGraphics.stroke({ color: 0x666666, width: 2 })
  }

  private drawGridLines(): void {
    // Grid lines are already drawn with the track squares
    // This method can add additional visual guides if needed
  }

  private drawSafeSpaces(): void {
    this.safeSpaceGraphics.clear()

    const safePositions = this.geometry.getSafeSpacePositions()
    const cellSize = this.geometry.getCellSize()

    safePositions.forEach((pos) => {
      // Draw star shape for safe space
      this.drawStar(pos.x, pos.y, cellSize * 0.35, 5)
    })
  }

  private drawStar(cx: number, cy: number, radius: number, points: number): void {
    const innerRadius = radius * 0.4
    const step = Math.PI / points

    this.safeSpaceGraphics.moveTo(
      cx + radius * Math.cos(-Math.PI / 2),
      cy + radius * Math.sin(-Math.PI / 2)
    )

    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : innerRadius
      const angle = -Math.PI / 2 + (i + 1) * step
      this.safeSpaceGraphics.lineTo(
        cx + r * Math.cos(angle),
        cy + r * Math.sin(angle)
      )
    }

    this.safeSpaceGraphics.closePath()
    this.safeSpaceGraphics.fill({ color: BOARD_COLORS.SAFE_SPACE })
    this.safeSpaceGraphics.stroke({ color: 0xb8860b, width: 1 })
  }

  private drawDebugPositions(): void {
    // Clear existing debug labels
    this.debugLabels.forEach((label) => label.destroy())
    this.debugLabels = []

    const cellSize = this.geometry.getCellSize()
    const fontSize = Math.max(8, Math.floor(cellSize * 0.3))

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize,
      fill: 0x333333,
      fontWeight: 'bold',
    })

    // Draw track position numbers (0-51)
    const trackPositions = this.geometry.getTrackPositions()
    trackPositions.forEach((pos, index) => {
      const label = new Text({ text: String(index), style })
      label.anchor.set(0.5, 0.5)
      label.position.set(pos.x, pos.y)
      this.debugContainer.addChild(label)
      this.debugLabels.push(label)
    })

    // Draw homestretch position numbers for each color
    const colors: PlayerColor[] = ['green', 'yellow', 'blue', 'red']
    const homestretchStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 2 },
    })

    colors.forEach((color) => {
      const positions = this.geometry.getHomestretchPositions(color)
      positions.forEach((pos, index) => {
        // Label homestretch positions as H0-H5
        const label = new Text({ text: `H${index}`, style: homestretchStyle })
        label.anchor.set(0.5, 0.5)
        label.position.set(pos.x, pos.y)
        this.debugContainer.addChild(label)
        this.debugLabels.push(label)
      })
    })
  }

  destroy(): void {
    this.debugLabels.forEach((label) => label.destroy())
    this.debugLabels = []
    this.boardGraphics.destroy()
    this.safeSpaceGraphics.destroy()
    this.startingMarkerGraphics.destroy()
    this.debugContainer.destroy()
    this.container.destroy()
  }
}
