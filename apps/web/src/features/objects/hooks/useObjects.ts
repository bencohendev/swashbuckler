'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId, type DataObject, type DataObjectSummary, type ListObjectsOptions, type CreateObjectInput, type UpdateObjectInput } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useRecentAccess } from '@/shared/stores/recentAccess'

const EMPTY_OBJECTS: DataObjectSummary[] = []

interface UseObjectsOptions extends ListObjectsOptions {
  enabled?: boolean
}

interface UseObjectsReturn {
  objects: DataObjectSummary[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectInput) => Promise<DataObject | null>
  update: (id: string, input: UpdateObjectInput) => Promise<DataObject | null>
  remove: (id: string, permanent?: boolean) => Promise<void>
  restore: (id: string) => Promise<DataObject | null>
  archive: (id: string) => Promise<DataObject | null>
  unarchive: (id: string) => Promise<DataObject | null>
}

export function useObjects(options: UseObjectsOptions = {}): UseObjectsReturn {
  const { enabled = true, parentId, typeId, isDeleted, isArchived, limit, offset } = options
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()
  const removeRecentEntry = useRecentAccess((s) => s.removeEntry)

  const queryOptions = useMemo<ListObjectsOptions>(() => ({
    parentId,
    typeId,
    isDeleted,
    isArchived,
    limit,
    offset,
  }), [parentId, typeId, isDeleted, isArchived, limit, offset])

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objects.list(spaceId ?? undefined, queryOptions),
    queryFn: async () => {
      const result = await dataClient.objects.list(queryOptions)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled,
    placeholderData: keepPreviousData,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.objects.all(spaceId ?? undefined) })
  }, [queryClient, spaceId])

  const create = useCallback(async (input: CreateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.create(input)
    if (result.error) {
      console.error('Failed to create object:', result.error.message)
      return null
    }
    emit('objects')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.update(id, input)
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string, permanent = false): Promise<void> => {
    const result = await dataClient.objects.delete(id, permanent)
    if (result.error) return
    removeRecentEntry(id)
    emit('objects')
  }, [dataClient, removeRecentEntry])

  const restore = useCallback(async (id: string): Promise<DataObject | null> => {
    const result = await dataClient.objects.restore(id)
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient])

  const archive = useCallback(async (id: string): Promise<DataObject | null> => {
    const result = await dataClient.objects.archive(id)
    if (result.error) return null
    removeRecentEntry(id)
    emit('objects')
    return result.data
  }, [dataClient, removeRecentEntry])

  const unarchive = useCallback(async (id: string): Promise<DataObject | null> => {
    const result = await dataClient.objects.unarchive(id)
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient])

  return {
    objects: data ?? EMPTY_OBJECTS,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    create,
    update,
    remove,
    restore,
    archive,
    unarchive,
  }
}

export function useObject(id: string | null) {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()

  const { data: object, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objects.detail(id!),
    queryFn: async () => {
      const result = await dataClient.objects.get(id!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id,
  })

  const refetch = useCallback(async () => {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.objects.detail(id) })
    }
  }, [queryClient, id])

  const update = useCallback(async (input: UpdateObjectInput): Promise<DataObject | null> => {
    if (!id) return null
    const result = await dataClient.objects.update(id, input)
    if (result.error) return null
    // Optimistically update the detail cache
    queryClient.setQueryData(queryKeys.objects.detail(id), result.data)
    emit('objects')
    return result.data
  }, [dataClient, id, queryClient])

  const remove = useCallback(async (permanent = false): Promise<void> => {
    if (!id) return
    const result = await dataClient.objects.delete(id, permanent)
    if (result.error) return
    emit('objects')
  }, [dataClient, id])

  const archive = useCallback(async (): Promise<DataObject | null> => {
    if (!id) return null
    const result = await dataClient.objects.archive(id)
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient, id])

  return {
    object: object ?? null,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    update,
    remove,
    archive,
  }
}
