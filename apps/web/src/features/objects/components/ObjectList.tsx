'use client'

import { ObjectItem } from './ObjectItem'
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
          <div
            key={i}
            className={cn(
              'animate-pulse rounded-md bg-muted',
              compact ? 'h-8' : 'h-16'
            )}
          />
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
    <div className={compact ? 'space-y-0.5' : 'space-y-2'}>
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
