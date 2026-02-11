'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Space, SpacesClient, SharingClient, SpaceSharePermission } from './types'
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
  sharedPermission: SpaceSharePermission | null
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
  const [ownedSpaces, setOwnedSpaces] = useState<Space[]>([])
  const [sharedSpaces, setSharedSpaces] = useState<Space[]>([])
  const [permissionMap, setPermissionMap] = useState<Map<string, SpaceSharePermission>>(new Map())
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])

  const spacesClient: SpacesClient = useMemo(() => {
    if (user) {
      return createSupabaseDataClient(supabase).spaces
    }
    return createLocalDataClient().spaces
  }, [user, supabase])

  const sharingClient: SharingClient = useMemo(() => {
    if (user) {
      return createSupabaseDataClient(supabase).sharing
    }
    return createLocalDataClient().sharing
  }, [user, supabase])

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

    // Load shared spaces for authenticated users
    let loadedShared: Space[] = []
    const newPermissionMap = new Map<string, SpaceSharePermission>()
    if (user) {
      const sharedResult = await sharingClient.getSharedSpaces()
      if (!sharedResult.error && sharedResult.data.length > 0) {
        loadedShared = sharedResult.data.map(({ permission, ...space }) => {
          newPermissionMap.set(space.id, permission)
          return space
        })
      }

      // Filter list() results to owned-only since updated RLS also returns shared spaces
      const sharedIds = new Set(loadedShared.map(s => s.id))
      loadedSpaces = loadedSpaces.filter(s => !sharedIds.has(s.id))
    }

    setOwnedSpaces(loadedSpaces)
    setSharedSpaces(loadedShared)
    setPermissionMap(newPermissionMap)

    const allSpaces = [...loadedSpaces, ...loadedShared]

    // Restore last selected space from localStorage
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const savedSpace = savedId ? allSpaces.find(s => s.id === savedId) : null

    if (savedSpace) {
      setCurrentSpaceId(savedSpace.id)
    } else if (allSpaces.length > 0) {
      setCurrentSpaceId(allSpaces[0].id)
    }

    setIsLoading(false)
  }, [spacesClient, sharingClient, user])

  useEffect(() => {
    if (isAuthLoading) return
    loadSpaces()
  }, [isAuthLoading, loadSpaces])

  // Listen for spaces and spaceShares events to refresh
  useEffect(() => {
    const unsub1 = subscribe('spaces', loadSpaces)
    const unsub2 = subscribe('spaceShares', loadSpaces)
    return () => { unsub1(); unsub2() }
  }, [loadSpaces])

  const switchSpace = useCallback((id: string) => {
    setCurrentSpaceId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  const spaces = useMemo(() => [...ownedSpaces, ...sharedSpaces], [ownedSpaces, sharedSpaces])

  const currentSpace = useMemo(() => {
    return spaces.find(s => s.id === currentSpaceId) ?? null
  }, [spaces, currentSpaceId])

  const sharedPermission = useMemo(() => {
    if (!currentSpaceId) return null
    return permissionMap.get(currentSpaceId) ?? null
  }, [currentSpaceId, permissionMap])

  const spaceContextValue: SpaceContextValue = useMemo(() => ({
    space: currentSpace,
    spaces,
    switchSpace,
    isLoading,
    sharedPermission,
  }), [currentSpace, spaces, switchSpace, isLoading, sharedPermission])

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
