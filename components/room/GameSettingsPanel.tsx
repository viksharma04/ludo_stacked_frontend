'use client'

import { useState, useCallback } from 'react'
import type { GameSettings } from '@/types/room'

interface GameSettingsPanelProps {
  onSettingsChange: (settings: GameSettings) => void
}

const DEFAULT_GRID_LENGTH = 6
const DEFAULT_GET_OUT_ROLLS = [6]

// Dot patterns for dice faces (positions in a 3x3 grid)
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
}

function DiceButton({
  value,
  selected,
  onToggle,
}: {
  value: number
  selected: boolean
  onToggle: () => void
}) {
  const dots = DICE_DOTS[value]

  return (
    <button
      onClick={onToggle}
      className={`w-9 h-9 rounded-md border-2 transition-all duration-150 flex items-center justify-center ${
        selected
          ? 'border-accent bg-accent/10 dark:bg-accent/20 shadow-sm'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 opacity-40 hover:opacity-70'
      }`}
      title={`Roll ${value} to get out`}
      type="button"
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-[2px] w-5 h-5">
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3)
          const col = i % 3
          const hasDot = dots.some(([r, c]) => r === row && c === col)
          return (
            <div
              key={i}
              className={`rounded-full ${
                hasDot
                  ? selected
                    ? 'bg-accent'
                    : 'bg-gray-400 dark:bg-gray-500'
                  : ''
              }`}
            />
          )
        })}
      </div>
    </button>
  )
}

export function GameSettingsPanel({ onSettingsChange }: GameSettingsPanelProps) {
  const [gridLength, setGridLength] = useState(DEFAULT_GRID_LENGTH)
  const [getOutRolls, setGetOutRolls] = useState<number[]>(DEFAULT_GET_OUT_ROLLS)

  const updateSettings = useCallback(
    (newGrid: number, newRolls: number[]) => {
      onSettingsChange({ grid_length: newGrid, get_out_rolls: newRolls })
    },
    [onSettingsChange]
  )

  const handleGridChange = (value: number) => {
    setGridLength(value)
    updateSettings(value, getOutRolls)
  }

  const handleToggleRoll = (value: number) => {
    let next: number[]
    if (getOutRolls.includes(value)) {
      // Don't allow deselecting the last one
      if (getOutRolls.length <= 1) return
      next = getOutRolls.filter((v) => v !== value)
    } else {
      next = [...getOutRolls, value].sort()
    }
    setGetOutRolls(next)
    updateSettings(gridLength, next)
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Game Settings
      </h3>

      {/* Get Out Rolls */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
          Rolls to get out of hell
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <DiceButton
              key={value}
              value={value}
              selected={getOutRolls.includes(value)}
              onToggle={() => handleToggleRoll(value)}
            />
          ))}
        </div>
      </div>

      {/* Grid Size */}
      <div>
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
          Grid size: {gridLength}
        </label>
        <input
          type="range"
          min={3}
          max={12}
          step={1}
          value={gridLength}
          onChange={(e) => handleGridChange(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
    </div>
  )
}
