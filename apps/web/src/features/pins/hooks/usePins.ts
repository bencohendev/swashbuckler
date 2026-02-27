'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

const EMPTY_IDS: string[] = []

interface UsePinsReturn {
  pinnedIds: Set<string>
  isLoading: boolean
  pin: (objectId: string) => Promise<unknown>
  unpin: (objectId: string) => Promise<unknown>
  toggle: (objectId: string) => Promise<void>
}

export function usePins(): UsePinsReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const queryKey = useMemo(() => queryKeys.pins.list(spaceId ?? undefined), [spaceId])

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await dataClient.pins.list()
      if (result.error) throw new Error(result.error.message)
      return result.data.map(p => p.object_id)
    },
    placeholderData: keepPreviousData,
  })

  const pinnedIds = useMemo(() => new Set(data ?? EMPTY_IDS), [data])

  const pinFn = useCallback(
    (objectId: string) => dataClient.pins.pin(objectId),
    [dataClient],
  )
  const pinRaw = useMutationAction(pinFn, {
    actionLabel: 'Pin',
    emitChannels: ['pins'],
  })
  const pin = useCallback(async (objectId: string) => {
    const previous = queryClient.getQueryData<string[]>(queryKey)
    queryClient.setQueryData<string[]>(queryKey, old => [...(old ?? []), objectId])
    try {
      const result = await pinRaw(objectId)
      if (result == null) {
        queryClient.setQueryData(queryKey, previous)
      }
      return result
    } catch {
      queryClient.setQueryData(queryKey, previous)
      return null
    }
  }, [pinRaw, queryClient, queryKey])

  const unpinFn = useCallback(
    (objectId: string) => dataClient.pins.unpin(objectId),
    [dataClient],
  )
  const unpinRaw = useVoidMutationAction(unpinFn, {
    actionLabel: 'Unpin',
    emitChannels: ['pins'],
  })
  const unpin = useCallback(async (objectId: string) => {
    const previous = queryClient.getQueryData<string[]>(queryKey)
    queryClient.setQueryData<string[]>(queryKey, old => (old ?? []).filter(id => id !== objectId))
    try {
      const ok = await unpinRaw(objectId)
      if (!ok) {
        queryClient.setQueryData(queryKey, previous)
      }
      return ok
    } catch {
      queryClient.setQueryData(queryKey, previous)
      return false
    }
  }, [unpinRaw, queryClient, queryKey])

  const toggle = useCallback(async (objectId: string) => {
    if (pinnedIds.has(objectId)) {
      await unpin(objectId)
    } else {
      await pin(objectId)
    }
  }, [pinnedIds, pin, unpin])

  return { pinnedIds, isLoading, pin, unpin, toggle }
}
