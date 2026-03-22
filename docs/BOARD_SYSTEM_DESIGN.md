# Board System Reference

Complete reference for the Ludo Stacked board geometry, movement system, and game events. Intended for frontend developers building board rendering and animation systems.

## Board Geometry

Everything derives from a single parameter: **`grid_length`** (abbreviated `g` below). Default is `6`.

### Core Formulas

| Property | Formula | g=6 | g=8 |
|---|---|---|---|
| `step` | `2g + 1` | 13 | 17 |
| `loop_length` | `8g + 4` | 52 | 68 |
| `squares_to_homestretch` | `8g + 1` | 49 | 65 |
| `squares_to_win` | `9g + 1` | 55 | 73 |
| `homestretch_length` | `g - 1` | 5 | 7 |
| `safe_offset` | `2g - 5` | 7 | 11 |

- **`step`**: Distance between adjacent starting positions around the loop.
- **`loop_length`**: Total squares on the shared outer track (the "road"). This is `4 * step + 1` but use `8g + 4`.
- **`squares_to_homestretch`**: A stack's progress value at which it exits the shared road and enters its private homestretch lane.
- **`squares_to_win`**: The exact progress value that places a stack in heaven. Overshooting is not allowed.
- **`homestretch_length`**: Number of squares in the homestretch lane (progress values `squares_to_homestretch` through `squares_to_win - 1`).

### Starting Positions

Four corners are always defined, spaced `step` apart:

```
all_corners = [0, step, 2*step, 3*step]
# g=6: [0, 13, 26, 39]
# g=8: [0, 17, 34, 51]
```

Player count determines which corners are assigned:

| Players | Corners Used | Starting Positions (g=6) |
|---|---|---|
| 2 | 1st and 3rd (opposite) | `[0, 26]` |
| 3 | 1st, 2nd, 3rd | `[0, 13, 26]` |
| 4 | All four | `[0, 13, 26, 39]` |

Each player's `abs_starting_index` is their assigned corner position. This is the origin for all their progress calculations.

### Safe Spaces

Eight safe spaces exist regardless of player count — two per corner:

```
For each corner position `pos`:
  safe_space_1 = pos                    (the corner itself)
  safe_space_2 = pos + (2g - 5)        (offset from corner)
```

For g=6: `[0, 7, 13, 20, 26, 33, 39, 46]`
For g=8: `[0, 11, 17, 28, 34, 45, 51, 62]`

Stacks on safe spaces cannot be captured.

### Colors

Colors are mapped to board corners, not seat indices:

| Corner | Color |
|---|---|
| 0 | red |
| 1 | blue |
| 2 | green |
| 3 | yellow |

For 2-player games (corners 0 and 2), colors are red and green.

## Board Shape

The board is a cross shape built from a center square and four arms:

```
arm_width  = 3  (fixed, always 3 cells wide)
arm_length = grid_length - 1  (cells extending from center)
```

For g=6, `arm_length = 5`. The outer track wraps clockwise around this cross shape, giving `loop_length` cells.

The board render script (`scripts/board_render.py`) can generate an ASCII visualization:

```python
render_ludo_cross(arm_width=3, arm_length=grid_length - 1, label_track=True)
```

### Mapping Progress to Board Cells

The outer track is an ordered list of `(x, y)` cell coordinates that wraps clockwise around the cross. A stack's position on this track is its **absolute position** (see below). The frontend must build this same ordered track to map progress values to visual positions.

## Movement System

### Stack States

Every stack has one of four states:

```
HELL → ROAD → HOMESTRETCH → HEAVEN
```

| State | Description | Progress Range (g=6) |
|---|---|---|
| `hell` | Starting area. Not on the board. | always 0 |
| `road` | Shared outer track. Collisions possible. | 0 – 48 |
| `homestretch` | Private final lane. Only same-player stacking. | 49 – 54 |
| `heaven` | Finished. Permanent. | exactly 55 |

### Getting Out of Hell

A stack exits hell when the player rolls a value in `get_out_rolls` (default: `[6]`). The stack moves to `road` at `progress = 0`.

### Progress and Absolute Position

**Progress** is per-stack, relative to the player's starting corner. It counts how many squares the stack has moved since leaving hell.

**Absolute position** is where the stack sits on the shared board loop, used for collision detection:

