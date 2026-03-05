# Frontend Integration: `roll_granted` Event

## Summary

A new WebSocket event `roll_granted` has been added to explicitly signal when the frontend should display the dice roll UI. This replaces relying on `turn_started` for triggering dice rolls.

## Why This Change?

Previously, the frontend used `turn_started` to trigger the dice roll UI. However, there are scenarios where a player needs to roll again **without** a new turn starting:

1. **Rolling a 6** - Player gets an extra roll (same turn continues)
2. **Capturing opponent tokens** - Player gets bonus rolls equal to tokens captured

The `roll_granted` event provides a single, consistent trigger for the dice UI across all scenarios.

## Event Schema

```typescript
interface RollGrantedEvent {
  event_type: "roll_granted";
  seq: number;
  player_id: string; // UUID of player who should roll
  reason: "turn_start" | "rolled_six" | "capture_bonus";
}
```

## When `roll_granted` is Emitted

| Scenario | Events Emitted (in order) |
|----------|---------------------------|
| Game starts | `game_started` → `turn_started` → `roll_granted` |
| New turn begins | `turn_ended` → `turn_started` → `roll_granted` |
| Player rolls a 6 | `dice_rolled` → `roll_granted` |
| Player captures token(s) | `token_captured` → ... → `roll_granted` |
| Three sixes penalty | `three_sixes_penalty` → `turn_ended` → `turn_started` → `roll_granted` |

## Frontend Implementation

### Before (using `turn_started`)

```typescript
// OLD - Don't use this anymore
socket.on("game_events", (events) => {
  for (const event of events) {
    if (event.event_type === "turn_started") {
      if (event.player_id === currentUserId) {
        showDiceRollUI();
      }
    }
  }
});
```

### After (using `roll_granted`)

```typescript
// NEW - Use roll_granted as the single trigger for dice UI
socket.on("game_events", (events) => {
  for (const event of events) {
    if (event.event_type === "roll_granted") {
      if (event.player_id === currentUserId) {
        showDiceRollUI();

        // Optional: customize UI based on reason
        if (event.reason === "capture_bonus") {
          showBonusRollIndicator();
        } else if (event.reason === "rolled_six") {
          showExtraRollIndicator();
        }
      }
    }
  }
});
```

## Reason Field Usage

The `reason` field can be used for:

- **UI feedback**: Show different animations or messages
  - `"turn_start"` → "Your turn!"
  - `"rolled_six"` → "You rolled a 6! Roll again!"
  - `"capture_bonus"` → "Capture bonus! Roll again!"
- **Analytics**: Track why players get extra rolls
- **Sound effects**: Play different sounds for bonus rolls

## Migration Notes

1. **`turn_started` still exists** - Use it for:
   - Updating the "current player" indicator
   - Tracking turn numbers
   - Starting turn timers

2. **`roll_granted` is the dice trigger** - Use it exclusively for:
   - Showing/enabling the dice roll button
   - Triggering dice roll animations

3. **Both events fire together** when a new turn starts, so there's no race condition.

## Example Event Sequence

### Capture Scenario

Player A moves a token and captures Player B's token:

```json
[
  {
    "event_type": "token_moved",
    "player_id": "player-a-uuid",
    "token_id": "token-1",
    "from_progress": 10,
    "to_progress": 15,
    ...
  },
  {
    "event_type": "token_captured",
    "capturing_player_id": "player-a-uuid",
    "captured_player_id": "player-b-uuid",
    "captured_token_id": "token-5",
    "grants_extra_roll": true,
    ...
  },
  {
    "event_type": "roll_granted",
    "player_id": "player-a-uuid",
    "reason": "capture_bonus"
  }
]
```

### Rolling a 6 Scenario

Player A rolls a 6:

```json
[
  {
    "event_type": "dice_rolled",
    "player_id": "player-a-uuid",
    "value": 6,
    "roll_number": 1,
    "grants_extra_roll": true
  },
  {
    "event_type": "roll_granted",
    "player_id": "player-a-uuid",
    "reason": "rolled_six"
  }
]
```
