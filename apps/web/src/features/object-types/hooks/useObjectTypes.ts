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
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_TYPES: ObjectType[] = []

type UseObjectTypesOptions = ListObjectTypesOptions

interface UseObjectTypesReturn {
  types: ObjectType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectTypeInput) => Promise<{ data: ObjectType | null; error?: string }>
  update: (id: string, input: UpdateObjectTypeInput) => Promise<{ data: ObjectType | null; error?: string }>
  remove: (id: string) => Promise<string | null>
  archive: (id: string) => Promise<string | null>
  unarchive: (id: string) => Promise<string | null>
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

  const create = useCallback(async (input: CreateObjectTypeInput): Promise<{ data: ObjectType | null; error?: string }> => {
    const result = await dataClient.objectTypes.create(input)
    if (result.error) return { data: null, error: result.error.message }
    emit('objectTypes')
    return { data: result.data }
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateObjectTypeInput): Promise<{ data: ObjectType | null; error?: string }> => {
    const result = await dataClient.objectTypes.update(id, input)
    if (result.error) return { data: null, error: result.error.message }
    emit('objectTypes')
    return { data: result.data }
  }, [dataClient])

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const result = await dataClient.objectTypes.delete(id)
    if (result.error) return result.error.message
    emit('objectTypes')
    emit('objects')
    emit('templates')
    return null
  }, [dataClient])

  const archive = useCallback(async (id: string): Promise<string | null> => {
    const result = await dataClient.objectTypes.archive(id)
    if (result.error) return result.error.message
    emit('objectTypes')
    emit('objects')
    return null
  }, [dataClient])

  const unarchive = useCallback(async (id: string): Promise<string | null> => {
    const result = await dataClient.objectTypes.unarchive(id)
    if (result.error) return result.error.message
    emit('objectTypes')
    emit('objects')
    return null
  }, [dataClient])

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

  const { data: objectType, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.detail(id!),
    queryFn: async () => {
      const result = await dataClient.objectTypes.get(id!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id,
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
