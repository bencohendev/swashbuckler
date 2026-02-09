'use client'

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
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
  migrateToSupabase: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const storageMode: StorageMode = user ? 'supabase' : 'local'

  const dataClient = useMemo(() => {
    if (user) {
      return createSupabaseDataClient(supabase)
    }
    return createLocalDataClient()
  }, [user, supabase])

  const migrateToSupabase = async () => {
    if (!user) {
      throw new Error('Must be logged in to migrate data')
    }

    const localData = await exportLocalData()
    if (localData.objects.length === 0 && localData.objectTypes.length === 0) return

    const supabaseClient = createSupabaseDataClient(supabase)

    // Migrate custom object types first (skip built-in types)
    for (const objectType of localData.objectTypes) {
      if (objectType.is_built_in) continue
      await supabaseClient.objectTypes.create({
        name: objectType.name,
        plural_name: objectType.plural_name,
        slug: objectType.slug,
        icon: objectType.icon,
        color: objectType.color,
        fields: objectType.fields,
        sort_order: objectType.sort_order,
      })
    }

    // Migrate objects (track old→new ID mapping for relations)
    const objectIdMap = new Map<string, string>()
    for (const obj of localData.objects) {
      const result = await supabaseClient.objects.create({
        title: obj.title,
        type_id: obj.type_id,
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
        type_id: template.type_id,
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
    isLoading,
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

export function useMigrateData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useMigrateData must be used within a DataProvider')
  }
  return context.migrateToSupabase
}
