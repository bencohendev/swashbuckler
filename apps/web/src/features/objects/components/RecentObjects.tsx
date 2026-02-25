'use client'

import { FileTextIcon } from 'lucide-react'
import { useCurrentSpace } from '@/shared/lib/data'
import { useObjects } from '../hooks/useObjects'
import { ObjectList } from './ObjectList'

export function RecentObjects() {
  const { space } = useCurrentSpace()
  const { objects, isLoading } = useObjects({
    isDeleted: false,
    limit: 5,
  })

  return (
    <ObjectList
      objects={objects}
      isLoading={!space || isLoading}
      emptyState={
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileTextIcon className="size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No entries yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Create your first page to get started</p>
        </div>
      }
    />
  )
}
