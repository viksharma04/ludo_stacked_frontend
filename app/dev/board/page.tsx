'use client'

import { useEffect } from 'react'
import { GameCanvas } from '@/components/game/GameCanvas'
import { useGameStore, resetGameStore } from '@/stores/gameStore'
import type { GameState } from '@/types/game'

const MOCK_GAME_STATE: GameState = {
  phase: 'in_progress',
  current_event: 'player_roll',
  current_turn: null,
  event_seq: 0,
  board_setup: {
    grid_length: 6,
    loop_length: 52,
    squares_to_win: 57,
    squares_to_homestretch: 52,
    safe_spaces: [0, 8, 13, 21, 26, 34, 39, 47],
    starting_positions: [0, 13, 26, 39],
    get_out_rolls: [6],
  },
  players: [
    {
      player_id: 'player-red',
      name: 'Red',
      color: 'red',
      turn_order: 0,
      abs_starting_index: 0,
      stacks: [
        { stack_id: 'stack_1', state: 'road', height: 2, progress: 21 },
        { stack_id: 'stack_2', state: 'homestretch', height: 1, progress: 54 },
      ],
    },
    {
      player_id: 'player-blue',
      name: 'Blue',
      color: 'blue',
      turn_order: 1,
      abs_starting_index: 13,
      stacks: [
        { stack_id: 'stack_1', state: 'road', height: 1, progress: 8 },
        { stack_id: 'stack_2', state: 'road', height: 3, progress: 30 },
      ],
    },
    {
      player_id: 'player-green',
      name: 'Green',
      color: 'green',
      turn_order: 2,
      abs_starting_index: 26,
      stacks: [
        { stack_id: 'stack_1', state: 'hell', height: 1, progress: 0 },
        { stack_id: 'stack_2', state: 'homestretch', height: 1, progress: 56 },
        { stack_id: 'stack_3', state: 'road', height: 1, progress: 47 },
      ],
    },
    {
      player_id: 'player-yellow',
      name: 'Yellow',
      color: 'yellow',
      turn_order: 3,
      abs_starting_index: 39,
      stacks: [
        { stack_id: 'stack_1', state: 'road', height: 4, progress: 48 },
        { stack_id: 'stack_2', state: 'heaven', height: 1, progress: 0 },
      ],
    },
  ],
}

const MY_PLAYER_ID = 'player-red'

export default function DevBoardPage() {
  // Seed store on mount, clean up on unmount.
  // This works because GameCanvas's usePixiApp does async Pixi init (await app.init()),
  // so by the time it reads the store, this effect has already fired.
  // Additionally, PixiApp's store subscriptions (fireImmediately: true) react to changes.
  // In React 19 strict mode, the cleanup/re-mount cycle correctly resets and re-seeds.
  useEffect(() => {
    useGameStore.getState().initializeFromGameState(MOCK_GAME_STATE, MY_PLAYER_ID)
    return () => {
      resetGameStore()
    }
  }, [])

  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900">
      <GameCanvas className="w-full h-full" />
    </div>
  )
}