```
abs_position = (player.abs_starting_index + stack.progress) % loop_length
```

This only applies to stacks on the `road`. Homestretch and heaven are private per player.

#### Example (g=6)

Player 1 (`abs_starting_index = 0`): progress 10 → abs_pos 10
Player 2 (`abs_starting_index = 26`): progress 10 → abs_pos 36
Player 2: progress 30 → abs_pos `(26 + 30) % 52 = 4`  (wrapped around)

### Effective Movement (Stack Height)

Stacks can have height > 1 (from merging). Movement is divided by height:

```
effective_roll = roll / stack.height  (must divide evenly, otherwise illegal)
new_progress = progress + effective_roll
```

A height-2 stack rolling a 6 moves 3 squares. A height-3 stack rolling a 6 moves 2 squares. A height-2 stack rolling a 5 is an illegal move (5 / 2 doesn't divide evenly).

### Overshooting

A stack cannot overshoot heaven. If `progress + effective_roll > squares_to_win`, the move is illegal.

### State Transitions During Movement

```
If new_progress == squares_to_win       → state becomes HEAVEN
If new_progress > squares_to_homestretch → state becomes HOMESTRETCH
Otherwise                                → state stays the same
```

## Stacking and Splitting

### Stack IDs

Stack IDs encode their composition using sorted component numbers:

```
"stack_1"       → single piece (height 1)
"stack_1_2"     → pieces 1+2 merged (height 2)
"stack_1_2_3"   → pieces 1+2+3 merged (height 3)
"stack_1_2_3_4" → all four pieces (height 4)
```

### Merging

When a same-player stack lands on another same-player stack (road or homestretch), they auto-merge:

```
stack_1 lands on stack_3 → stack_1_3 (height 2)
stack_2 lands on stack_1_3 → stack_1_2_3 (height 3)
```

Produces a `stack_update` event (remove old stacks, add merged stack).

### Splitting (Partial Moves)

A stack with height > 1 can split. The player can choose to move a sub-stack (peeled from the top = highest-numbered components):

```
stack_1_2_3 (height 3) with roll 6:
  - Move all 3: effective_roll = 6/3 = 2  → legal move "stack_1_2_3"
  - Move top 2: effective_roll = 6/2 = 3  → legal move "stack_2_3"
  - Move top 1: effective_roll = 6/1 = 6  → legal move "stack_3"
```

Produces a `stack_update` event (remove parent, add remaining + moving) followed by a `stack_moved` event.

## Collisions and Captures

### Collision Detection

When a stack lands on a `road` square, check all other stacks from all players at the same **absolute position**.

### Resolution Rules

| Scenario | Result |
|---|---|
| Same player | Auto-merge (stacking) |
| Opponent, on safe space | Coexist (no capture) |
| Opponent, moving height >= target height | **Capture**: target sent to hell |
| Opponent, moving height < target height | Coexist (no capture) |
| Multiple capturable opponents | Player must choose (`awaiting_capture_choice` event) |

### Capture Effects

- Captured stack is sent back to `hell` at `progress = 0`
- If captured stack had height > 1, it decomposes into individual stacks (all in hell)
- Capturing player receives **extra rolls** equal to captured stack's height

### Homestretch Collisions

Only same-player merges can occur in the homestretch. No opponent stacks exist in a player's private homestretch lane.

## Dice Rolling

### Basic Flow

1. Player rolls → `dice_rolled` event
2. If rolled 6 → gets another roll (`roll_granted` with reason `rolled_six`)
3. Repeat until non-6 or three sixes
4. All accumulated rolls presented together → `awaiting_choice` event

### Three Sixes Penalty

Rolling three consecutive sixes in one turn forfeits the turn entirely. No moves are made.

Event: `three_sixes_penalty`

### Extra Rolls

Extra rolls are granted (one at a time, after all accumulated rolls are used) for:

| Source | Rolls Granted | Event Reason |
|---|---|---|
| Rolling a 6 | 1 (immediate, during roll phase) | `rolled_six` |
| Capturing a stack | captured stack's height | `capture_bonus` |
| Reaching heaven | arriving stack's height | `reached_heaven` |

## Game Events Reference

All events include `event_type` (string) and `seq` (monotonically increasing sequence number).

### Game Lifecycle

| Event | Key Fields | When |
|---|---|---|
| `game_started` | `player_order`, `first_player_id` | Game begins |
| `game_ended` | `winner_id`, `final_rankings` | All 4 stacks of a player reach heaven |

### Turn Flow

| Event | Key Fields | When |
|---|---|---|
| `turn_started` | `player_id`, `turn_number` | New turn begins |
| `roll_granted` | `player_id`, `reason` | Player should roll the dice |
| `dice_rolled` | `player_id`, `value`, `roll_number`, `grants_extra_roll` | Dice rolled |
| `awaiting_choice` | `player_id`, `available_moves` | Player must choose a move |
| `awaiting_capture_choice` | `player_id`, `options` | Player must choose capture target |
| `turn_ended` | `player_id`, `reason`, `next_player_id` | Turn complete |
| `three_sixes_penalty` | `player_id`, `rolls` | Turn forfeited |

### Movement

| Event | Key Fields | When |
|---|---|---|
| `stack_exited_hell` | `player_id`, `stack_id`, `roll_used` | Stack leaves hell for road |
| `stack_moved` | `player_id`, `stack_id`, `from_state`, `to_state`, `from_progress`, `to_progress`, `roll_used` | Stack moves on road/homestretch |
| `stack_reached_heaven` | `player_id`, `stack_id` | Stack arrives at heaven |

### Stack Changes

| Event | Key Fields | When |
|---|---|---|
| `stack_update` | `player_id`, `add_stacks`, `remove_stacks` | Stacks merge or split |
| `stack_captured` | `capturing_player_id`, `capturing_stack_id`, `captured_player_id`, `captured_stack_id`, `position`, `grants_extra_roll` | Opponent stack captured |

### Animation Sequencing

Events are emitted in causal order within an action. For a split-move that triggers a capture:

1. `stack_update` (parent splits into remaining + moving)
2. `stack_moved` (moving stack advances)
3. `stack_captured` (opponent captured)
4. `stack_update` (captured stack decomposes if height > 1)

For entering heaven that triggers a same-player merge en route:

1. `stack_update` (merge at destination)
2. `stack_moved` (to new progress)
3. `stack_reached_heaven` (if applicable)

The `seq` field provides global ordering across all events in a game.

## `awaiting_choice` Structure

When a player has rolls to use, they receive grouped legal moves:

```json
{
  "event_type": "awaiting_choice",
  "player_id": "...",
  "available_moves": [
    {
      "roll": 6,
      "move_groups": [
        {
          "stack_id": "stack_1_2_3",
          "moves": ["stack_1_2_3", "stack_2_3", "stack_3"]
        },
        {
          "stack_id": "stack_4",
          "moves": ["stack_4"]
        }
      ]
    },
    {
      "roll": 3,
      "move_groups": [
        {
          "stack_id": "stack_4",
          "moves": ["stack_4"]
        }
      ]
    }
  ]
}
```

- **`roll`**: The dice value this group of moves consumes.
- **`move_groups`**: Grouped by parent stack. Each group lists the parent `stack_id` and the `moves` array of stack IDs the player can choose to move (full stack or sub-stack splits).
- The player responds with a `game_action` containing `action_type: "move"`, `roll_value`, and `stack_id` (one of the listed moves).

## Board Setup in GameState

The `board_setup` object is included in the `game_state` payload sent to all players on `game_started`. It contains all derived values the frontend needs:

```json
{
  "board_setup": {
    "grid_length": 6,
    "loop_length": 52,
    "squares_to_win": 55,
    "squares_to_homestretch": 49,
    "starting_positions": [0, 26],
    "safe_spaces": [0, 7, 13, 20, 26, 33, 39, 46],
    "get_out_rolls": [6]
  }
}
```

The frontend does not need to recompute any formulas — all derived values are provided. However, understanding the geometry is essential for:

1. **Building the visual track** — mapping `loop_length` positions to cell coordinates on the cross-shaped board
2. **Rendering homestretch lanes** — each player has a private lane of `homestretch_length` cells leading from their starting corner toward the center
3. **Animating movement** — converting `from_progress`/`to_progress` in events to visual cell positions using `abs_starting_index`
4. **Highlighting safe spaces** — marking the 8 safe positions on the visual board
5. **Scaling the board** — `arm_length = grid_length - 1` determines the physical size of each arm of the cross
