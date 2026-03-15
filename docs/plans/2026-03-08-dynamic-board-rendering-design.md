# Dynamic Board Rendering Design

**Goal:** Replace all hardcoded geometry in `boardGeometry.ts` (currently fixed at grid_length=6, 15×15 board) with algorithmic generation from `grid_length` (range 3–12). Board geometry is created at game start when `board_setup` arrives from the backend.

## Core Formula Reference

| Property | Formula | g=3 | g=6 | g=12 |
|---|---|---|---|---|
| board_size | `2g + 3` | 9 | 15 | 27 |
| loop_length | `8g + 4` | 28 | 52 | 100 |
| homestretch_length | `g - 1` | 2 | 5 | 11 |
| heaven position | `(g+1, g+1)` | (4,4) | (7,7) | (13,13) |
| arm_length | `g - 1` | 2 | 5 | 11 |
| step | `2g + 1` | 7 | 13 | 25 |

## Corner-to-Color Mapping

| Corner | Color | Position |
|---|---|---|
| 0 | red | bottom-left |
| 1 | blue | bottom-right |
| 2 | green | top-right |
| 3 | yellow | top-left |

Starting positions: Red=0, Blue=2g+1, Green=4g+2, Yellow=6g+3.

## Board Shape

Cross shape with 3-cell-wide arms radiating from a 3×3 center. For board_size = 2g+3:

- Center 3×3: rows [g, g+2] × cols [g, g+2]
- Left arm: rows [g, g+2], cols [0, g-1]
- Right arm: rows [g, g+2], cols [g+3, 2g+2]
- Top arm: rows [0, g-1], cols [g, g+2]
- Bottom arm: rows [g+3, 2g+2], cols [g, g+2]
- Corner home areas: g×g squares in each board corner

## Track Generation Algorithm

The track wraps clockwise around the cross. Each of the 4 quadrants follows an identical rotated pattern (2g+1 positions per quadrant, 8g+4 total):

### Per-quadrant structure

1. **Finish current arm edge**: g-2 positions
2. **Traverse next arm's outer edge**: g positions
3. **Turn at board corner**: 2 positions
4. **Enter next arm**: 1 position

### Quadrant details (generic g)

**Red quadrant (positions 0 to 2g):** left arm bottom row → bottom arm left col → bottom edge
- Segment A: (x, g+2) for x from 2 to g-1, going right (g-2 positions)
- Segment B: (g, y) for y from g+3 to 2g+2, going down (g positions)
- Segment C: (g+1, 2g+2) then (g+2, 2g+2), going right (2 positions)
- Segment D: (g+2, 2g+1), going up (1 position)

**Blue quadrant (positions 2g+1 to 4g+1):** bottom arm right col → right arm bottom row → right edge
- Segment A: (g+2, y) for y from 2g to g+3, going up (g-2 positions)
- Segment B: (x, g+2) for x from g+3 to 2g+2, going right (g positions)
- Segment C: (2g+2, g+1) then (2g+2, g), going up (2 positions)
- Segment D: (2g+1, g), going left (1 position)

**Green quadrant (positions 4g+2 to 6g+2):** right arm top row → top arm right col → top edge
- Segment A: (x, g) for x from 2g to g+3, going left (g-2 positions)
- Segment B: (g+2, y) for y from g-1 to 0, going up (g positions)
- Segment C: (g+1, 0) then (g, 0), going left (2 positions)
- Segment D: (g, 1), going down (1 position)

**Yellow quadrant (positions 6g+3 to 8g+3):** top arm left col → left arm top row → left edge
- Segment A: (g, y) for y from 2 to g-1, going down (g-2 positions)
- Segment B: (x, g) for x from g-1 to 0, going left (g positions)
- Segment C: (0, g+1) then (0, g+2), going down (2 positions)
- Segment D: (1, g+2), going right (1 position)

## Homestretch Positions

g-1 positions along the middle row/col of each arm, pointing toward center:

- **Red**: (x, g+1) for x from 1 to g-1 (going right)
- **Blue**: (g+1, y) for y from 2g+1 to g+3 (going up)
- **Green**: (x, g+1) for x from 2g+1 to g+3 (going left)
- **Yellow**: (g+1, y) for y from 1 to g-1 (going down)

## Home (Hell) Positions

4 positions spread evenly in a 2×2 pattern within each g×g corner area:

```
offset1 = g/3 - 0.5  (relative to corner origin)
offset2 = 2g/3 - 0.5
positions = (offset1, offset1), (offset2, offset1), (offset1, offset2), (offset2, offset2)
```

Each color's corner origin:
- Red (bottom-left): (0, g+3)
- Blue (bottom-right): (g+3, g+3)
- Green (top-right): (g+3, 0)
- Yellow (top-left): (0, 0)

## Changes by File

### 1. `types/game.ts`
Add `grid_length` and `loop_length` as required fields to `BoardSetup`.

### 2. `lib/game/boardGeometry.ts` — Major rewrite
Replace all module-level hardcoded constants with functions computed from `grid_length`:

- `generateTrack(g)` — algorithmic clockwise track generation
- `generateHomestretch(g, color)` — g-1 positions per color
- `generateHomePositions(g, color)` — 4 spread positions per corner
- `generateHomeAreaBounds(g, color)` — g×g corner area bounds
- Heaven: `(g+1, g+1)`
- `PLAYER_START_POSITIONS` computed from g

`BoardGeometry` constructor gains `gridLength` parameter. All geometry computed once and cached.

### 3. `lib/pixi/PixiApp.ts`
Pass `gridLength` from `boardSetup` when creating `BoardGeometry`. Recreate geometry when `boardSetup` changes.

### 4. `lib/pixi/BoardRenderer.ts`
Minimal changes. Already uses geometry methods. Handle dynamic `getGridSize()`.

### 5. `lib/pixi/TokenRenderer.ts`
No changes expected. Already uses `geometry.getTokenPosition()`.

### 6. `lib/pixi/AnimationController.ts`
No changes expected. Already uses `geometry.getMovePath()`.

### 7. `hooks/usePixiApp.ts`
Minor update to pass `gridLength` when creating geometry.

## Data Flow

```
Backend sends board_setup with grid_length
    → Zustand store (boardSlice) stores it
    → PixiApp reads grid_length from board_setup
    → Creates BoardGeometry(canvasWidth, canvasHeight, padding, gridLength)
    → BoardGeometry generates all positions algorithmically
    → BoardRenderer + TokenRenderer + AnimationController use geometry as before
```

## What Doesn't Change

- Animation timing (fixed per cell)
- Token visual sizing (scales via cellSize × RADIUS_RATIO)
- All renderer APIs (consume geometry methods)
- WebSocket protocol (grid_length already in board_setup)
- Game state processing (eventProcessor, sequenceManager)
