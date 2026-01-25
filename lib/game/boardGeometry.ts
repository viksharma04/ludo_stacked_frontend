import type { Point, BoardSetup, PlayerColor, TokenState } from '@/types/game'

const GRID_SIZE = 15
const CELL_SIZE = 1 // Normalized, will be scaled

export const PLAYER_START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39
}

function createTrack(): Point[] {
  const track: Point[] = []

  track.push({ x: 2, y: 8 }) // 0 - Starting position
  track.push({ x: 3, y: 8 }) // 1
  track.push({ x: 4, y: 8 }) // 2
  track.push({ x: 5, y: 8 }) // 3
  // Corner - going down
  track.push({ x: 6, y: 9 }) // 5
  track.push({ x: 6, y: 10 }) // 6
  track.push({ x: 6, y: 11 }) // 7
  track.push({ x: 6, y: 12 }) // 8
  track.push({ x: 6, y: 13 }) // 9
  track.push({ x: 6, y: 14 }) // 10
  // Turn right
  track.push({ x: 7, y: 14 }) // 11
  track.push({ x: 8, y: 14 }) // 12
  // Turn up
  track.push({ x: 8, y: 13 }) // 13
  track.push({ x: 8, y: 12 }) // 14
  track.push({ x: 8, y: 11 }) // 15
  track.push({ x: 8, y: 10 }) // 16
  track.push({ x: 8, y: 9 }) // 17
  // Turn right
  track.push({ x: 9, y: 8 }) // 18
  track.push({ x: 10, y: 8 }) // 19
  track.push({ x: 11, y: 8 }) // 20
  track.push({ x: 12, y: 8 }) // 21
  track.push({ x: 13, y: 8 }) // 22
  track.push({ x: 14, y: 8 }) // 23
  // Turn up
  track.push({ x: 14, y: 7 }) // 24
  track.push({ x: 14, y: 6 }) // 25
  // Continue left
  track.push({ x: 13, y: 6 }) // 26
  track.push({ x: 12, y: 6 }) // 27
  track.push({ x: 11, y: 6 }) // 28
  track.push({ x: 10, y: 6 }) // 29
  track.push({ x: 9, y: 6 }) // 30
  // Turn up
  track.push({ x: 8, y: 5 }) // 31
  track.push({ x: 8, y: 4 }) // 32
  track.push({ x: 8, y: 3 }) // 33
  track.push({ x: 8, y: 2 }) // 34
  track.push({ x: 8, y: 1 }) // 35
  track.push({ x: 8, y: 0 }) // 36
  // Turn left
  track.push({ x: 7, y: 0 }) // 37
  track.push({ x: 6, y: 0 }) // 38
  // Continue down
  track.push({ x: 6, y: 1 }) // 39
  track.push({ x: 6, y: 2 }) // 40
  track.push({ x: 6, y: 3 }) // 41
  track.push({ x: 6, y: 4 }) // 42
  track.push({ x: 6, y: 5 }) // 43
  // Turn left
  track.push({ x: 5, y: 6 }) // 44
  track.push({ x: 4, y: 6 }) // 45
  track.push({ x: 3, y: 6 }) // 46
  track.push({ x: 2, y: 6 }) // 47
  track.push({ x: 1, y: 6 }) // 48
  track.push({ x: 0, y: 6 }) // 49
  // Turn down
  track.push({ x: 0, y: 7 }) // 50
  track.push({ x: 0, y: 8 }) // 51
  track.push({ x: 1, y: 8 }) // 52

  return track
}

const MAIN_TRACK = createTrack()

// Homestretch positions for each player (6 squares leading to center)
const HOMESTRETCH_POSITIONS: Record<PlayerColor, Point[]> = {
  green: [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 },
  ],
  yellow: [
    { x: 7, y: 1 },
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
  ],
  blue: [
    { x: 7, y: 13 },
    { x: 7, y: 12 },
    { x: 7, y: 11 },
    { x: 7, y: 10 },
    { x: 7, y: 9 },
    { x: 7, y: 8 },
  ],
  red: [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 },
  ],
}

// Home (hell) positions for each player - positions in the corner squares
const HOME_POSITIONS: Record<PlayerColor, Point[]> = {
  green: [
    { x: 10.5, y: 1.5 },
    { x: 12.5, y: 1.5 },
    { x: 10.5, y: 3.5 },
    { x: 12.5, y: 3.5 },
  ],
  yellow: [
    { x: 1.5, y: 1.5 },
    { x: 3.5, y: 1.5 },
    { x: 1.5, y: 3.5 },
    { x: 3.5, y: 3.5 },
  ],
  blue: [
    { x: 10.5, y: 10.5 },
    { x: 12.5, y: 10.5 },
    { x: 10.5, y: 12.5 },
    { x: 12.5, y: 12.5 },
  ],
  red: [
    { x: 1.5, y: 10.5 },
    { x: 3.5, y: 10.5 },
    { x: 1.5, y: 12.5 },
    { x: 3.5, y: 12.5 },
  ],
}

// Center/Heaven position
const HEAVEN_POSITION: Point = { x: 7, y: 7 }

// Home area bounds for each player (for rendering the colored corners)
export const HOME_AREA_BOUNDS: Record<
  PlayerColor,
  { x: number; y: number; width: number; height: number }
> = {
  green: { x: 9, y: 0, width: 6, height: 6 },
  yellow: { x: 0, y: 0, width: 6, height: 6 },
  blue: { x: 9, y: 9, width: 6, height: 6 },
  red: { x: 0, y: 9, width: 6, height: 6 },
}

export class BoardGeometry {
  private cellSize: number
  private offsetX: number
  private offsetY: number
  private boardSetup: BoardSetup | null = null

