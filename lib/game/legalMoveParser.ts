import type { Stack, Player, RollMoveGroup, LegalMoveGroup } from '@/types/game'

/**
 * Flatten available_moves to get all unique selectable stack IDs
 */
export function flattenAvailableMoves(moves: RollMoveGroup[]): string[] {
  const stackIds = new Set<string>()
  for (const rollGroup of moves) {
    for (const moveGroup of rollGroup.move_groups) {
      stackIds.add(moveGroup.stack_id)
    }
  }
  return Array.from(stackIds)
}

/**
 * Find which roll values a stack can use
 */
export function getRollsForStack(
  stackId: string,
  availableMoves: RollMoveGroup[]
): number[] {
  const rolls: number[] = []
  for (const rollGroup of availableMoves) {
    for (const moveGroup of rollGroup.move_groups) {
      if (moveGroup.stack_id === stackId) {
        rolls.push(rollGroup.roll)
        break
      }
    }
  }
  return rolls
}

/**
 * Get move options for a specific stack + roll combination
 * Returns the moves array (full stack + possible sub-stack splits)
 */
export function getMovesForStackAndRoll(
  stackId: string,
  rollValue: number,
  availableMoves: RollMoveGroup[]
): string[] {
  const rollGroup = availableMoves.find(rg => rg.roll === rollValue)
  if (!rollGroup) return []
  const moveGroup = rollGroup.move_groups.find(mg => mg.stack_id === stackId)
  return moveGroup?.moves ?? []
}

/**
 * Get the LegalMoveGroup for a specific stack + roll combination
 */
export function getMoveGroupForStackAndRoll(
  stackId: string,
  rollValue: number,
  availableMoves: RollMoveGroup[]
): LegalMoveGroup | null {
  const rollGroup = availableMoves.find(rg => rg.roll === rollValue)
  if (!rollGroup) return null
  return rollGroup.move_groups.find(mg => mg.stack_id === stackId) ?? null
}

/**
 * Check if a move ID represents a sub-stack split
 * When moves array has more than one entry, the first is full stack
 * and subsequent are splits
 */
export function hasSplitOptions(moves: string[]): boolean {
  return moves.length > 1
}

/**
 * Get stack info from player data
 */
export function getStackInfo(
  stackId: string,
  players: Player[]
): { stack: Stack; playerId: string } | null {
  for (const player of players) {
    const stack = player.stacks.find((s) => s.stack_id === stackId)
    if (stack) {
      return { stack, playerId: player.player_id }
    }
  }
  return null
}
