'use client'

import { useState } from 'react'
import { EventLog } from './EventLog'

export function EventLogDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger button - positioned above the fixed dice bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[52px] right-3 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-md text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        Events
      </button>

      {/* Drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl flex flex-col animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Close button row */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Event Log
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Event log content */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              <EventLog bare />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