  constructor(canvasWidth: number, canvasHeight: number, padding: number = 20) {
    // Calculate cell size to fit the board
    const availableSize = Math.min(canvasWidth, canvasHeight) - padding * 2
    this.cellSize = availableSize / GRID_SIZE

    // Center the board
    this.offsetX = (canvasWidth - availableSize) / 2
    this.offsetY = (canvasHeight - availableSize) / 2
  }

  setBoardSetup(setup: BoardSetup) {
    this.boardSetup = setup
  }

  getCellSize(): number {
    return this.cellSize
  }

  getGridSize(): number {
    return GRID_SIZE
  }

  getBoardBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: this.cellSize * GRID_SIZE,
      height: this.cellSize * GRID_SIZE,
    }
  }

  // Convert grid coordinates to pixel coordinates
  gridToPixel(gridX: number, gridY: number): Point {
    return {
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2,
    }
  }

  // Get the main track positions
  getTrackPositions(): Point[] {
    return MAIN_TRACK.map((pos) => this.gridToPixel(pos.x, pos.y))
  }

  // Get homestretch positions for a player color
  getHomestretchPositions(color: PlayerColor): Point[] {
    return HOMESTRETCH_POSITIONS[color].map((pos) =>
      this.gridToPixel(pos.x, pos.y)
    )
  }

  // Get home (hell) positions for a player color
  getHomePositions(color: PlayerColor): Point[] {
    return HOME_POSITIONS[color].map((pos) => this.gridToPixel(pos.x, pos.y))
  }

  // Get heaven position (center)
  getHeavenPosition(): Point {
    return this.gridToPixel(HEAVEN_POSITION.x, HEAVEN_POSITION.y)
  }

  // Get home area bounds in pixels
  getHomeAreaPixelBounds(
    color: PlayerColor
  ): { x: number; y: number; width: number; height: number } {
    const bounds = HOME_AREA_BOUNDS[color]
    return {
      x: this.offsetX + bounds.x * this.cellSize,
      y: this.offsetY + bounds.y * this.cellSize,
      width: bounds.width * this.cellSize,
      height: bounds.height * this.cellSize,
    }
  }

  // Get safe space positions
  getSafeSpacePositions(): Point[] {
    if (!this.boardSetup) return []
    return this.boardSetup.safe_spaces.map((absPos) => {
      const gridPos = MAIN_TRACK[absPos % MAIN_TRACK.length]
      return this.gridToPixel(gridPos.x, gridPos.y)
    })
  }

  // Get starting positions grid indices
  getStartingPosition(color: PlayerColor): number {
    return PLAYER_START_POSITIONS[color]
  }

  /**
   * Calculate the pixel position for a token given its state and progress
   */
  getTokenPosition(
    playerColor: PlayerColor,
    playerStartingIndex: number,
    tokenState: TokenState,
    progress: number,
    tokenIndex: number = 0
  ): Point {
    switch (tokenState) {
      case 'hell': {
        // Token is in home area - use the home positions
        const homePositions = this.getHomePositions(playerColor)
        const posIndex = tokenIndex % homePositions.length
        return homePositions[posIndex]
      }

      case 'road': {
        // Token is on the main track
        const absPosition = (playerStartingIndex + progress) % MAIN_TRACK.length
        const gridPos = MAIN_TRACK[absPosition]
        return this.gridToPixel(gridPos.x, gridPos.y)
      }

      case 'homestretch': {
        // Token is on the homestretch
        // Progress in homestretch is relative to entering (typically after squares_to_homestretch)
        const homestretchProgress = this.boardSetup
          ? progress - this.boardSetup.squares_to_homestretch
          : progress
        const homestretchPos = HOMESTRETCH_POSITIONS[playerColor]
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
        // Token has finished - in the center
        return this.getHeavenPosition()
      }

      default:
        return this.getHeavenPosition()
    }
  }

  /**
   * Get absolute board position from player-relative progress
   */
  getAbsolutePosition(playerStartingIndex: number, progress: number): number {
    if (!this.boardSetup) return 0
    if (progress >= this.boardSetup.squares_to_homestretch) {
      return -1 // In homestretch, not on main track
    }
    return (playerStartingIndex + progress) % this.boardSetup.squares_to_homestretch
  }

  /**
   * Check if a position is a safe space
   */
  isSafeSpace(absolutePosition: number): boolean {
    if (!this.boardSetup) return false
    return this.boardSetup.safe_spaces.includes(absolutePosition)
  }

  /**
   * Get the path between two progress values (for animation)
   * Returns array of pixel positions to animate through
   */
  getMovePath(
    playerColor: PlayerColor,
    playerStartingIndex: number,
    fromProgress: number,
    toProgress: number,
    fromState: TokenState,
    toState: TokenState
  ): Point[] {
    const path: Point[] = []

    if (fromState === 'hell' && toState === 'road') {
      // Exiting hell - just go to start position
      path.push(
        this.getTokenPosition(playerColor, playerStartingIndex, 'road', 0)
      )
      return path
    }

    if (toState === 'heaven') {
      // Reaching heaven
      path.push(this.getHeavenPosition())
      return path
    }

    // Regular move on track or homestretch
    for (let p = fromProgress + 1; p <= toProgress; p++) {
      const state: TokenState =
        this.boardSetup && p >= this.boardSetup.squares_to_homestretch
          ? 'homestretch'
          : 'road'
      path.push(
        this.getTokenPosition(playerColor, playerStartingIndex, state, p)
      )
    }

    return path
  }
}

// Factory function to create board geometry
export function createBoardGeometry(
  canvasWidth: number,
  canvasHeight: number,
  padding?: number
): BoardGeometry {
  return new BoardGeometry(canvasWidth, canvasHeight, padding)
}
