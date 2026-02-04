'use client'

import { usePathname } from 'next/navigation'
import { ObjectItem } from './ObjectItem'
import type { DataObject } from '@/shared/lib/data'

interface ObjectListProps {
  objects: DataObject[]
  isLoading?: boolean
  emptyMessage?: string
  compact?: boolean
}

export function ObjectList({
  objects,
  isLoading,
  emptyMessage = 'No objects yet',
  compact,
}: ObjectListProps) {
  const pathname = usePathname()

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
          isActive={pathname === `/objects/${object.id}`}
          compact={compact}
        />
      ))}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
