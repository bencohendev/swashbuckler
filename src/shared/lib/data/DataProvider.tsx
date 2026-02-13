'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import type { DataClient, StorageMode } from './types'
import { createSupabaseDataClient } from './supabase'
import { createLocalDataClient, clearLocalData, exportLocalData } from './local'

interface DataContextValue {
  dataClient: DataClient
  storageMode: StorageMode
  user: User | null
  isLoading: boolean
  spaceId: string | null
  migrateToSupabase: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

interface DataProviderProps {
  children: ReactNode
  spaceId?: string | null
  user: User | null
  isAuthLoading: boolean
}

export function DataProvider({ children, spaceId, user, isAuthLoading }: DataProviderProps) {
  const supabase = useMemo(() => createClient(), [])

  const storageMode: StorageMode = user ? 'supabase' : 'local'

  const dataClient = useMemo(() => {
    const effectiveSpaceId = spaceId ?? undefined
    if (user) {
      return createSupabaseDataClient(supabase, effectiveSpaceId)
    }
    return createLocalDataClient(effectiveSpaceId)
  }, [user, supabase, spaceId])

  // Purge expired trash items on mount
  useEffect(() => {
    if (isAuthLoading) return
    dataClient.objects.purgeExpired().then(result => {
      if (result.error) {
        console.error('Failed to purge expired trash items:', result.error.message)
      }
    })
  }, [dataClient, isAuthLoading])

  const migrateToSupabase = async () => {
    if (!user) {
      throw new Error('Must be logged in to migrate data')
    }

    const localData = await exportLocalData()
    if (localData.objects.length === 0 && localData.objectTypes.length === 0) return

    const supabaseClient = createSupabaseDataClient(supabase, spaceId ?? undefined)

    // Build type ID mapping: check for existing types with matching slugs
    const typeIdMap = new Map<string, string>()
    const existingTypes = await supabaseClient.objectTypes.list()
    const existingBySlug = new Map(
      (existingTypes.data ?? []).map(t => [t.slug, t.id])
    )

    // Migrate object types (map local IDs to Supabase IDs)
    for (const objectType of localData.objectTypes) {
      const existingId = existingBySlug.get(objectType.slug)
      if (existingId) {
        // Type with same slug already exists — map to it
        typeIdMap.set(objectType.id, existingId)
      } else {
        const result = await supabaseClient.objectTypes.create({
          name: objectType.name,
          plural_name: objectType.plural_name,
          slug: objectType.slug,
          icon: objectType.icon,
          color: objectType.color,
          fields: objectType.fields,
          sort_order: objectType.sort_order,
        })
        if (result.data) {
          typeIdMap.set(objectType.id, result.data.id)
        }
      }
    }

    // Migrate objects (track old→new ID mapping for relations)
    const objectIdMap = new Map<string, string>()
    for (const obj of localData.objects) {
      const result = await supabaseClient.objects.create({
        title: obj.title,
        type_id: typeIdMap.get(obj.type_id) ?? obj.type_id,
        parent_id: obj.parent_id,
        icon: obj.icon,
        cover_image: obj.cover_image,
        properties: obj.properties,
        content: obj.content,
      })
      if (result.data) {
        objectIdMap.set(obj.id, result.data.id)
      }
    }

    // Migrate templates
    for (const template of localData.templates) {
      await supabaseClient.templates.create({
        name: template.name,
        type_id: typeIdMap.get(template.type_id) ?? template.type_id,
        icon: template.icon,
        cover_image: template.cover_image,
        properties: template.properties,
        content: template.content,
      })
    }

    // Migrate relations (remap object IDs)
    for (const relation of localData.objectRelations) {
      const newSourceId = objectIdMap.get(relation.source_id)
      const newTargetId = objectIdMap.get(relation.target_id)
      if (newSourceId && newTargetId) {
        await supabaseClient.relations.create({
          source_id: newSourceId,
          target_id: newTargetId,
          relation_type: relation.relation_type,
          source_property: relation.source_property,
          context: relation.context,
        })
      }
    }

    // Clear local data after successful migration
    await clearLocalData()
  }

  const value: DataContextValue = {
    dataClient,
    storageMode,
    user,
    isLoading: isAuthLoading,
    spaceId: spaceId ?? null,
    migrateToSupabase,
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useDataClient(): DataClient {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDataClient must be used within a DataProvider')
  }
  return context.dataClient
}

export function useStorageMode(): StorageMode {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useStorageMode must be used within a DataProvider')
  }
  return context.storageMode
}

export function useAuth() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useAuth must be used within a DataProvider')
  }
  return {
    user: context.user,
    isLoading: context.isLoading,
    isGuest: !context.user,
  }
}

export function useSpaceId(): string | null {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useSpaceId must be used within a DataProvider')
  }
  return context.spaceId
}

export function useMigrateData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useMigrateData must be used within a DataProvider')
  }
  return context.migrateToSupabase
}
