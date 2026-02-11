'use client'

import { useMemo } from 'react'
import { useObjectTypes } from '@/features/object-types'
import { useObjects } from '@/features/objects/hooks'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { TypeDataTable } from './TypeDataTable'

interface TypeTableViewProps {
  slug: string
}

export function TypeTableView({ slug }: TypeTableViewProps) {
  const { types, isLoading: typesLoading } = useObjectTypes()

  const type = useMemo(
    () => types.find((t) => t.slug === slug),
    [types, slug]
  )

  const { objects, isLoading: objectsLoading } = useObjects(
    type ? { typeId: type.id, isDeleted: false } : { typeId: '__none__', isDeleted: false }
  )

  if (typesLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!type) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Type not found</h1>
        <p className="mt-2 text-muted-foreground">
          No object type with slug "{slug}" exists.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TypeIcon icon={type.icon} className="size-6" />
        <h1 className="text-2xl font-semibold">{type.plural_name}</h1>
        <span className="text-muted-foreground">
          {objectsLoading ? '…' : objects.length}
        </span>
      </div>

      <TypeDataTable type={type} objects={objectsLoading ? [] : objects} />
    </div>
  )
}
