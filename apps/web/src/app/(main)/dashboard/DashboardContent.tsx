'use client'

import { useMemo } from 'react'
import { PinIcon, FileTextIcon } from 'lucide-react'
import { useCurrentSpace, type DataObjectSummary } from '@/shared/lib/data'
import { useObjects } from '@/features/objects/hooks'
import { ObjectList } from '@/features/objects/components/ObjectList'
import { usePins } from '@/features/pins/hooks/usePins'

export function DashboardContent() {
  const { space } = useCurrentSpace()
  const { objects, isLoading: objectsLoading } = useObjects({ isDeleted: false })
  const { pinnedIds, isLoading: pinsLoading } = usePins()

  const pinnedObjects = useMemo(() => {
    if (pinnedIds.size === 0) return []
    return objects.filter(obj => pinnedIds.has(obj.id))
  }, [objects, pinnedIds])

  const recentObjects = useMemo<DataObjectSummary[]>(() => objects.slice(0, 5), [objects])

  const isLoading = !space || objectsLoading

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section data-tour="dashboard-pinned" className="rounded-lg border p-6">
        <h2 className="mb-4 font-medium">Pinned</h2>
        <ObjectList
          objects={pinnedObjects}
          isLoading={isLoading || pinsLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PinIcon className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No pinned entries</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Click the pin icon on any entry for quick access</p>
            </div>
          }
        />
      </section>

      <section data-tour="dashboard-recent" className="rounded-lg border p-6">
        <h2 className="mb-4 font-medium">Recent</h2>
        <ObjectList
          objects={recentObjects}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileTextIcon className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No entries yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Create your first page to get started</p>
            </div>
          }
        />
      </section>
    </div>
  )
}
