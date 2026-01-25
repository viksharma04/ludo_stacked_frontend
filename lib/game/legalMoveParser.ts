import type { ParsedLegalMove, Player, Stack } from '@/types/game'

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
 * Get token IDs that should be highlighted on the board
 *
 * For tokens: returns the token ID directly
 * For stacks: returns the lead token in the stack (deterministically selected)
 */
export function getHighlightableTokenIds(
  moveIds: string[],
  players: Player[]
): string[] {
  const grouped = groupLegalMoves(moveIds)
  const tokenIds: string[] = []

  for (const [entityId, moves] of grouped) {
    const firstMove = moves[0]

    if (firstMove.type === 'token') {
      // Direct token - add its ID
      tokenIds.push(entityId)
    } else {
      // Stack - find the stack and get its lead token (deterministically selected)
      const token = findLeadTokenInStack(entityId, players)
      if (token) {
        tokenIds.push(token)
      }
    }
  }

  return tokenIds
}

/**
 * Find the lead token ID in a stack (used for highlighting)
 * Uses deterministic selection (lowest token number) to ensure all clients agree
 */
function findLeadTokenInStack(stackId: string, players: Player[]): string | null {
  for (const player of players) {
    if (player.stacks) {
      const stack = player.stacks.find((s) => s.stack_id === stackId)
      if (stack && stack.tokens.length > 0) {
        // Use deterministic selection - lowest token number
        return stack.tokens.slice().sort((a, b) => {
          const numA = parseInt(a.split('_').pop() || '0', 10)
          const numB = parseInt(b.split('_').pop() || '0', 10)
          return numA - numB
        })[0]
      }
    }
  }
  return null
}

/**
 * Find which entity (token or stack) was clicked based on token ID
 * Returns the entityId used in legal moves
 *
 * IMPORTANT: We check legal moves first to determine entity type.
 * This handles cases where player.stacks may be stale (e.g., after a stack split).
 */
export function findEntityForToken(
  clickedTokenId: string,
  players: Player[],
  legalMoves?: string[]
): { entityId: string; type: 'token' | 'stack' } {
  // If we have legal moves, use them as the source of truth
  if (legalMoves && legalMoves.length > 0) {
    const groupedMoves = groupLegalMoves(legalMoves)

    // First check if this token ID is directly in legal moves
    if (groupedMoves.has(clickedTokenId)) {
      return { entityId: clickedTokenId, type: 'token' }
    }

    // Check if this token is part of a stack that has legal moves
    for (const player of players) {
      if (player.stacks) {
        for (const stack of player.stacks) {
          if (stack.tokens.includes(clickedTokenId)) {
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
        if (stack.tokens.includes(clickedTokenId)) {
          return { entityId: stack.stack_id, type: 'stack' }
        }
      }
    }
  }

  // Not in a stack, return as token
  return { entityId: clickedTokenId, type: 'token' }
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
