'use client'

import { useEffect, useRef } from 'react'
import { useLogEntries } from '@/stores/selectors'
import type { EventLogSeverity, PlayerColor } from '@/types/game'

const SEVERITY_STYLES: Record<EventLogSeverity, string> = {
  info: 'bg-slate-100 dark:bg-slate-800',
  success: 'bg-green-100 dark:bg-green-900',
  warning: 'bg-amber-100 dark:bg-amber-900',
  danger: 'bg-red-100 dark:bg-red-900',
}

const PLAYER_COLOR_BORDER: Record<PlayerColor, string> = {
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 5) return 'now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  return `${Math.floor(minutes / 60)}h ago`
}

export function EventLog() {
  const logEntries = useLogEntries()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logEntries.length])

  if (logEntries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Event Log
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No events yet...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Event Log
        </h3>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-48 lg:max-h-64 p-2 space-y-1"
      >
        {logEntries.map((entry) => {
          const severityClass = SEVERITY_STYLES[entry.severity]
          const borderClass = entry.playerColor
            ? PLAYER_COLOR_BORDER[entry.playerColor]
            : 'border-l-gray-400'

          return (
            <div
              key={entry.id}
              className={`
                ${severityClass}
                ${borderClass}
                border-l-4 rounded-r px-2 py-1
                text-sm text-gray-800 dark:text-gray-200
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1">{entry.message}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
