'use client'

import { useState, useMemo } from 'react'
import { useObjectTypes } from '@/features/object-types'
import { useObjects } from '@/features/objects/hooks'
import { useObjectTagsBatch, useTags } from '@/features/tags'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { TypeDataTable } from './TypeDataTable'
import { TypeCardView } from './TypeCardView'
import { TypeListView } from './TypeListView'
import { TypePageFilterBar } from './TypePageFilterBar'
import { ViewToggle } from './ViewToggle'
import { useViewMode } from '../stores/viewMode'
import { filterObjects, isFiltered, EMPTY_FILTERS, type TypePageFilters } from '../lib/filterObjects'

interface TypeTableViewProps {
  slug: string
}

export function TypeTableView({ slug }: TypeTableViewProps) {
  const { types, isLoading: typesLoading } = useObjectTypes()
  const { mode } = useViewMode(slug)
  const [filters, setFilters] = useState<TypePageFilters>(EMPTY_FILTERS)

  const type = useMemo(
    () => types.find((t) => t.slug === slug),
    [types, slug]
  )

  const { objects, isLoading: objectsLoading } = useObjects(
    type ? { typeId: type.id, isDeleted: false } : { typeId: '__none__', isDeleted: false }
  )

  const objectIds = useMemo(() => objects.map((o) => o.id), [objects])
  const { tagsByObject } = useObjectTagsBatch(objectIds)
  const { tags } = useTags()

  const filteredObjects = useMemo(
    () => filterObjects(objectsLoading ? [] : objects, filters, tagsByObject),
    [objects, objectsLoading, filters, tagsByObject]
  )

  const sortedObjects = useMemo(() => {
    if (mode === 'table') return filteredObjects
    return [...filteredObjects].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }, [filteredObjects, mode])

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
          No object type with slug &ldquo;{slug}&rdquo; exists.
        </p>
      </div>
    )
  }

  const totalCount = objectsLoading ? 0 : objects.length
  const filteredCount = filteredObjects.length
  const filtered = isFiltered(filters)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TypeIcon icon={type.icon} className="size-6" />
        <h1 className="text-2xl font-semibold">{type.plural_name}</h1>
        <span className="text-muted-foreground">
          {objectsLoading
            ? '…'
            : filtered
              ? `${filteredCount} of ${totalCount}`
              : totalCount}
        </span>
        <ViewToggle slug={slug} />
      </div>

      <TypePageFilterBar
        type={type}
        tags={tags}
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {filtered && filteredCount === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No {type.plural_name.toLowerCase()} match your filters</p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {mode === 'table' && (
            <TypeDataTable type={type} objects={sortedObjects} tagsByObject={tagsByObject} />
          )}
          {mode === 'list' && (
            <TypeListView type={type} objects={sortedObjects} />
          )}
          {mode === 'card' && (
            <TypeCardView type={type} objects={sortedObjects} />
          )}
        </>
      )}
    </div>
  )
}
