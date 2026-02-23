import { useState, useEffect, useCallback } from 'react'
import { useDataClient, type SpaceShare, type SpaceSharePermission, type CreateShareExclusionInput, type ShareExclusion } from '@/shared/lib/data'
import { emit, subscribe } from '@/shared/lib/data/events'

export function useSpaceShares(spaceId: string | null) {
  const dataClient = useDataClient()
  const [shares, setShares] = useState<SpaceShare[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadShares = useCallback(async () => {
    if (!spaceId) {
      setShares([])
      return
    }
    setIsLoading(true)
    const result = await dataClient.sharing.listShares(spaceId)
    if (!result.error) {
      setShares(result.data)
    }
    setIsLoading(false)
  }, [dataClient, spaceId])

  useEffect(() => {
    loadShares() // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch
  }, [loadShares])

  useEffect(() => {
    return subscribe('spaceShares', loadShares)
  }, [loadShares])

  const createShare = useCallback(async (email: string, permission: SpaceSharePermission) => {
    if (!spaceId) return null
    const result = await dataClient.sharing.createShare({
      space_id: spaceId,
      shared_with_email: email,
      permission,
    })
    if (!result.error && result.data) {
      emit('spaceShares')
      return result.data
    }
    return result.error
  }, [dataClient, spaceId])

  const updateShare = useCallback(async (shareId: string, permission: SpaceSharePermission) => {
    const result = await dataClient.sharing.updateShare(shareId, { permission })
    if (!result.error) {
      emit('spaceShares')
    }
    return result.error
  }, [dataClient])

  const deleteShare = useCallback(async (shareId: string) => {
    const result = await dataClient.sharing.deleteShare(shareId)
    if (!result.error) {
      emit('spaceShares')
    }
    return result.error
  }, [dataClient])

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
    shares,
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
