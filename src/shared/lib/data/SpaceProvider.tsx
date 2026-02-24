'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Space, SpacesClient, SharingClient, SpaceSharePermission, DataClient } from './types'
import { createSupabaseDataClient } from './supabase'
import { createLocalDataClient, ensureLocalDefaultSpace, ensureLocalDefaultTypes } from './local'
import { createClient } from '@/shared/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { emit, subscribe } from './events'

const STORAGE_KEY = 'swashbuckler:currentSpaceId'

interface SpaceContextValue {
  space: Space | null
  spaces: Space[]
  switchSpace: (id: string) => void
  leaveSpace: (spaceId: string) => Promise<void>
  isLoading: boolean
  sharedPermission: SpaceSharePermission | null
}

interface CreateSpaceInput {
  name: string
  icon?: string
  copyTypesFromSpaceId?: string
  includeTemplates?: boolean
}

interface SpacesContextValue {
  spaces: Space[]
  create: (input: CreateSpaceInput) => Promise<Space | null>
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
  const [shareInfoMap, setShareInfoMap] = useState<Map<string, { shareId: string; permission: SpaceSharePermission }>>(new Map())
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
        await ensureLocalDefaultTypes()
        emit('objectTypes')
        loadedSpaces = [defaultSpace]
      }
    }

    // Ensure guest mode always has default types (e.g. Page)
    if (!user) {
      await ensureLocalDefaultTypes()
      emit('objectTypes')
    }

    // Classify spaces by owner_id (not by cross-referencing getSharedSpaces)
    const newShareInfoMap = new Map<string, { shareId: string; permission: SpaceSharePermission }>()
    let owned: Space[]
    let shared: Space[]

    if (user) {
      owned = loadedSpaces.filter(s => s.owner_id === user.id)
      shared = loadedSpaces.filter(s => s.owner_id !== user.id)

      // Enrich shared spaces with permission info from getSharedSpaces()
      const sharedResult = await sharingClient.getSharedSpaces()
      if (!sharedResult.error && sharedResult.data.length > 0) {
        for (const { share_id, permission, id } of sharedResult.data) {
          newShareInfoMap.set(id, { shareId: share_id, permission })
        }
      }

      // Any non-owned space missing from shareInfoMap defaults to 'view'
      for (const s of shared) {
        if (!newShareInfoMap.has(s.id)) {
          newShareInfoMap.set(s.id, { shareId: '', permission: 'view' })
        }
      }
    } else {
      owned = loadedSpaces
      shared = []
    }

    setOwnedSpaces(owned)
    setSharedSpaces(shared)
    setShareInfoMap(newShareInfoMap)

    const allSpaces = [...owned, ...shared]

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
    loadSpaces() // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch
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

  const leaveSpace = useCallback(async (spaceId: string) => {
    const info = shareInfoMap.get(spaceId)
    if (!info) return
    await sharingClient.deleteShare(info.shareId)
    emit('spaceShares')
    // If leaving the current space, switch to first owned space
    if (spaceId === currentSpaceId && ownedSpaces.length > 0) {
      switchSpace(ownedSpaces[0].id)
    }
  }, [shareInfoMap, sharingClient, currentSpaceId, ownedSpaces, switchSpace])

  const sharedPermission = useMemo(() => {
    if (!currentSpaceId) return null
    return shareInfoMap.get(currentSpaceId)?.permission ?? null
  }, [currentSpaceId, shareInfoMap])

  const spaceContextValue: SpaceContextValue = useMemo(() => ({
    space: currentSpace,
    spaces,
    switchSpace,
    leaveSpace,
    isLoading,
    sharedPermission,
  }), [currentSpace, spaces, switchSpace, leaveSpace, isLoading, sharedPermission])

  const spacesContextValue: SpacesContextValue = useMemo(() => ({
    spaces,
    create: async (input: CreateSpaceInput) => {
      const { copyTypesFromSpaceId, includeTemplates, ...createInput } = input
      const result = await spacesClient.create(createInput)
      if (!result.data) return null

      const newSpace = result.data

      if (copyTypesFromSpaceId) {
        try {
          const createClient = (spaceId: string): DataClient =>
            user
              ? createSupabaseDataClient(supabase, spaceId)
              : createLocalDataClient(spaceId)

          const sourceClient = createClient(copyTypesFromSpaceId)
          const targetClient = createClient(newSpace.id)

          const typesResult = await sourceClient.objectTypes.list()
          if (!typesResult.error) {
            const typeIdMap = new Map<string, string>()

            for (const sourceType of typesResult.data) {
              const newFields = sourceType.fields.map((f) => ({
                ...f,
                id: crypto.randomUUID(),
              }))
              const createResult = await targetClient.objectTypes.create({
                name: sourceType.name,
                plural_name: sourceType.plural_name,
                slug: sourceType.slug,
                icon: sourceType.icon,
                color: sourceType.color,
                fields: newFields,
                sort_order: sourceType.sort_order,
              })
              if (createResult.data) {
                typeIdMap.set(sourceType.id, createResult.data.id)
              }
            }

            if (includeTemplates) {
              const templatesResult = await sourceClient.templates.list()
              if (!templatesResult.error) {
                for (const tmpl of templatesResult.data) {
                  const newTypeId = typeIdMap.get(tmpl.type_id)
                  if (!newTypeId) continue
                  await targetClient.templates.create({
                    name: tmpl.name,
                    type_id: newTypeId,
                    icon: tmpl.icon,
                    cover_image: tmpl.cover_image,
                    properties: tmpl.properties,
                    content: tmpl.content,
                  })
                }
              }
            }

            emit('objectTypes')
            if (includeTemplates) emit('templates')
          }
        } catch (err) {
          console.error('Failed to copy types/templates:', err)
        }
      }

      emit('spaces')
      return newSpace
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
  }), [spaces, spacesClient, supabase, user])

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
