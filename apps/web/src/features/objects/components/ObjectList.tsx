'use client'

import { ObjectItem } from './ObjectItem'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { DataObjectSummary, ObjectType } from '@/shared/lib/data'

interface ObjectListProps {
  objects: DataObjectSummary[]
  objectType?: ObjectType
  isLoading?: boolean
  emptyMessage?: string
  emptyState?: React.ReactNode
  compact?: boolean
}

export function ObjectList({
  objects,
  objectType,
  isLoading,
  emptyMessage = 'No entries yet',
  emptyState,
  compact,
}: ObjectListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={compact ? 'h-8' : 'h-16'} />
        ))}
      </div>
    )
  }

  if (objects.length === 0) {
    if (emptyState) return <>{emptyState}</>
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {objects.map((object) => (
        <ObjectItem
          key={object.id}
          object={object}
          objectType={objectType}
          compact={compact}
        />
      ))}
    </div>
  )
}
