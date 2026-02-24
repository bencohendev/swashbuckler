'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_IDS: string[] = []

interface UsePinsReturn {
  pinnedIds: Set<string>
  isLoading: boolean
  pin: (objectId: string) => Promise<void>
  unpin: (objectId: string) => Promise<void>
  toggle: (objectId: string) => Promise<void>
}

export function usePins(): UsePinsReturn {
  const dataClient = useDataClient()
  const spaceId = useSpaceId()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pins.list(spaceId ?? undefined),
    queryFn: async () => {
      const result = await dataClient.pins.list()
      if (result.error) throw new Error(result.error.message)
      return result.data.map(p => p.object_id)
    },
    placeholderData: keepPreviousData,
  })

  const pinnedIds = useMemo(() => new Set(data ?? EMPTY_IDS), [data])

  const pin = useCallback(async (objectId: string) => {
    await dataClient.pins.pin(objectId)
    emit('pins')
  }, [dataClient])

  const unpin = useCallback(async (objectId: string) => {
    await dataClient.pins.unpin(objectId)
    emit('pins')
  }, [dataClient])

  const toggle = useCallback(async (objectId: string) => {
    if (pinnedIds.has(objectId)) {
      await unpin(objectId)
    } else {
      await pin(objectId)
    }
  }, [pinnedIds, pin, unpin])

  return { pinnedIds, isLoading, pin, unpin, toggle }
}
