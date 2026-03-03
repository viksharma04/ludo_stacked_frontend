# Frontend Update: StackSplit Event Removed

## Overview

The `stack_split` event has been removed and replaced with a combination of existing events (`stack_dissolved` + `stack_formed`) when a partial stack move occurs. This simplifies frontend rendering by using existing event types.

**Recent Update:** The `stack_dissolved` event now includes a `results` field that describes exactly what the stack dissolved into (tokens and/or smaller stacks with their positions). This eliminates the need to correlate subsequent `stack_formed` events for rendering.

---

## What Changed

### Removed Event

```typescript
// REMOVED - No longer emitted
interface StackSplit {
  event_type: "stack_split";
  player_id: string;
  original_stack_id: string;
  moving_token_ids: string[];
  remaining_token_ids: string[];
  new_stack_id: string | null;
}
```

### Updated `stack_dissolved` Event Structure

The `stack_dissolved` event now includes a `results` field describing what the stack became:

```typescript
interface DissolvedResult {
  type: "token" | "stack";
  id: string;              // token_id or stack_id
  token_ids?: string[];    // Only present when type="stack"
  position: number;        // Progress value where this piece is located
}

interface StackDissolved {
  event_type: "stack_dissolved";
  player_id: string;
  stack_id: string;
  token_ids: string[];
  reason: "split" | "captured";
  results: DissolvedResult[];  // NEW: What the stack dissolved into
}
```

### Event Flow for Partial Stack Moves

When a player moves only some tokens from a stack (e.g., moving 2 tokens from a stack of 3), the backend emits:

1. **`stack_dissolved`** - Original stack is dissolved (reason: "split"), includes `results` describing the new pieces
2. **`stack_formed`** - New stack for remaining tokens (only if 2+ remain)
3. **`stack_formed`** - New stack for moving tokens (only if 2+ are moving)
4. **`stack_moved`** or **`token_moved`** - The actual movement

**Note:** The `results` field in `stack_dissolved` provides all the information needed for immediate rendering. The subsequent `stack_formed` events provide redundant information for systems that prefer event-by-event processing.

---

## Event Examples

### Example: Split a 3-token stack, move 2 tokens

**Scenario:** Stack of 3 tokens at position 10, player moves 2 tokens forward by 2 squares.

**Events emitted (in order):**

```typescript
// 1. Original stack dissolved - results show what it became
{
  event_type: "stack_dissolved",
  player_id: "uuid",
  stack_id: "uuid_stack_1",        // Original stack ID
  token_ids: ["token_1", "token_2", "token_3"],
  reason: "split",
  results: [
    { type: "token", id: "token_3", position: 10 },           // Remaining single token
    { type: "stack", id: "uuid_stack_2", token_ids: ["token_1", "token_2"], position: 12 }  // Moving stack
  ]
}

// 2. New stack formed for moving tokens (2 tokens = stack)
{
  event_type: "stack_formed",
  player_id: "uuid",
  stack_id: "uuid_stack_2",        // NEW stack ID
  token_ids: ["token_1", "token_2"],
  position: 12                      // Destination position
}

// 3. Stack moved
{
  event_type: "stack_moved",
  player_id: "uuid",
  stack_id: "uuid_stack_2",        // Matches the newly formed stack
  token_ids: ["token_1", "token_2"],
  from_progress: 10,
  to_progress: 12,
  roll_used: 4,
  effective_roll: 2
}
```

**Note:** No `stack_formed` for remaining token because only 1 token remains (becomes individual). The `results` field shows it as `type: "token"`.

### Example: Split a 4-token stack, move 2 tokens

**Scenario:** Stack of 4 tokens, player moves 2 tokens.

**Events emitted:**

```typescript
// 1. Original stack dissolved - results show both new stacks
{
  event_type: "stack_dissolved",
  stack_id: "uuid_stack_1",
  token_ids: ["token_1", "token_2", "token_3", "token_4"],
  reason: "split",
  results: [
    { type: "stack", id: "uuid_stack_2", token_ids: ["token_3", "token_4"], position: 10 },  // Remaining
    { type: "stack", id: "uuid_stack_3", token_ids: ["token_1", "token_2"], position: 12 }   // Moving
  ]
}

// 2. New stack for remaining 2 tokens
{
  event_type: "stack_formed",
  stack_id: "uuid_stack_2",        // NEW stack ID
  token_ids: ["token_3", "token_4"],
  position: 10                      // Original position
}

// 3. New stack for moving 2 tokens
{
  event_type: "stack_formed",
  stack_id: "uuid_stack_3",        // NEW stack ID
  token_ids: ["token_1", "token_2"],
  position: 12                      // Destination
}

// 4. Stack moved
{
  event_type: "stack_moved",
  stack_id: "uuid_stack_3",
  ...
}
```

### Example: Split a 3-token stack, move 1 token

**Scenario:** Stack of 3 tokens, player moves 1 token.

**Events emitted:**

