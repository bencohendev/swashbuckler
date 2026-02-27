import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient, type SpaceShare, type SpaceSharePermission, type CreateShareExclusionInput } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'

const EMPTY_SHARES: SpaceShare[] = []

export function useSpaceShares(spaceId: string | null) {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.shares.list(spaceId!),
    queryFn: async () => {
      const result = await dataClient.sharing.listShares(spaceId!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!spaceId,
  })

  const invalidate = useCallback(() => {
    if (spaceId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.list(spaceId) })
    }
  }, [queryClient, spaceId])

  const createShareFn = useCallback(
    (email: string, permission: SpaceSharePermission) => {
      if (!spaceId) return Promise.resolve({ data: null, error: null } as { data: SpaceShare | null; error: null })
      return dataClient.sharing.createShare({ space_id: spaceId, shared_with_email: email, permission })
    },
    [dataClient, spaceId],
  )
  const createShare = useMutationAction(createShareFn, {
    actionLabel: 'Share space',
    emitChannels: ['spaceShares'],
    onSuccess: () => invalidate(),
  })

  const updateShareFn = useCallback(
    (shareId: string, permission: SpaceSharePermission) =>
      dataClient.sharing.updateShare(shareId, { permission }),
    [dataClient],
  )
  const updateShare = useMutationAction(updateShareFn, {
    actionLabel: 'Update share',
    emitChannels: ['spaceShares'],
    onSuccess: () => invalidate(),
  })

  const deleteShareFn = useCallback(
    (shareId: string) => dataClient.sharing.deleteShare(shareId),
    [dataClient],
  )
  const deleteShare = useVoidMutationAction(deleteShareFn, {
    actionLabel: 'Remove share',
    emitChannels: ['spaceShares'],
    onSuccess: () => invalidate(),
  })

  // Exclusions management
  const loadExclusions = useCallback(async (shareId: string) => {
    const result = await dataClient.sharing.listExclusions(shareId)
    if (!result.error) {
      return result.data
    }
    return []
  }, [dataClient])

  const addExclusionFn = useCallback(
    (shareId: string, input: CreateShareExclusionInput) =>
      dataClient.sharing.addExclusion(shareId, input),
    [dataClient],
  )
  const addExclusion = useMutationAction(addExclusionFn, {
    actionLabel: 'Add exclusion',
  })

  const removeExclusionFn = useCallback(
    (exclusionId: string) => dataClient.sharing.removeExclusion(exclusionId),
    [dataClient],
  )
  const removeExclusion = useVoidMutationAction(removeExclusionFn, {
    actionLabel: 'Remove exclusion',
  })

  // Space-wide exclusions
  const loadSpaceExclusions = useCallback(async (id: string) => {
    const result = await dataClient.sharing.listSpaceExclusions(id)
    if (!result.error) {
      return result.data
    }
    return []
  }, [dataClient])

  const addSpaceExclusionFn = useCallback(
    (id: string, input: CreateShareExclusionInput) =>
      dataClient.sharing.addSpaceExclusion(id, input),
    [dataClient],
  )
  const addSpaceExclusion = useMutationAction(addSpaceExclusionFn, {
    actionLabel: 'Add exclusion',
  })

  return {
    shares: data ?? EMPTY_SHARES,
    isLoading,
    createShare,
    updateShare,
    deleteShare,
    loadExclusions,
    addExclusion,
    removeExclusion,
    loadSpaceExclusions,
    addSpaceExclusion,
  }
}
