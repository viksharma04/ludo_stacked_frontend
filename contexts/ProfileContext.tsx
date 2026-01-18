'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createApiClient } from '@/lib/api/client'
import type { Profile } from '@/types/profile'

interface ProfileContextType {
  profile: Profile | null
  isLoading: boolean
  error: Error | null
  updateDisplayName: (name: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  const fetchProfile = useCallback(async () => {
    // Cancel any in-flight fetch request
    fetchControllerRef.current?.abort()

    if (!session?.access_token) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    fetchControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    const client = createApiClient({ accessToken: session.access_token })
    const { data, error: fetchError } = await client.get<Profile>('/api/v1/profile', {
      signal: controller.signal,
    })

    // Ignore if this request was aborted
    if (controller.signal.aborted) {
      return
    }

    if (fetchError) {
      setError(fetchError)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setIsLoading(false)
  }, [session?.access_token])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateDisplayName = useCallback(async (name: string) => {
    if (!session?.access_token) {
      return { error: new Error('Not authenticated') }
    }

    // Cancel any in-flight fetch to prevent it from overwriting our update
    fetchControllerRef.current?.abort()
    fetchControllerRef.current = null

    const client = createApiClient({ accessToken: session.access_token })
    const { data, error: updateError } = await client.patch<Profile>('/api/v1/profile', {
      display_name: name,
    })

    if (updateError) {
      return { error: updateError }
    }

    setProfile(data)
    return { error: null }
  }, [session?.access_token])

  const refreshProfile = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        error,
        updateDisplayName,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