```typescript
// 1. Original stack dissolved - results show stack + individual token
{
  event_type: "stack_dissolved",
  stack_id: "uuid_stack_1",
  token_ids: ["token_1", "token_2", "token_3"],
  reason: "split",
  results: [
    { type: "stack", id: "uuid_stack_2", token_ids: ["token_2", "token_3"], position: 10 },  // Remaining stack
    { type: "token", id: "token_1", position: 14 }                                           // Moving token
  ]
}

// 2. New stack for remaining 2 tokens
{
  event_type: "stack_formed",
  stack_id: "uuid_stack_2",        // NEW stack ID
  token_ids: ["token_2", "token_3"],
  position: 10
}

// 3. Single token moved (no stack_formed for 1 token)
{
  event_type: "token_moved",
  token_id: "token_1",
  from_progress: 10,
  to_progress: 14,
  ...
}
```

---

## Frontend Implementation Changes

### 1. Remove `stack_split` handler

```typescript
// REMOVE this from your event handlers
stack_split: (e) => animateStackSplit(e.moving_token_ids, e.remaining_token_ids),
```

### 2. Update `stack_dissolved` handler (Recommended Approach)

The `stack_dissolved` event now includes a `results` field that provides all the information needed for immediate rendering:

```typescript
stack_dissolved: (e) => {
  // Dissolve the original stack visual
  removeStackVisual(e.stack_id);

  // Immediately render the resulting pieces from the results field
  for (const result of e.results) {
    if (result.type === "token") {
      // Render individual token at position
      renderToken(result.id, result.position);
    } else {
      // Render new stack at position
      renderStack(result.id, result.token_ids, result.position);
    }
  }

  // Optionally trigger animations based on reason
  if (e.reason === "captured") {
    // Tokens go to hell - animate capture effect
    animateCaptureEffect(e.token_ids);
  } else if (e.reason === "split") {
    // Stack split for movement - animate split effect
    animateSplitEffect(e.stack_id, e.results);
  }
}
```

**Key benefit:** You no longer need to wait for or correlate subsequent `stack_formed` events - the `results` field gives you everything upfront.

### 3. Alternative: Event-by-Event Processing

If you prefer processing events sequentially, the `stack_formed` events still follow `stack_dissolved`:

```typescript
stack_dissolved: (e) => {
  if (e.reason === "captured") {
    animateStackBreak(e.stack_id, e.token_ids);
  } else if (e.reason === "split") {
    // Just dissolve - stack_formed events will follow
    animateStackDissolve(e.stack_id);
  }
}

stack_formed: (e) => {
  // Create stack visual at the given position
  animateStackForm(e.token_ids, e.position, e.stack_id);
}
```

### 4. Updated Event Animation Map

```typescript
const eventAnimations = {
  // ... other handlers ...
  stack_formed: (e) => animateStackForm(e.token_ids, e.position),
  stack_dissolved: (e) => handleStackDissolved(e),  // Use results field
  stack_moved: (e) => animateStackMove(e.stack_id, e.from_progress, e.to_progress),
  // stack_split: REMOVED
};
```

### 5. Captured Stack Handling

When a stack is captured, all tokens go to HELL (position 0):

```typescript
// Example stack_dissolved event for capture
{
  event_type: "stack_dissolved",
  stack_id: "uuid_stack_1",
  token_ids: ["token_1", "token_2"],
  reason: "captured",
  results: [
    { type: "token", id: "token_1", position: 0 },  // In HELL
    { type: "token", id: "token_2", position: 0 }   // In HELL
  ]
}
```

---

## Key Points

1. **No more `stack_split` event** - Remove any handlers for it
2. **`stack_dissolved.results` field** - Contains all information about resulting pieces (type, id, token_ids, position)
3. **`stack_dissolved` with reason "split"** - Indicates a partial move is happening
4. **`stack_dissolved` with reason "captured"** - All tokens go to HELL (position 0)
5. **New stack IDs** - Both remaining and moving token groups get NEW stack IDs (original ID is retired)
6. **Two rendering approaches**:
   - **Recommended**: Use `results` field directly for immediate rendering
   - **Alternative**: Process subsequent `stack_formed` events sequentially
7. **Event order matters** - If using event-by-event processing, process sequentially for correct animation

---

## Animation Sequence Recommendation

### Using `results` Field (Recommended)

For a partial stack move, you can animate everything from the `stack_dissolved` event:

1. **On `stack_dissolved`**:
   - Dissolve original stack visual
   - Read `results` to know where each piece ends up
   - Animate tokens/stacks moving to their final positions

2. **On `stack_moved`/`token_moved`**: Optional - can be used for movement trails or confirmation

### Using Event-by-Event Processing

1. **On `stack_dissolved`**: Visually break apart the original stack
2. **On `stack_formed`**: Show tokens grouping into new stack(s)
3. **On `stack_moved`/`token_moved`**: Animate the movement

Since events arrive together, you may want to queue animations or combine them for a smooth visual experience.

---

## TypeScript Types

```typescript
interface DissolvedResult {
  type: "token" | "stack";
  id: string;
  token_ids?: string[];  // Only for type="stack"
  position: number;
}

interface StackDissolved {
  event_type: "stack_dissolved";
  seq: number;
  player_id: string;
  stack_id: string;
  token_ids: string[];
  reason: "split" | "captured";
  results: DissolvedResult[];
}
```
