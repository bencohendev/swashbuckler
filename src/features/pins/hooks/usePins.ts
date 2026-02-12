'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDataClient } from '@/shared/lib/data'
import { emit, subscribe } from '@/shared/lib/data/events'

interface UsePinsReturn {
  pinnedIds: Set<string>
  isLoading: boolean
  pin: (objectId: string) => Promise<void>
  unpin: (objectId: string) => Promise<void>
  toggle: (objectId: string) => Promise<void>
}

export function usePins(): UsePinsReturn {
  const dataClient = useDataClient()
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)
  const hasFetched = useRef(false)

  const fetchPins = useCallback(async () => {
    if (!hasFetched.current) {
      setIsLoading(true)
    }

    const result = await dataClient.pins.list()

    if (!isMounted.current) return

    if (!result.error) {
      setPinnedIds(new Set(result.data.map(p => p.object_id)))
    }

    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    fetchPins()
    const unsubscribe = subscribe('pins', fetchPins)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchPins])

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
