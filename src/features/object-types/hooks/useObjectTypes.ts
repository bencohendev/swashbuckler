'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  useDataClient,
  useSpaceId,
  type ObjectType,
  type CreateObjectTypeInput,
  type UpdateObjectTypeInput,
} from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_TYPES: ObjectType[] = []

interface UseObjectTypesReturn {
  types: ObjectType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectTypeInput) => Promise<ObjectType | null>
  update: (id: string, input: UpdateObjectTypeInput) => Promise<ObjectType | null>
  remove: (id: string) => Promise<string | null>
}

export function useObjectTypes(): UseObjectTypesReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.list(spaceId ?? undefined),
    queryFn: async () => {
      const result = await dataClient.objectTypes.list()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    placeholderData: keepPreviousData,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.objectTypes.all(spaceId ?? undefined) })
  }, [queryClient, spaceId])

  const create = useCallback(async (input: CreateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.objectTypes.create(input)
    if (result.error) return null
    emit('objectTypes')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.objectTypes.update(id, input)
    if (result.error) return null
    emit('objectTypes')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const result = await dataClient.objectTypes.delete(id)
    if (result.error) return result.error.message
    emit('objectTypes')
    emit('objects')
    emit('templates')
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
