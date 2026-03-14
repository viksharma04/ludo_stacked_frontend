import type { Point, BoardSetup, PlayerColor, StackState } from '@/types/game'

// Generate the clockwise track around the cross-shaped board.
// Each of the 4 quadrants has identical structure (rotated):
//   Segment A: finish current arm edge (g-2 positions)
//   Segment B: traverse next arm's outer edge (g positions)
//   Segment C: turn at board corner (2 positions)
//   Segment D: enter next arm (1 position)
// Total: 4 × (2g+1) = 8g+4 positions
function generateTrack(g: number): Point[] {
  const track: Point[] = []

  // Red quadrant: left arm bottom row → bottom arm left col → bottom edge
  for (let x = 2; x <= g - 1; x++) track.push({ x, y: g + 2 })
  for (let y = g + 3; y <= 2 * g + 2; y++) track.push({ x: g, y })
  track.push({ x: g + 1, y: 2 * g + 2 })
  track.push({ x: g + 2, y: 2 * g + 2 })
  track.push({ x: g + 2, y: 2 * g + 1 })

  // Blue quadrant: bottom arm right col → right arm bottom row → right edge
  for (let y = 2 * g; y >= g + 3; y--) track.push({ x: g + 2, y })
  for (let x = g + 3; x <= 2 * g + 2; x++) track.push({ x, y: g + 2 })
  track.push({ x: 2 * g + 2, y: g + 1 })
  track.push({ x: 2 * g + 2, y: g })
  track.push({ x: 2 * g + 1, y: g })

  // Green quadrant: right arm top row → top arm right col → top edge
  for (let x = 2 * g; x >= g + 3; x--) track.push({ x, y: g })
  for (let y = g - 1; y >= 0; y--) track.push({ x: g + 2, y })
  track.push({ x: g + 1, y: 0 })
  track.push({ x: g, y: 0 })
  track.push({ x: g, y: 1 })

  // Yellow quadrant: top arm left col → left arm top row → left edge
  for (let y = 2; y <= g - 1; y++) track.push({ x: g, y })
  for (let x = g - 1; x >= 0; x--) track.push({ x, y: g })
  track.push({ x: 0, y: g + 1 })
  track.push({ x: 0, y: g + 2 })
  track.push({ x: 1, y: g + 2 })

  return track
}

// Generate homestretch positions (g-1 squares along the middle row/col of each arm)
function generateHomestretch(g: number): Record<PlayerColor, Point[]> {
  const mid = g + 1
  return {
    red: Array.from({ length: g - 1 }, (_, i) => ({ x: 1 + i, y: mid })),
    blue: Array.from({ length: g - 1 }, (_, i) => ({ x: mid, y: 2 * g + 1 - i })),
    green: Array.from({ length: g - 1 }, (_, i) => ({ x: 2 * g + 1 - i, y: mid })),
    yellow: Array.from({ length: g - 1 }, (_, i) => ({ x: mid, y: 1 + i })),
  }
}

// Generate 4 home (hell) positions spread evenly in each g×g corner area
function generateHomePositions(g: number): Record<PlayerColor, Point[]> {
  const off1 = g / 3 - 0.5
  const off2 = (2 * g) / 3 - 0.5

  function cornerPositions(ox: number, oy: number): Point[] {
    return [
      { x: ox + off1, y: oy + off1 },
      { x: ox + off2, y: oy + off1 },
      { x: ox + off1, y: oy + off2 },
      { x: ox + off2, y: oy + off2 },
    ]
  }

  return {
    red: cornerPositions(0, g + 3),
    blue: cornerPositions(g + 3, g + 3),
    green: cornerPositions(g + 3, 0),
    yellow: cornerPositions(0, 0),
  }
}

// Generate corner area bounds (g×g squares)
function generateHomeAreaBounds(
  g: number
): Record<PlayerColor, { x: number; y: number; width: number; height: number }> {
  return {
    red: { x: 0, y: g + 3, width: g, height: g },
    blue: { x: g + 3, y: g + 3, width: g, height: g },
    green: { x: g + 3, y: 0, width: g, height: g },
    yellow: { x: 0, y: 0, width: g, height: g },
  }
}

// Compute starting track indices: Red=0, Blue=2g+1, Green=4g+2, Yellow=6g+3
function generateStartPositions(g: number): Record<PlayerColor, number> {
  const step = 2 * g + 1
  return {
    red: 0,
    blue: step,
    green: 2 * step,
    yellow: 3 * step,
  }
}

export class BoardGeometry {
  private cellSize: number
  private offsetX: number
  private offsetY: number
  private gridLength: number
  private gridSize: number
  private boardSetup: BoardSetup | null = null

