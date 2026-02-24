'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useDataClient,
  type ObjectType,
  type CreateObjectTypeInput,
  type UpdateObjectTypeInput,
} from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_TYPES: ObjectType[] = []

export function useGlobalObjectTypes() {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.globalObjectTypes.list(),
    queryFn: async () => {
      const result = await dataClient.globalObjectTypes.list()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.globalObjectTypes.all() })
  }, [queryClient])

  const create = useCallback(async (input: CreateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.globalObjectTypes.create(input)
    if (result.error) return null
    emit('globalObjectTypes')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.globalObjectTypes.update(id, input)
    if (result.error) return null
    emit('globalObjectTypes')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const result = await dataClient.globalObjectTypes.delete(id)
    if (result.error) return result.error.message
    emit('globalObjectTypes')
    return null
  }, [dataClient])

  const importToSpace = useCallback(async (id: string, targetSpaceId: string): Promise<{ data: ObjectType | null; error: string | null }> => {
    const result = await dataClient.globalObjectTypes.importToSpace(id, targetSpaceId)
    if (result.error) return { data: null, error: result.error.message }
    emit('globalObjectTypes')
    emit('objectTypes')
    return { data: result.data, error: null }
  }, [dataClient])

  return {
    types: data ?? EMPTY_TYPES,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    create,
    update,
    remove,
    importToSpace,
  }
}
