import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDataClient, useAuth, useCurrentSpace, type ShareExclusion, type FieldDefinition } from '@/shared/lib/data'

export function useExclusionFilter() {
  const dataClient = useDataClient()
  const { user } = useAuth()
  const { space, sharedPermission } = useCurrentSpace()
  const [exclusions, setExclusions] = useState<ShareExclusion[]>([])

  // Only load exclusions for shared spaces (non-owner)
  const isSharedUser = !!sharedPermission && !!space && space.owner_id !== user?.id

  useEffect(() => {
    if (!isSharedUser || !space) {
      setExclusions([])
      return
    }

    async function loadExclusions() {
      // Get the share for the current space
      const sharesResult = await dataClient.sharing.listShares(space!.id)
      if (sharesResult.error || sharesResult.data.length === 0) return

      // Find the share for the current user
      const myShare = sharesResult.data.find(s => s.shared_with_id === user?.id)
      if (!myShare) return

      const result = await dataClient.sharing.listExclusions(myShare.id)
      if (!result.error) {
        setExclusions(result.data)
      }
    }

    loadExclusions()
  }, [dataClient, space, user?.id, isSharedUser])

  const isFieldExcluded = useCallback((typeId: string, fieldId: string): boolean => {
    return exclusions.some(
      e => e.excluded_type_id === typeId && e.excluded_field === fieldId
    )
  }, [exclusions])

  const filterFields = useCallback((typeId: string, fields: FieldDefinition[]): FieldDefinition[] => {
    if (!isSharedUser) return fields
    return fields.filter(f => !isFieldExcluded(typeId, f.id))
  }, [isSharedUser, isFieldExcluded])

  const filterProperties = useCallback((typeId: string, properties: Record<string, unknown>, fields: FieldDefinition[]): Record<string, unknown> => {
    if (!isSharedUser) return properties
    const allowedFields = filterFields(typeId, fields)
    const allowedIds = new Set(allowedFields.map(f => f.id))
    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(properties)) {
      if (allowedIds.has(key)) {
        filtered[key] = value
      }
    }
    return filtered
  }, [isSharedUser, filterFields])

  return useMemo(() => ({
    isFieldExcluded,
    filterFields,
    filterProperties,
    isSharedUser,
  }), [isFieldExcluded, filterFields, filterProperties, isSharedUser])
}
