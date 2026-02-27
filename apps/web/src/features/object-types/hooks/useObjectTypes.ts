'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  useDataClient,
  useSpaceId,
  type ObjectType,
  type CreateObjectTypeInput,
  type UpdateObjectTypeInput,
  type ListObjectTypesOptions,
} from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

const EMPTY_TYPES: ObjectType[] = []

type UseObjectTypesOptions = ListObjectTypesOptions

interface UseObjectTypesReturn {
  types: ObjectType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectTypeInput) => Promise<ObjectType | null>
  update: (id: string, input: UpdateObjectTypeInput) => Promise<ObjectType | null>
  remove: (id: string) => Promise<boolean>
  archive: (id: string) => Promise<ObjectType | null>
  unarchive: (id: string) => Promise<ObjectType | null>
}

export function useObjectTypes(options: UseObjectTypesOptions = {}): UseObjectTypesReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const queryOptions = useMemo<ListObjectTypesOptions>(() => ({
    isArchived: options.isArchived,
  }), [options.isArchived])

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.list(spaceId ?? undefined, queryOptions),
    queryFn: async () => {
      const result = await dataClient.objectTypes.list(queryOptions)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    placeholderData: keepPreviousData,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.objectTypes.all(spaceId ?? undefined) })
  }, [queryClient, spaceId])

  const createFn = useCallback(
    (input: CreateObjectTypeInput) => dataClient.objectTypes.create(input),
    [dataClient],
  )
  const create = useMutationAction(createFn, {
    actionLabel: 'Create type',
    emitChannels: ['objectTypes'],
  })

  const updateFn = useCallback(
    (id: string, input: UpdateObjectTypeInput) => dataClient.objectTypes.update(id, input),
    [dataClient],
  )
  const update = useMutationAction(updateFn, {
    actionLabel: 'Update type',
    emitChannels: ['objectTypes'],
  })

  const removeFn = useCallback(
    (id: string) => dataClient.objectTypes.delete(id),
    [dataClient],
  )
  const remove = useVoidMutationAction(removeFn, {
    actionLabel: 'Delete type',
    emitChannels: ['objectTypes', 'objects', 'templates'],
  })

  const archiveFn = useCallback(
    (id: string) => dataClient.objectTypes.archive(id),
    [dataClient],
  )
  const archive = useMutationAction(archiveFn, {
    actionLabel: 'Archive type',
    emitChannels: ['objectTypes', 'objects'],
  })

  const unarchiveFn = useCallback(
    (id: string) => dataClient.objectTypes.unarchive(id),
    [dataClient],
  )
  const unarchive = useMutationAction(unarchiveFn, {
    actionLabel: 'Unarchive type',
    emitChannels: ['objectTypes', 'objects'],
  })

  return {
    types: data ?? EMPTY_TYPES,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    create,
    update,
    remove,
    archive,
    unarchive,
  }
}

export function useObjectType(id: string | null) {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data: objectType, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.detail(id!),
    queryFn: async () => {
      const result = await dataClient.objectTypes.get(id!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id,
    placeholderData: () => {
      const lists = queryClient.getQueriesData<ObjectType[]>({
        queryKey: queryKeys.objectTypes.all(spaceId ?? undefined),
      })
      for (const [, items] of lists) {
        const match = items?.find(t => t.id === id)
        if (match) return match
      }
      return undefined
    },
  })

  const refetch = useCallback(async () => {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.objectTypes.detail(id) })
    }
  }, [queryClient, id])

  return {
    objectType: objectType ?? null,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
  }
}
