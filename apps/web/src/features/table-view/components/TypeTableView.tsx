'use client'

import { useMemo, useCallback, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useObjectTypes } from '@/features/object-types'
import { useObjects, useObjectContents } from '@/features/objects/hooks'
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
import { filterObjects, hasActiveFilters, hasContentFilter, EMPTY_EXPRESSION } from '../lib/filterObjects'
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

  const { objects, isLoading: objectsLoading, update: updateObject } = useObjects(
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

  const isContentFilterActive = useMemo(
    () => hasContentFilter(expression) || expression.search.trim() !== '',
    [expression],
  )

  const contentTextByObject = useObjectContents(
    { typeId: type?.id ?? '__none__', isDeleted: false },
    isContentFilterActive,
  )

  const objectTypeByObjectId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const obj of rawObjects) {
      map[obj.id] = obj.type_id
    }
    return map
  }, [rawObjects])

  const filterCtx = useMemo<FilterContext>(
    () => ({ tagsByObject, relationsByObject, objectTypeByObjectId, contentTextByObject }),
    [tagsByObject, relationsByObject, objectTypeByObjectId, contentTextByObject],
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

  const isManualSort = sort.field === 'sort_order'

  // Track reordered IDs during active drag (null = use sortedObjects order)
  const [reorderIds, setReorderIds] = useState<string[] | null>(null)

  const displayObjects = useMemo(() => {
    if (!isManualSort || !reorderIds) return sortedObjects
    const map = new Map(sortedObjects.map(o => [o.id, o]))
    return reorderIds
      .map(id => map.get(id))
      .filter((o): o is typeof sortedObjects[number] => o !== undefined)
  }, [sortedObjects, reorderIds, isManualSort])

  const handleMoveObject = useCallback((from: number, to: number) => {
    setReorderIds(prev => {
      const ids = prev ?? sortedObjects.map(o => o.id)
      const next = [...ids]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [sortedObjects])

  const handleDropObjects = useCallback(() => {
    const ids = reorderIds ?? sortedObjects.map(o => o.id)
    const objMap = new Map(sortedObjects.map(o => [o.id, o]))
    ids.forEach((id, i) => {
      const obj = objMap.get(id)
      if (obj && obj.sort_order !== i + 1) {
        updateObject(id, { sort_order: i + 1 })
      }
    })
    setReorderIds(null)
  }, [reorderIds, sortedObjects, updateObject])

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
        <span data-tour="type-page-view-toggle">
          <ViewToggle slug={slug} />
        </span>
        {type && (
          <span data-tour="type-page-saved-views">
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
          </span>
        )}
      </div>

      <div data-tour="type-page-filters">
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
      </div>

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
          {isManualSort && (mode === 'table' || mode === 'list') ? (
            <DndProvider backend={HTML5Backend}>
              {mode === 'table' && (
                <TypeDataTable
                  type={type}
                  objects={displayObjects}
                  tagsByObject={tagsByObject}
                  sort={sort}
                  onSortChange={handleSortChange}
                  isManualSort
                  onMoveObject={handleMoveObject}
                  onDropObjects={handleDropObjects}
                />
              )}
              {mode === 'list' && (
                <TypeListView
                  type={type}
                  objects={displayObjects}
                  isManualSort
                  onMoveObject={handleMoveObject}
                  onDropObjects={handleDropObjects}
                />
              )}
            </DndProvider>
          ) : (
            <>
              {mode === 'table' && (
                <TypeDataTable
                  type={type}
                  objects={displayObjects}
                  tagsByObject={tagsByObject}
                  sort={sort}
                  onSortChange={handleSortChange}
                />
              )}
              {mode === 'list' && (
                <TypeListView type={type} objects={displayObjects} />
              )}
              {mode === 'card' && (
                <TypeCardView type={type} objects={displayObjects} />
              )}
              {mode === 'board' && (
                <TypeBoardView type={type} objects={displayObjects} />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
