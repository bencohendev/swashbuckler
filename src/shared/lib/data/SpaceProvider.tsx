'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Space, SpacesClient } from './types'
import { createSupabaseDataClient } from './supabase'
import { createLocalDataClient, ensureLocalDefaultSpace } from './local'
import { createClient } from '@/shared/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { emit, subscribe } from './events'

const STORAGE_KEY = 'swashbuckler:currentSpaceId'

interface SpaceContextValue {
  space: Space | null
  spaces: Space[]
  switchSpace: (id: string) => void
  isLoading: boolean
}

interface SpacesContextValue {
  spaces: Space[]
  create: (input: { name: string; icon?: string }) => Promise<Space | null>
  update: (id: string, input: { name?: string; icon?: string }) => Promise<Space | null>
  remove: (id: string) => Promise<void>
}

const SpaceContext = createContext<SpaceContextValue | null>(null)
const SpacesContext = createContext<SpacesContextValue | null>(null)

interface SpaceProviderProps {
  children: ReactNode
  user: User | null
  isAuthLoading: boolean
}

export function SpaceProvider({ children, user, isAuthLoading }: SpaceProviderProps) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const spacesClient: SpacesClient = useMemo(() => {
    if (user) {
      const supabase = createClient()
      return createSupabaseDataClient(supabase).spaces
    }
    return createLocalDataClient().spaces
  }, [user])

  const loadSpaces = useCallback(async () => {
    const result = await spacesClient.list()
    if (result.error) {
      console.error('Failed to load spaces:', result.error.message)
      return
    }

    let loadedSpaces = result.data

    // If no spaces exist, create a default one
    if (loadedSpaces.length === 0) {
      if (user) {
        const createResult = await spacesClient.create({ name: 'My Space' })
        if (createResult.data) {
          loadedSpaces = [createResult.data]
        }
      } else {
        const defaultSpace = await ensureLocalDefaultSpace()
        loadedSpaces = [defaultSpace]
      }
    }

    setSpaces(loadedSpaces)

    // Restore last selected space from localStorage
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const savedSpace = savedId ? loadedSpaces.find(s => s.id === savedId) : null

    if (savedSpace) {
      setCurrentSpaceId(savedSpace.id)
    } else if (loadedSpaces.length > 0) {
      setCurrentSpaceId(loadedSpaces[0].id)
    }

    setIsLoading(false)
  }, [spacesClient, user])

  useEffect(() => {
    if (isAuthLoading) return
    loadSpaces()
  }, [isAuthLoading, loadSpaces])

  // Listen for spaces events to refresh
  useEffect(() => {
    return subscribe('spaces', loadSpaces)
  }, [loadSpaces])

  const switchSpace = useCallback((id: string) => {
    setCurrentSpaceId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  const currentSpace = useMemo(() => {
    return spaces.find(s => s.id === currentSpaceId) ?? null
  }, [spaces, currentSpaceId])

  const spaceContextValue: SpaceContextValue = useMemo(() => ({
    space: currentSpace,
    spaces,
    switchSpace,
    isLoading,
  }), [currentSpace, spaces, switchSpace, isLoading])

  const spacesContextValue: SpacesContextValue = useMemo(() => ({
    spaces,
    create: async (input: { name: string; icon?: string }) => {
      const result = await spacesClient.create(input)
      if (result.data) {
        emit('spaces')
        return result.data
      }
      return null
    },
    update: async (id: string, input: { name?: string; icon?: string }) => {
      const result = await spacesClient.update(id, input)
      if (result.data) {
        emit('spaces')
        return result.data
      }
      return null
    },
    remove: async (id: string) => {
      await spacesClient.delete(id)
      emit('spaces')
    },
  }), [spaces, spacesClient])

  return (
    <SpaceContext.Provider value={spaceContextValue}>
      <SpacesContext.Provider value={spacesContextValue}>
        {children}
      </SpacesContext.Provider>
    </SpaceContext.Provider>
  )
}

export function useCurrentSpace() {
  const context = useContext(SpaceContext)
  if (!context) {
    throw new Error('useCurrentSpace must be used within a SpaceProvider')
  }
  return context
}

export function useSpaces() {
  const context = useContext(SpacesContext)
  if (!context) {
    throw new Error('useSpaces must be used within a SpaceProvider')
  }
  return context
}
