'use client'

import { useEffect, useRef } from 'react'
import { PLAYER_COLORS, type PlayerColor } from '@/types/game'
import type { MoveOption } from '@/lib/game/legalMoveParser'

interface SplitPopoverProps {
  x: number
  y: number
  options: MoveOption[]
  playerColor: PlayerColor
  onSelect: (moveId: string, roll: number) => void
  onDismiss: () => void
}

function hexToCSS(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

function TokenDots({ count, color, size }: { count: number; color: string; size: number }) {
  // Stack dots vertically, overlapping slightly
  const dotSize = size
  const overlap = dotSize * 0.3
  const totalHeight = dotSize + (count - 1) * (dotSize - overlap)

  return (
    <svg width={dotSize + 4} height={totalHeight + 4} viewBox={`-2 -2 ${dotSize + 4} ${totalHeight + 4}`}>
      {Array.from({ length: count }, (_, i) => {
        const cy = totalHeight - dotSize / 2 - i * (dotSize - overlap)
        return (
          <circle
            key={i}
            cx={dotSize / 2}
            cy={cy}
            r={dotSize / 2 - 1}
            fill={color}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}

export function SplitPopover({
  x,
  y,
  options,
  playerColor,
  onSelect,
  onDismiss,
}: SplitPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Dismiss on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    // Delay to avoid the triggering click
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [onDismiss])

  const color = hexToCSS(PLAYER_COLORS[playerColor].primary)

  // Flatten all (moveId, roll, tokenCount) choices
  const choices: { moveId: string; roll: number; tokenCount: number }[] = []
  for (const opt of options) {
    for (const moveId of opt.moves) {
      // Token count from the move ID: count underscored segments after "stack_"
      const parts = moveId.replace('stack_', '').split('_')
      choices.push({ moveId, roll: opt.roll, tokenCount: parts.length })
    }
  }

  // Sort by token count descending (full stack first)
  choices.sort((a, b) => b.tokenCount - a.tokenCount)

  // Deduplicate by moveId (same split across different rolls picks first)
  const seen = new Set<string>()
  const unique = choices.filter(c => {
    if (seen.has(c.moveId)) return false
    seen.add(c.moveId)
    return true
  })

  const dotSize = 14

  return (
    <div
      ref={popoverRef}
      className="absolute z-40 flex gap-1 rounded-full px-2 py-1.5 shadow-lg"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -120%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {unique.map((choice) => (
        <button
          key={choice.moveId}
          onClick={() => onSelect(choice.moveId, choice.roll)}
          className="flex items-center justify-center rounded-full hover:bg-white/20 transition-colors p-1"
          title={`Move ${choice.tokenCount} token${choice.tokenCount !== 1 ? 's' : ''}`}
        >
          <TokenDots count={choice.tokenCount} color={color} size={dotSize} />
        </button>
      ))}
    </div>
  )
}
