import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDataClient, useAuth, useCurrentSpace, type ShareExclusion, type FieldDefinition, type ObjectType, type DataObjectSummary } from '@/shared/lib/data'

export function useExclusionFilter() {
  const dataClient = useDataClient()
  const { user } = useAuth()
  const { space, sharedPermission } = useCurrentSpace()
  const [exclusions, setExclusions] = useState<ShareExclusion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only load exclusions for shared spaces (non-owner)
  const isSharedUser = !!sharedPermission && !!space && space.owner_id !== user?.id

  useEffect(() => {
    if (!isSharedUser || !space) {
      setExclusions([]) // eslint-disable-line react-hooks/set-state-in-effect -- clear state when condition changes
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    async function loadExclusions() {
      const errors: string[] = []

      // N2 fix: Run per-user and space-wide exclusion fetches in parallel
      const [perUserExclusions, spaceExclusions] = await Promise.all([
        // Per-user exclusions: shares → find my share → load exclusions
        (async () => {
          const sharesResult = await dataClient.sharing.listShares(space!.id)
          if (sharesResult.error) { errors.push(sharesResult.error.message); return [] }
          if (sharesResult.data.length === 0) return []
          const myShare = sharesResult.data.find(s => s.shared_with_id === user?.id)
          if (!myShare) return []
          const result = await dataClient.sharing.listExclusions(myShare.id)
          if (result.error) { errors.push(result.error.message); return [] }
          return result.data
        })(),
        // Space-wide exclusions (independent of per-user shares)
        (async () => {
          const result = await dataClient.sharing.listSpaceExclusions(space!.id)
          if (result.error) { errors.push(result.error.message); return [] }
          return result.data
        })(),
      ])

      setExclusions([...perUserExclusions, ...spaceExclusions])
      setError(errors.length > 0 ? errors.join('; ') : null)
      setIsLoading(false)
    }

    loadExclusions()
  }, [dataClient, space, user?.id, isSharedUser])

  const excludedTypeIds = useMemo(() => {
    return new Set(
      exclusions
        .filter(e => e.excluded_type_id && !e.excluded_field && !e.excluded_object_id)
        .map(e => e.excluded_type_id)
    )
  }, [exclusions])

  const excludedObjectIds = useMemo(() => {
    return new Set(
      exclusions
        .filter(e => e.excluded_object_id)
        .map(e => e.excluded_object_id)
    )
  }, [exclusions])

  const isTypeExcluded = useCallback((typeId: string): boolean => {
    if (!isSharedUser) return false
    return excludedTypeIds.has(typeId)
  }, [isSharedUser, excludedTypeIds])

  const isObjectExcluded = useCallback((objectId: string): boolean => {
    if (!isSharedUser) return false
    return excludedObjectIds.has(objectId)
  }, [isSharedUser, excludedObjectIds])

  const filterTypes = useCallback((types: ObjectType[]): ObjectType[] => {
    if (!isSharedUser) return types
    return types.filter(t => !excludedTypeIds.has(t.id))
  }, [isSharedUser, excludedTypeIds])

  const filterObjects = useCallback((objects: DataObjectSummary[]): DataObjectSummary[] => {
    if (!isSharedUser) return objects
    return objects.filter(o => !excludedTypeIds.has(o.type_id) && !excludedObjectIds.has(o.id))
  }, [isSharedUser, excludedTypeIds, excludedObjectIds])

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
    isTypeExcluded,
    isObjectExcluded,
    filterTypes,
    filterObjects,
    isFieldExcluded,
    filterFields,
    filterProperties,
    isSharedUser,
    isLoading,
    error,
  }), [isTypeExcluded, isObjectExcluded, filterTypes, filterObjects, isFieldExcluded, filterFields, filterProperties, isSharedUser, isLoading, error])
}
