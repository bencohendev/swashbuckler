'use client'

import { useMemo } from 'react'
import { PinIcon } from 'lucide-react'
import { useCurrentSpace } from '@/shared/lib/data'
import { useObjects } from '@/features/objects/hooks'
import { ObjectList } from '@/features/objects/components/ObjectList'
import { usePins } from '../hooks/usePins'

export function PinnedObjects() {
  const { space } = useCurrentSpace()
  const { pinnedIds, isLoading: pinsLoading } = usePins()
  const { objects, isLoading: objectsLoading } = useObjects({ isDeleted: false })

  const pinnedObjects = useMemo(() => {
    if (pinnedIds.size === 0) return []
    return objects.filter(obj => pinnedIds.has(obj.id))
  }, [objects, pinnedIds])

  return (
    <ObjectList
      objects={pinnedObjects}
      isLoading={!space || pinsLoading || objectsLoading}
      emptyState={
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PinIcon className="size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No pinned entries</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Click the pin icon on any entry for quick access</p>
        </div>
      }
    />
  )
}
