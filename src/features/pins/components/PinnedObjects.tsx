'use client'

import { useMemo } from 'react'
import { useObjects } from '@/features/objects/hooks'
import { ObjectList } from '@/features/objects/components/ObjectList'
import { usePins } from '../hooks/usePins'

export function PinnedObjects() {
  const { pinnedIds, isLoading: pinsLoading } = usePins()
  const { objects, isLoading: objectsLoading } = useObjects({ isDeleted: false })

  const pinnedObjects = useMemo(() => {
    if (pinnedIds.size === 0) return []
    return objects.filter(obj => pinnedIds.has(obj.id))
  }, [objects, pinnedIds])

  return (
    <ObjectList
      objects={pinnedObjects}
      isLoading={pinsLoading || objectsLoading}
      emptyMessage="No pinned entries yet. Pin entries for quick access."
    />
  )
}
