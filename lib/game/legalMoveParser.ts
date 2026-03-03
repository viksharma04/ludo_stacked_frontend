import type { ParsedLegalMove, Player, Stack, HighlightableEntity } from '@/types/game'

/**
 * Parse a single legal move ID from the server
 *
 * Formats:
 * - Token: `{player_id}_token_{1-4}` (e.g., `abc_token_2`)
 * - Stack split: `{stack_id}:{partial_count}` (e.g., `stack_xyz:1`, `stack_xyz:2`)
 */
export function parseLegalMove(moveId: string): ParsedLegalMove {
  // Check if it's a stack split (contains colon)
  if (moveId.includes(':')) {
    const [stackId, countStr] = moveId.split(':')
    return {
      rawId: moveId,
      type: 'stack',
      entityId: stackId,
      stackSplitCount: parseInt(countStr, 10),
    }
  }

  // Check if it's a stack move (contains 'stack' but no colon)
  if (moveId.includes('stack')) {
    return {
      rawId: moveId,
      type: 'stack',
      entityId: moveId,
    }
  }

  // Otherwise it's a token
  return {
    rawId: moveId,
    type: 'token',
    entityId: moveId,
  }
}

/**
 * Group legal moves by entity ID
 * Returns a map where key is the entityId and value is array of parsed moves
 *
 * This is useful for detecting stacks with multiple split options
 */
export function groupLegalMoves(moveIds: string[]): Map<string, ParsedLegalMove[]> {
  const grouped = new Map<string, ParsedLegalMove[]>()

  for (const moveId of moveIds) {
    const parsed = parseLegalMove(moveId)
    const existing = grouped.get(parsed.entityId) || []
    existing.push(parsed)
    grouped.set(parsed.entityId, existing)
  }

  return grouped
}

/**
 * Get entities that should be highlighted on the board
 *
 * For tokens: returns the token ID directly with type 'token'
 * For stacks: returns the stack ID directly with type 'stack' (no lead token substitution)
 */
export function getHighlightableEntities(
  moveIds: string[]
): HighlightableEntity[] {
  const grouped = groupLegalMoves(moveIds)
  const entities: HighlightableEntity[] = []

  for (const [entityId, moves] of grouped) {
    const firstMove = moves[0]

    if (firstMove.type === 'token') {
      // Direct token - add with token type
      entities.push({ id: entityId, type: 'token' })
    } else {
      // Stack - return the stack ID directly, not a lead token
      entities.push({ id: entityId, type: 'stack' })
    }
  }

  return entities
}

/**
 * Find which entity (token or stack) was clicked based on token ID or stack ID
 * Returns the entityId used in legal moves
 *
 * IMPORTANT: We check legal moves first to determine entity type.
 * This handles cases where player.stacks may be stale (e.g., after a stack split).
 */
export function findEntityForToken(
  clickedId: string,
  players: Player[],
  legalMoves?: string[]
): { entityId: string; type: 'token' | 'stack' } {
  // If we have legal moves, use them as the source of truth
  if (legalMoves && legalMoves.length > 0) {
    const groupedMoves = groupLegalMoves(legalMoves)

    // Check if this is a stack ID that's directly in legal moves
    // (This handles the case where a stack sprite was clicked)
    if (clickedId.includes('stack') && groupedMoves.has(clickedId)) {
      return { entityId: clickedId, type: 'stack' }
    }

    // Check if this token ID is directly in legal moves
    if (groupedMoves.has(clickedId)) {
      return { entityId: clickedId, type: 'token' }
    }

    // Check if this token is part of a stack that has legal moves
    for (const player of players) {
      if (player.stacks) {
        for (const stack of player.stacks) {
          if (stack.tokens.includes(clickedId)) {
            // Only return stack if the stack actually has legal moves
            if (groupedMoves.has(stack.stack_id)) {
              return { entityId: stack.stack_id, type: 'stack' }
            }
          }
        }
      }
    }
  }

  // Fallback: check player.stacks (legacy behavior)
  for (const player of players) {
    if (player.stacks) {
      for (const stack of player.stacks) {
        if (stack.tokens.includes(clickedId)) {
          return { entityId: stack.stack_id, type: 'stack' }
        }
      }
    }
  }

  // Not in a stack, return as token
  return { entityId: clickedId, type: 'token' }
}

/**
 * Check if a stack has multiple split options
 */
export function hasMultipleSplitOptions(
  entityId: string,
  groupedMoves: Map<string, ParsedLegalMove[]>
): boolean {
  const moves = groupedMoves.get(entityId)
  return moves !== undefined && moves.length > 1
}

/**
 * Get stack information for a given entity
 */
export function getStackInfo(
  stackId: string,
  players: Player[]
): { stack: Stack; playerId: string } | null {
  for (const player of players) {
    if (player.stacks) {
      const stack = player.stacks.find((s) => s.stack_id === stackId)
      if (stack) {
        return { stack, playerId: player.player_id }
      }
    }
  }
  return null
}
