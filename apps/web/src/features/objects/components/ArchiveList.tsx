'use client'

import { useState } from 'react'
import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react'
import { useObjects } from '../hooks/useObjects'
import { useObjectTypes } from '@/features/object-types'
import { useSpaces } from '@/shared/lib/data'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { toast } from '@/shared/hooks/useToast'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import type { DataObjectSummary, ObjectType, Space } from '@/shared/lib/data'

function ArchivedEntriesSection() {
  const { objects, isLoading, unarchive } = useObjects({ isArchived: true, isDeleted: false })
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleUnarchive = async (obj: DataObjectSummary) => {
    setProcessingId(obj.id)
    await unarchive(obj.id)
    setProcessingId(null)
    toast({ description: `"${obj.title}" unarchived`, variant: 'success' })
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading archived entries" className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (objects.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Archived Entries</h2>
      <div className="space-y-2">
        {objects.map((obj) => (
          <div
            key={obj.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {obj.icon && <span>{obj.icon}</span>}
                <span className="truncate font-medium">{obj.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Archived {obj.archived_at ? new Date(obj.archived_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleUnarchive(obj)}
              loading={processingId === obj.id}
              title="Unarchive"
              aria-label={`Unarchive "${obj.title}"`}
            >
              <ArchiveRestoreIcon className="size-4" />
              Unarchive
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function ArchivedTypesSection() {
  const { types, isLoading, unarchive } = useObjectTypes({ isArchived: true })
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleUnarchive = async (type: ObjectType) => {
    setProcessingId(type.id)
    const result = await unarchive(type.id)
    setProcessingId(null)
    if (result) {
      toast({ description: `"${type.name}" type unarchived`, variant: 'success' })
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading archived types" className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (types.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Archived Types</h2>
      <div className="space-y-2">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <TypeIcon icon={type.icon} className="size-4" />
                <span className="truncate font-medium">{type.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Archived {type.archived_at ? new Date(type.archived_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleUnarchive(type)}
              loading={processingId === type.id}
              title="Unarchive type"
              aria-label={`Unarchive "${type.name}" type`}
            >
              <ArchiveRestoreIcon className="size-4" />
              Unarchive
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function ArchivedSpacesSection() {
  const { allSpaces, unarchiveSpace } = useSpaces()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const archivedSpaces = allSpaces.filter(s => s.is_archived)

  const handleUnarchive = async (space: Space) => {
    setProcessingId(space.id)
    const result = await unarchiveSpace(space.id)
    setProcessingId(null)
    if (!result.error) {
      toast({ description: `"${space.name}" space unarchived`, variant: 'success' })
    }
  }

  if (archivedSpaces.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Archived Spaces</h2>
      <div className="space-y-2">
        {archivedSpaces.map((space) => (
          <div
            key={space.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{space.icon}</span>
                <span className="truncate font-medium">{space.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Archived {space.archived_at ? new Date(space.archived_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleUnarchive(space)}
              loading={processingId === space.id}
              title="Unarchive space"
              aria-label={`Unarchive "${space.name}" space`}
            >
              <ArchiveRestoreIcon className="size-4" />
              Unarchive
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ArchiveList() {
  return (
    <div className="space-y-8">
      <ArchivedEntriesSection />
      <ArchivedTypesSection />
      <ArchivedSpacesSection />
      <EmptyState />
    </div>
  )
}

function EmptyState() {
  const { objects } = useObjects({ isArchived: true, isDeleted: false })
  const { types } = useObjectTypes({ isArchived: true })
  const { allSpaces } = useSpaces()
  const archivedSpaces = allSpaces.filter(s => s.is_archived)

  if (objects.length > 0 || types.length > 0 || archivedSpaces.length > 0) return null

  return (
    <div role="status" className="flex flex-col items-center justify-center py-12 text-center">
      <ArchiveIcon className="mb-4 size-12 text-muted-foreground/50" />
      <p className="text-muted-foreground">Archive is empty</p>
    </div>
  )
}
