'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useDataClient,
  type ObjectType,
  type CreateObjectTypeInput,
  type UpdateObjectTypeInput,
} from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

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

  const createFn = useCallback(
    (input: CreateObjectTypeInput) => dataClient.globalObjectTypes.create(input),
    [dataClient],
  )
  const create = useMutationAction(createFn, {
    actionLabel: 'Create global type',
    emitChannels: ['globalObjectTypes'],
  })

  const updateFn = useCallback(
    (id: string, input: UpdateObjectTypeInput) => dataClient.globalObjectTypes.update(id, input),
    [dataClient],
  )
  const update = useMutationAction(updateFn, {
    actionLabel: 'Update global type',
    emitChannels: ['globalObjectTypes'],
  })

  const removeFn = useCallback(
    (id: string) => dataClient.globalObjectTypes.delete(id),
    [dataClient],
  )
  const remove = useVoidMutationAction(removeFn, {
    actionLabel: 'Delete global type',
    emitChannels: ['globalObjectTypes'],
  })

  const importToSpaceFn = useCallback(
    (id: string, targetSpaceId: string) => dataClient.globalObjectTypes.importToSpace(id, targetSpaceId),
    [dataClient],
  )
  const importToSpace = useMutationAction(importToSpaceFn, {
    actionLabel: 'Import type',
    emitChannels: ['globalObjectTypes', 'objectTypes'],
  })

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
