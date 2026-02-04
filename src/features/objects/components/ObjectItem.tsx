'use client'

import Link from 'next/link'
import { FileTextIcon, StickyNoteIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObject } from '@/shared/lib/data'

interface ObjectItemProps {
  object: DataObject
  isActive?: boolean
  compact?: boolean
}

const typeIcons = {
  page: FileTextIcon,
  note: StickyNoteIcon,
}

export function ObjectItem({ object, isActive, compact }: ObjectItemProps) {
  const Icon = typeIcons[object.type]

  if (compact) {
    return (
      <Link
        href={`/objects/${object.id}`}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {object.icon ? (
          <span className="text-base">{object.icon}</span>
        ) : (
          <Icon className="size-4 shrink-0" />
        )}
        <span className="truncate">{object.title}</span>
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
          {object.icon || <Icon className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{object.title}</h3>
          <p className="text-xs text-muted-foreground capitalize">{object.type}</p>
        </div>
      </div>
    </Link>
  )
}
