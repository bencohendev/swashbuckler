'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId, type DataObject, type DataObjectSummary, type ListObjectsOptions, type CreateObjectInput, type UpdateObjectInput } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useRecentAccess } from '@/shared/stores/recentAccess'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

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

  const createFn = useCallback(
    (input: CreateObjectInput) => dataClient.objects.create(input),
    [dataClient],
  )
  const create = useMutationAction(createFn, {
    actionLabel: 'Create object',
    emitChannels: ['objects'],
  })

  const updateFn = useCallback(
    (id: string, input: UpdateObjectInput) => dataClient.objects.update(id, input),
    [dataClient],
  )
  const update = useMutationAction(updateFn, {
    actionLabel: 'Update object',
    emitChannels: ['objects'],
  })

  const removeFn = useCallback(
    (id: string, permanent = false) => dataClient.objects.delete(id, permanent),
    [dataClient],
  )
  const removeRaw = useVoidMutationAction(removeFn, {
    actionLabel: 'Delete object',
    emitChannels: ['objects'],
  })
  const remove = useCallback(async (id: string, permanent = false): Promise<void> => {
    const ok = await removeRaw(id, permanent)
    if (ok) removeRecentEntry(id)
  }, [removeRaw, removeRecentEntry])

  const restoreFn = useCallback(
    (id: string) => dataClient.objects.restore(id),
    [dataClient],
  )
  const restore = useMutationAction(restoreFn, {
    actionLabel: 'Restore object',
    emitChannels: ['objects'],
  })

  const archiveFn = useCallback(
    (id: string) => dataClient.objects.archive(id),
    [dataClient],
  )
  const archiveRaw = useMutationAction(archiveFn, {
    actionLabel: 'Archive object',
    emitChannels: ['objects'],
  })
  const archive = useCallback(async (id: string): Promise<DataObject | null> => {
    const data = await archiveRaw(id)
    if (data) removeRecentEntry(id)
    return data
  }, [archiveRaw, removeRecentEntry])

  const unarchiveFn = useCallback(
    (id: string) => dataClient.objects.unarchive(id),
    [dataClient],
  )
  const unarchive = useMutationAction(unarchiveFn, {
    actionLabel: 'Unarchive object',
    emitChannels: ['objects'],
  })

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

  const updateFn = useCallback(
    (input: UpdateObjectInput) => {
      if (!id) return Promise.resolve({ data: null, error: null } as { data: DataObject | null; error: null })
      return dataClient.objects.update(id, input)
    },
    [dataClient, id],
  )
  const updateRaw = useMutationAction(updateFn, {
    actionLabel: 'Update object',
    emitChannels: ['objects'],
  })
  const update = useCallback(async (input: UpdateObjectInput): Promise<DataObject | null> => {
    const data = await updateRaw(input)
    if (data && id) {
      queryClient.setQueryData(queryKeys.objects.detail(id), data)
    }
    return data
  }, [updateRaw, id, queryClient])

  const removeFn = useCallback(
    (permanent = false) => {
      if (!id) return Promise.resolve({ data: undefined as void, error: null })
      return dataClient.objects.delete(id, permanent)
    },
    [dataClient, id],
  )
  const remove = useVoidMutationAction(removeFn, {
    actionLabel: 'Delete object',
    emitChannels: ['objects'],
  })

  const archiveFn = useCallback(
    () => {
      if (!id) return Promise.resolve({ data: null, error: null } as { data: DataObject | null; error: null })
      return dataClient.objects.archive(id)
    },
    [dataClient, id],
  )
  const archive = useMutationAction(archiveFn, {
    actionLabel: 'Archive object',
    emitChannels: ['objects'],
  })

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
