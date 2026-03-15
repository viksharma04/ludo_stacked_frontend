# Dynamic Board Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded board geometry (fixed at grid_length=6) with algorithmic generation from `grid_length` (range 3–12), so the Pixi.js board renders correctly for any board size.

**Architecture:** `BoardGeometry` gains a `gridLength` constructor parameter. All track coordinates, homestretch positions, home positions, home area bounds, and heaven position are computed algorithmically at construction time rather than defined as module-level constants. `PixiApp` recreates geometry when `boardSetup` arrives with a new `grid_length`. All downstream renderers (`BoardRenderer`, `TokenRenderer`, `AnimationController`) work unchanged since they already consume geometry via methods.

**Tech Stack:** TypeScript, Pixi.js, Zustand

---

### Task 1: Update BoardSetup type

**Files:**
- Modify: `types/game.ts:54-60`

**Step 1: Add grid_length and loop_length to BoardSetup**

Change the `BoardSetup` interface from:

```typescript
export interface BoardSetup {
  squares_to_win: number
  squares_to_homestretch: number
  starting_positions: number[]
  safe_spaces: number[]
  get_out_rolls: number[]
}
```

to:

```typescript
export interface BoardSetup {
  grid_length: number
  loop_length: number
  squares_to_win: number
  squares_to_homestretch: number
  starting_positions: number[]
  safe_spaces: number[]
  get_out_rolls: number[]
}
```

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add types/game.ts
git commit -m "feat: add grid_length and loop_length to BoardSetup type"
```

---

### Task 2: Rewrite boardGeometry.ts with algorithmic generation

**Files:**
- Rewrite: `lib/game/boardGeometry.ts`

**Context:** This is the core change. All hardcoded constants (`GRID_SIZE`, `MAIN_TRACK`, `HOMESTRETCH_POSITIONS`, `HOME_POSITIONS`, `HOME_AREA_BOUNDS`, `HEAVEN_POSITION`, `PLAYER_START_POSITIONS`, `TRACK_LENGTH`) are removed. Everything is computed from `gridLength` inside `BoardGeometry`.

**Step 1: Replace the entire file**

Replace `lib/game/boardGeometry.ts` with:

```typescript
import type { Point, BoardSetup, PlayerColor, StackState } from '@/types/game'

const COLORS_IN_ORDER: PlayerColor[] = ['red', 'blue', 'green', 'yellow']

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
```

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: PASS (the unused `COLORS_IN_ORDER` will be flagged — remove it if so)

**Step 3: Commit**

```bash
git add lib/game/boardGeometry.ts
git commit -m "feat: rewrite boardGeometry with algorithmic generation from grid_length"
```

---

### Task 3: Update PixiApp to use dynamic gridLength

**Files:**
- Modify: `lib/pixi/PixiApp.ts:8-16` (class properties)
- Modify: `lib/pixi/PixiApp.ts:42` (init geometry creation)
- Modify: `lib/pixi/PixiApp.ts:69` (handleResize geometry creation)
- Modify: `lib/pixi/PixiApp.ts:112-123` (boardSetup subscription)

**Step 1: Add gridLength property**

After `private unsubscribers: (() => void)[] = []` (~line 16), add:

```typescript
private gridLength: number = 6
```

**Step 2: Update init() geometry creation**

Change line 42 from:
```typescript
this.geometry = createBoardGeometry(width, height, 20)
```
to:
```typescript
this.geometry = createBoardGeometry(width, height, 20, this.gridLength)
```

**Step 3: Update handleResize() geometry creation**

Change line 69 from:
```typescript
this.geometry = createBoardGeometry(width, height, 20)
```
to:
```typescript
this.geometry = createBoardGeometry(width, height, 20, this.gridLength)
```

**Step 4: Update boardSetup subscription to recreate geometry on gridLength change**

Change the boardSetup subscription (~lines 112-123) from:

```typescript
const unsubBoardSetup = useGameStore.subscribe(
  (state) => state.boardSetup,
  (boardSetup) => {
    if (boardSetup && this.geometry) {
      this.geometry.setBoardSetup(boardSetup)
      if (this.boardRenderer) {
        this.boardRenderer.render()
      }
    }
  },
  { fireImmediately: true }
)
```

to:

```typescript
const unsubBoardSetup = useGameStore.subscribe(
  (state) => state.boardSetup,
  (boardSetup) => {
    if (boardSetup && this.geometry) {
      // Recreate geometry if grid_length changed
      if (boardSetup.grid_length !== this.gridLength) {
        this.gridLength = boardSetup.grid_length
        const width = this.container.clientWidth || 800
        const height = this.container.clientHeight || 800
        this.geometry = createBoardGeometry(width, height, 20, this.gridLength)
        if (this.boardRenderer) {
          this.boardRenderer.setGeometry(this.geometry)
        }
        if (this.tokenRenderer) {
          this.tokenRenderer.setGeometry(this.geometry)
        }
      }
      this.geometry.setBoardSetup(boardSetup)
      if (this.boardRenderer) {
        this.boardRenderer.render()
      }
    }
  },
  { fireImmediately: true }
)
```

**Step 5: Verify no lint errors**

Run: `npm run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/pixi/PixiApp.ts
git commit -m "feat: recreate board geometry when grid_length changes"
```

---

### Task 4: Remove unused HOME_AREA_BOUNDS import from BoardRenderer

**Files:**
- Modify: `lib/pixi/BoardRenderer.ts:2`

**Step 1: Update the import**

Change line 2 from:
```typescript
import { BoardGeometry, HOME_AREA_BOUNDS } from '@/lib/game/boardGeometry'
```
to:
```typescript
import { BoardGeometry } from '@/lib/game/boardGeometry'
```

(`HOME_AREA_BOUNDS` was imported but never used directly — the renderer accesses bounds via `geometry.getHomeAreaPixelBounds()`.)

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add lib/pixi/BoardRenderer.ts
git commit -m "chore: remove unused HOME_AREA_BOUNDS import"
```

---

### Task 5: Build verification

**Step 1: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from dynamic board rendering"
```
