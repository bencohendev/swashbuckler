'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

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

  const createViewFn = useCallback(
    (input: CreateSavedViewInput) => dataClient.savedViews.create(input),
    [dataClient],
  )
  const createView = useMutationAction(createViewFn, {
    actionLabel: 'Create view',
    emitChannels: ['savedViews'],
  })

  const updateViewFn = useCallback(
    (id: string, input: UpdateSavedViewInput) => dataClient.savedViews.update(id, input),
    [dataClient],
  )
  const updateView = useMutationAction(updateViewFn, {
    actionLabel: 'Update view',
    emitChannels: ['savedViews'],
  })

  const deleteViewFn = useCallback(
    (id: string) => dataClient.savedViews.delete(id),
    [dataClient],
  )
  const deleteView = useVoidMutationAction(deleteViewFn, {
    actionLabel: 'Delete view',
    emitChannels: ['savedViews'],
  })

  return {
    views,
    defaultView,
    isLoading,
    createView,
    updateView,
    deleteView,
  }
}
