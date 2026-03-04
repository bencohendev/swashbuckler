'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from '@/shared/hooks/useToast'
import type { Space, SpacesClient, SharingClient, SpaceSharePermission, DataClient } from './types'
import { createSupabaseDataClient } from './supabase'
import { createLocalDataClient, ensureLocalDefaultSpace, ensureLocalDefaultTypes } from './local'
import { createClient } from '@/shared/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { emit, subscribe } from './events'
import { STARTER_KITS } from '@/features/starter-kits/data/kits'
import { importKit } from '@/features/starter-kits/lib/importKit'

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
  starterKitId?: string
}

interface SpacesContextValue {
  spaces: Space[]
  allSpaces: Space[]
  create: (input: CreateSpaceInput) => Promise<{ data: Space | null; error?: string }>
  update: (id: string, input: { name?: string; icon?: string }) => Promise<{ data: Space | null; error?: string }>
  remove: (id: string) => Promise<string | null>
  archiveSpace: (id: string) => Promise<{ error?: string }>
  unarchiveSpace: (id: string) => Promise<{ error?: string }>
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

  const loadSeqRef = useRef(0)

  const supabase = useMemo(() => createClient(), [])

  const spacesClient: SpacesClient = useMemo(() => {
    if (user) {
      return createSupabaseDataClient(supabase, undefined, user.id).spaces
    }
    return createLocalDataClient().spaces
  }, [user, supabase])

  const sharingClient: SharingClient = useMemo(() => {
    if (user) {
      return createSupabaseDataClient(supabase, undefined, user.id).sharing
    }
    return createLocalDataClient().sharing
  }, [user, supabase])

  const loadSpaces = useCallback(async () => {
    const seq = ++loadSeqRef.current
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

    if (loadSeqRef.current !== seq) return

    setOwnedSpaces(owned)
    setSharedSpaces(shared)
    setShareInfoMap(newShareInfoMap)

    const allSpaces = [...owned, ...shared]
    // Active (non-archived) spaces for selection
    const activeSpaces = allSpaces.filter(s => !s.is_archived)

    // Restore last selected space from localStorage
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    // Only select non-archived spaces as current
    const savedSpace = savedId ? activeSpaces.find(s => s.id === savedId) : null

    if (savedSpace) {
      setCurrentSpaceId(savedSpace.id)
    } else if (activeSpaces.length > 0) {
      setCurrentSpaceId(activeSpaces[0].id)
    }

    setIsLoading(false)
  }, [spacesClient, sharingClient, user])

  useEffect(() => {
    if (isAuthLoading) return
    loadSpaces() // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch on mount
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

  // Active (non-archived) spaces for the switcher and general use
  const spaces = useMemo(() =>
    [...ownedSpaces, ...sharedSpaces].filter(s => !s.is_archived),
    [ownedSpaces, sharedSpaces]
  )

  // All spaces including archived — for the archive page
  const allSpacesIncludingArchived = useMemo(() =>
    [...ownedSpaces, ...sharedSpaces],
    [ownedSpaces, sharedSpaces]
  )

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

  // Refs for values read inside CRUD callbacks — keeps callbacks stable
  const ownedSpacesRef = useRef(ownedSpaces)
  const sharedSpacesRef = useRef(sharedSpaces)
  const currentSpaceIdRef = useRef(currentSpaceId)
  const userRef = useRef(user)
  useEffect(() => { ownedSpacesRef.current = ownedSpaces }, [ownedSpaces])
  useEffect(() => { sharedSpacesRef.current = sharedSpaces }, [sharedSpaces])
  useEffect(() => { currentSpaceIdRef.current = currentSpaceId }, [currentSpaceId])
  useEffect(() => { userRef.current = user }, [user])

  const create = useCallback(async (input: CreateSpaceInput) => {
    const { copyTypesFromSpaceId, includeTemplates, starterKitId, ...createInput } = input
    const result = await spacesClient.create(createInput)
    if (result.error) {
      toast({ title: 'Create space', description: result.error.message, variant: 'destructive' })
      return { data: null, error: result.error.message }
    }

    const newSpace = result.data!

    if (copyTypesFromSpaceId) {
      try {
        const makeClient = (spaceId: string): DataClient =>
          userRef.current
            ? createSupabaseDataClient(supabase, spaceId, userRef.current.id)
            : createLocalDataClient(spaceId)

        const sourceClient = makeClient(copyTypesFromSpaceId)
        const targetClient = makeClient(newSpace.id)

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

    if (starterKitId && !copyTypesFromSpaceId) {
      try {
        const kit = STARTER_KITS.find((k) => k.id === starterKitId)
        if (kit) {
          const targetClient: DataClient = userRef.current
            ? createSupabaseDataClient(supabase, newSpace.id, userRef.current.id)
            : createLocalDataClient(newSpace.id)
          await importKit(kit, targetClient, [])
        }
      } catch (err) {
        console.error('Failed to import starter kit:', err)
      }
    }

    // Optimistic update: insert the new space into ownedSpaces immediately
    // so that switchSpace(id) resolves currentSpace without waiting for refetch
    setOwnedSpaces(prev => [...prev, newSpace])
    switchSpace(newSpace.id)

    // Still emit to sync the full list from the server
    emit('spaces')
    return { data: newSpace }
  }, [spacesClient, supabase, switchSpace])

  const update = useCallback(async (id: string, input: { name?: string; icon?: string }) => {
    const result = await spacesClient.update(id, input)
    if (result.error) {
      if (result.error.code !== 'DUPLICATE') {
        toast({ title: 'Update space', description: result.error.message, variant: 'destructive' })
      }
      return { data: null, error: result.error.message }
    }
    emit('spaces')
    return { data: result.data }
  }, [spacesClient])

  const remove = useCallback(async (id: string) => {
    const result = await spacesClient.delete(id)
    if (result.error) {
      toast({ title: 'Delete space', description: result.error.message, variant: 'destructive' })
      return result.error.message
    }
    emit('spaces')
    return null
  }, [spacesClient])

  const archiveSpace = useCallback(async (id: string) => {
    // Guard: cannot archive the last non-archived owned space
    const activeOwned = ownedSpacesRef.current.filter(s => !s.is_archived)
    if (activeOwned.length <= 1 && activeOwned.some(s => s.id === id)) {
      return { error: 'Cannot archive your last space' }
    }
    const result = await spacesClient.archive(id)
    if (result.error) {
      toast({ title: 'Archive space', description: result.error.message, variant: 'destructive' })
      return { error: result.error.message }
    }
    // If archiving the current space, switch to next available
    if (id === currentSpaceIdRef.current) {
      const remaining = [...ownedSpacesRef.current, ...sharedSpacesRef.current].filter(s => s.id !== id && !s.is_archived)
      if (remaining.length > 0) {
        switchSpace(remaining[0].id)
      }
    }
    emit('spaces')
    return {}
  }, [spacesClient, switchSpace])

  const unarchiveSpace = useCallback(async (id: string) => {
    const result = await spacesClient.unarchive(id)
    if (result.error) {
      toast({ title: 'Unarchive space', description: result.error.message, variant: 'destructive' })
      return { error: result.error.message }
    }
    emit('spaces')
    return {}
  }, [spacesClient])

  const spacesContextValue: SpacesContextValue = useMemo(() => ({
    spaces,
    allSpaces: allSpacesIncludingArchived,
    create,
    update,
    remove,
    archiveSpace,
    unarchiveSpace,
  }), [spaces, allSpacesIncludingArchived, create, update, remove, archiveSpace, unarchiveSpace])

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
