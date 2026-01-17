'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { StackVisual } from './StackVisual'

export function Hero() {
  const { user, isLoading } = useAuth()

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
          Ludo Stacked
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Classic Ludo. Strategic Twist.
        </p>

        <StackVisual />

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          {isLoading ? (
            <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors text-center"
            >
              Play Now
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors text-center"
              >
                Play Now
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors text-center"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
