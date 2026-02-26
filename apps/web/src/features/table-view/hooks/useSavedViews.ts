'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_VIEWS: SavedView[] = []

export function useSavedViews(typeId: string | undefined) {
  const dataClient = useDataClient()
  const spaceId = useSpaceId()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.savedViews.list(spaceId ?? undefined, typeId),
    queryFn: async () => {
      if (!typeId) return []
      const result = await dataClient.savedViews.list(typeId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!typeId,
    placeholderData: keepPreviousData,
  })

  const views = data ?? EMPTY_VIEWS

  const defaultView = useMemo(
    () => views.find((v) => v.is_default) ?? null,
    [views],
  )

  const createView = useCallback(async (input: CreateSavedViewInput) => {
    const result = await dataClient.savedViews.create(input)
    if (result.error) throw new Error(result.error.message)
    emit('savedViews')
    return result.data!
  }, [dataClient])

  const updateView = useCallback(async (id: string, input: UpdateSavedViewInput) => {
    const result = await dataClient.savedViews.update(id, input)
    if (result.error) throw new Error(result.error.message)
    emit('savedViews')
    return result.data!
  }, [dataClient])

  const deleteView = useCallback(async (id: string) => {
    const result = await dataClient.savedViews.delete(id)
    if (result.error) throw new Error(result.error.message)
    emit('savedViews')
  }, [dataClient])

  return {
    views,
    defaultView,
    isLoading,
    createView,
    updateView,
    deleteView,
  }
}
