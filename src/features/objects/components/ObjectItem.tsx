'use client'

import Link from 'next/link'
import { FileIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObject, ObjectType } from '@/shared/lib/data'
import { PinButton } from '@/features/pins'

interface ObjectItemProps {
  object: DataObject
  objectType?: ObjectType
  isActive?: boolean
  compact?: boolean
}

export function ObjectItem({ object, objectType, isActive, compact }: ObjectItemProps) {
  if (compact) {
    return (
      <Link
        href={`/objects/${object.id}`}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {object.icon ? (
          <span className="text-base">{object.icon}</span>
        ) : (
          <FileIcon className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{object.title}</span>
        <PinButton
          objectId={object.id}
          size="sm"
          className="shrink-0 opacity-0 group-hover:opacity-100"
        />
      </Link>
    )
  }

  return (
    <Link
      href={`/objects/${object.id}`}
      className={cn(
        'block rounded-lg border p-4 transition-colors hover:bg-accent',
        isActive && 'border-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">
          {object.icon ? (
            <span>{object.icon}</span>
          ) : (
            <FileIcon className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{object.title}</h3>
          <p className="text-xs text-muted-foreground">{objectType?.name ?? 'Object'}</p>
        </div>
      </div>
    </Link>
  )
}