  private track: Point[]
  private homestretchPositions: Record<PlayerColor, Point[]>
  private homePositions: Record<PlayerColor, Point[]>
  private homeAreaBounds: Record<PlayerColor, { x: number; y: number; width: number; height: number }>
  private heavenPosition: Point
  private startPositions: Record<PlayerColor, number>

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    padding: number = 20,
    gridLength: number = 6
  ) {
    this.gridLength = gridLength
    this.gridSize = 2 * gridLength + 3

    const availableSize = Math.min(canvasWidth, canvasHeight) - padding * 2
    this.cellSize = availableSize / this.gridSize
    const boardPixelSize = this.cellSize * this.gridSize
    this.offsetX = (canvasWidth - boardPixelSize) / 2
    this.offsetY = (canvasHeight - boardPixelSize) / 2

    // Generate all geometry from gridLength
    this.track = generateTrack(gridLength)
    this.homestretchPositions = generateHomestretch(gridLength)
    this.homePositions = generateHomePositions(gridLength)
    this.homeAreaBounds = generateHomeAreaBounds(gridLength)
    this.heavenPosition = { x: gridLength + 1, y: gridLength + 1 }
    this.startPositions = generateStartPositions(gridLength)
  }

  setBoardSetup(setup: BoardSetup) {
    this.boardSetup = setup
  }

  getCellSize(): number {
    return this.cellSize
  }

  getGridSize(): number {
    return this.gridSize
  }

  getGridLength(): number {
    return this.gridLength
  }

  getBoardBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: this.cellSize * this.gridSize,
      height: this.cellSize * this.gridSize,
    }
  }

  gridToPixel(gridX: number, gridY: number): Point {
    return {
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2,
    }
  }

  getTrackPositions(): Point[] {
    return this.track.map((pos) => this.gridToPixel(pos.x, pos.y))
  }

  getHomestretchPositions(color: PlayerColor): Point[] {
    return this.homestretchPositions[color].map((pos) =>
      this.gridToPixel(pos.x, pos.y)
    )
  }

  getHomePositions(color: PlayerColor): Point[] {
    return this.homePositions[color].map((pos) => this.gridToPixel(pos.x, pos.y))
  }

  getHeavenPosition(): Point {
    return this.gridToPixel(this.heavenPosition.x, this.heavenPosition.y)
  }

  getHomeAreaPixelBounds(
    color: PlayerColor
  ): { x: number; y: number; width: number; height: number } {
    const bounds = this.homeAreaBounds[color]
    return {
      x: this.offsetX + bounds.x * this.cellSize,
      y: this.offsetY + bounds.y * this.cellSize,
      width: bounds.width * this.cellSize,
      height: bounds.height * this.cellSize,
    }
  }

  getSafeSpacePositions(): Point[] {
    if (!this.boardSetup) return []
    return this.boardSetup.safe_spaces
      .filter((absPos) => typeof absPos === 'number' && !isNaN(absPos))
      .map((absPos) => {
        const index = absPos % this.track.length
        const gridPos = this.track[index]
        if (!gridPos) return null
        return this.gridToPixel(gridPos.x, gridPos.y)
      })
      .filter((pos): pos is Point => pos !== null)
  }

  getStartingPosition(color: PlayerColor): number {
    return this.startPositions[color]
  }

  getTokenPosition(
    playerColor: PlayerColor,
    playerStartingIndex: number,
    tokenState: StackState,
    progress: number,
    tokenIndex: number = 0
  ): Point {
    switch (tokenState) {
      case 'hell': {
        const homePositions = this.getHomePositions(playerColor)
        const posIndex = tokenIndex % homePositions.length
        return homePositions[posIndex]
      }

      case 'road': {
        const absPosition = (playerStartingIndex + progress) % this.track.length
        const gridPos = this.track[absPosition]
        return this.gridToPixel(gridPos.x, gridPos.y)
      }

      case 'homestretch': {
        const homestretchProgress = this.boardSetup
          ? progress - this.boardSetup.squares_to_homestretch - 1
          : progress
        const homestretchPos = this.homestretchPositions[playerColor]
        const posIndex = Math.min(
          Math.max(0, homestretchProgress),
          homestretchPos.length - 1
        )
        return this.gridToPixel(
          homestretchPos[posIndex].x,
          homestretchPos[posIndex].y
        )
      }

      case 'heaven': {
        return this.getHeavenPosition()
      }

      default:
        return this.getHeavenPosition()
    }
  }

  getAbsolutePosition(playerStartingIndex: number, progress: number): number {
    if (!this.boardSetup) return 0
    if (progress > this.boardSetup.squares_to_homestretch) {
      return -1
    }
    return (playerStartingIndex + progress) % this.track.length
  }

  isSafeSpace(absolutePosition: number): boolean {
    if (!this.boardSetup) return false
    return this.boardSetup.safe_spaces.includes(absolutePosition)
  }

  getMovePath(
    playerColor: PlayerColor,
    playerStartingIndex: number,
    fromProgress: number,
    toProgress: number,
    fromState: StackState,
    toState: StackState
  ): Point[] {
    const path: Point[] = []

    if (fromState === 'hell' && toState === 'road') {
      path.push(
        this.getTokenPosition(playerColor, playerStartingIndex, 'road', 0)
      )
      return path
    }

    if (toState === 'heaven') {
      path.push(this.getHeavenPosition())
      return path
    }

    for (let p = fromProgress + 1; p <= toProgress; p++) {
      const state: StackState =
        this.boardSetup && p > this.boardSetup.squares_to_homestretch
          ? 'homestretch'
          : 'road'
      path.push(
        this.getTokenPosition(playerColor, playerStartingIndex, state, p)
      )
    }

    return path
  }
}

export function createBoardGeometry(
  canvasWidth: number,
  canvasHeight: number,
  padding?: number,
  gridLength?: number
): BoardGeometry {
  return new BoardGeometry(canvasWidth, canvasHeight, padding, gridLength)
}
