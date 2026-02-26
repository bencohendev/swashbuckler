'use client'

import { useMemo, useCallback } from 'react'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useObjectTypes } from '@/features/object-types'
import { useObjects } from '@/features/objects/hooks'
import { useObjectTagsBatch, useTags } from '@/features/tags'
import { useAllRelations } from '@/features/relations'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { TypeDataTable } from './TypeDataTable'
import { TypeCardView } from './TypeCardView'
import { TypeListView } from './TypeListView'
import { TypeBoardView } from './TypeBoardView'
import { TypePageFilterBar } from './TypePageFilterBar'
import { ViewToggle } from './ViewToggle'
import { SavedViewSelector } from './SavedViewSelector'
import { useViewMode } from '../stores/viewMode'
import { useSortConfig } from '../stores/sortConfig'
import { usePersistedFilters } from '../stores/filterConfig'
import { useBoardGrouping } from '../stores/boardGrouping'
import { useSavedViews } from '../hooks/useSavedViews'
import { filterObjects, hasActiveFilters, EMPTY_EXPRESSION } from '../lib/filterObjects'
import type { FilterContext } from '../lib/filterObjects'
import type { FilterExpression } from '../lib/filterTypes'
import { sortObjects } from '../lib/sortObjects'
import type { SortConfig } from '../lib/sortObjects'
import type { ViewMode } from '../stores/viewMode'

interface TypeTableViewProps {
  slug: string
}

export function TypeTableView({ slug }: TypeTableViewProps) {
  const { types, isLoading: typesLoading } = useObjectTypes()
  const { mode, setMode } = useViewMode(slug)
  const { sort, setSort } = useSortConfig(slug)
  const { expression, setExpression } = usePersistedFilters(slug)
  const { groupFieldId, setGroupField } = useBoardGrouping(slug)

  const type = useMemo(
    () => types.find((t) => t.slug === slug),
    [types, slug],
  )

  const { views, createView, updateView, deleteView } = useSavedViews(type?.id)

  const handleApplyView = useCallback(
    (newExpression: FilterExpression, newSort: SortConfig, newMode: ViewMode, newGroupFieldId: string | null) => {
      setExpression(newExpression)
      setSort(newSort)
      setMode(newMode)
      setGroupField(newGroupFieldId)
    },
    [setExpression, setSort, setMode, setGroupField],
  )

  const { objects, isLoading: objectsLoading } = useObjects(
    type ? { typeId: type.id, isDeleted: false } : { typeId: '__none__', isDeleted: false },
  )

  const rawObjects = useMemo(
    () => (objectsLoading ? [] : objects),
    [objectsLoading, objects],
  )

  const objectIds = useMemo(() => rawObjects.map((o) => o.id), [rawObjects])
  const { tagsByObject } = useObjectTagsBatch(objectIds)
  const { tags } = useTags()
  const { relationsByObject } = useAllRelations()

  const objectTypeByObjectId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const obj of rawObjects) {
      map[obj.id] = obj.type_id
    }
    return map
  }, [rawObjects])

  const filterCtx = useMemo<FilterContext>(
    () => ({ tagsByObject, relationsByObject, objectTypeByObjectId }),
    [tagsByObject, relationsByObject, objectTypeByObjectId],
  )

  const fields = useMemo(
    () => type ? [...type.fields].sort((a, b) => a.sort_order - b.sort_order) : [],
    [type],
  )

  const filteredObjects = useMemo(
    () => filterObjects(rawObjects, expression, filterCtx),
    [rawObjects, expression, filterCtx],
  )

  const sortedObjects = useMemo(
    () => sortObjects(filteredObjects, sort, fields, tagsByObject),
    [filteredObjects, sort, fields, tagsByObject],
  )

  const handleSortChange = useCallback(
    (next: SortConfig) => setSort(next),
    [setSort],
  )

  if (typesLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
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

  const totalCount = rawObjects.length
  const filteredCount = filteredObjects.length
  const filtered = hasActiveFilters(expression)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TypeIcon icon={type.icon} className="size-6" />
        <h1 className="text-2xl font-semibold">{type.plural_name}</h1>
        <span className="text-muted-foreground">
          {objectsLoading
            ? '\u2026'
            : filtered
              ? `${filteredCount} of ${totalCount}`
              : totalCount}
        </span>
        <ViewToggle slug={slug} />
        {type && (
          <SavedViewSelector
            typeId={type.id}
            views={views}
            expression={expression}
            sort={sort}
            viewMode={mode}
            boardGroupFieldId={groupFieldId}
            onApplyView={handleApplyView}
            onCreateView={createView}
            onUpdateView={updateView}
            onDeleteView={deleteView}
          />
        )}
      </div>

      <TypePageFilterBar
        type={type}
        tags={tags}
        expression={expression}
        onExpressionChange={setExpression}
        sort={sort}
        onSortChange={handleSortChange}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {filtered && filteredCount === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No {type.plural_name.toLowerCase()} match your filters</p>
          <button
            type="button"
            onClick={() => setExpression(EMPTY_EXPRESSION)}
            className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {mode === 'table' && (
            <TypeDataTable
              type={type}
              objects={sortedObjects}
              tagsByObject={tagsByObject}
              sort={sort}
              onSortChange={handleSortChange}
            />
          )}
          {mode === 'list' && (
            <TypeListView type={type} objects={sortedObjects} />
          )}
          {mode === 'card' && (
            <TypeCardView type={type} objects={sortedObjects} />
          )}
          {mode === 'board' && (
            <TypeBoardView type={type} objects={sortedObjects} />
          )}
        </>
      )}
    </div>
  )
}
