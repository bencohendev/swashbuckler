import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient, type SpaceShare, type SpaceSharePermission, type CreateShareExclusionInput, type ShareExclusion } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'

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

  const createShare = useCallback(async (email: string, permission: SpaceSharePermission) => {
    if (!spaceId) return null
    const result = await dataClient.sharing.createShare({
      space_id: spaceId,
      shared_with_email: email,
      permission,
    })
    if (!result.error && result.data) {
      invalidate()
      return result.data
    }
    return result.error
  }, [dataClient, spaceId, invalidate])

  const updateShare = useCallback(async (shareId: string, permission: SpaceSharePermission) => {
    const result = await dataClient.sharing.updateShare(shareId, { permission })
    if (!result.error) {
      invalidate()
    }
    return result.error
  }, [dataClient, invalidate])

  const deleteShare = useCallback(async (shareId: string) => {
    const result = await dataClient.sharing.deleteShare(shareId)
    if (!result.error) {
      invalidate()
    }
    return result.error
  }, [dataClient, invalidate])

  // Exclusions management
  const loadExclusions = useCallback(async (shareId: string) => {
    const result = await dataClient.sharing.listExclusions(shareId)
    if (!result.error) {
      return result.data
    }
    return []
  }, [dataClient])

  const addExclusion = useCallback(async (shareId: string, input: CreateShareExclusionInput): Promise<ShareExclusion | null> => {
    const result = await dataClient.sharing.addExclusion(shareId, input)
    if (!result.error && result.data) {
      return result.data
    }
    return null
  }, [dataClient])

  const removeExclusion = useCallback(async (exclusionId: string) => {
    await dataClient.sharing.removeExclusion(exclusionId)
  }, [dataClient])

  // Space-wide exclusions
  const loadSpaceExclusions = useCallback(async (id: string) => {
    const result = await dataClient.sharing.listSpaceExclusions(id)
    if (!result.error) {
      return result.data
    }
    return []
  }, [dataClient])

  const addSpaceExclusion = useCallback(async (id: string, input: CreateShareExclusionInput): Promise<ShareExclusion | null> => {
    const result = await dataClient.sharing.addSpaceExclusion(id, input)
    if (!result.error && result.data) {
      return result.data
    }
    return null
  }, [dataClient])

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
