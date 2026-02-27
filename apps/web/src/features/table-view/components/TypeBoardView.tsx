'use client'

import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import type { DataObjectSummary, ObjectType } from '@/shared/lib/data'
import { useObjects } from '@/features/objects/hooks'
import { useSpacePermission } from '@/features/sharing/hooks/useSpacePermission'
import { useBoardGrouping } from '../stores/boardGrouping'
import { groupObjectsByField } from '../lib/groupObjects'
import { BoardColumn } from './BoardColumn'
import { BoardFieldSelector } from './BoardFieldSelector'

interface TypeBoardViewProps {
  type: ObjectType
  objects: DataObjectSummary[]
}

export function TypeBoardView({ type, objects }: TypeBoardViewProps) {
  const { canEdit } = useSpacePermission()
  const { update } = useObjects({ typeId: type.id, isDeleted: false })
  const { groupFieldId, setGroupField } = useBoardGrouping(type.slug)

  const [announcement, setAnnouncement] = useState('')

  const selectFields = useMemo(
    () => type.fields.filter((f) => f.type === 'select'),
    [type.fields]
  )

  // Validate stored field still exists
  const validFieldId = useMemo(() => {
    if (!groupFieldId) return null
    return selectFields.some((f) => f.id === groupFieldId) ? groupFieldId : null
  }, [groupFieldId, selectFields])

  // Reset if stored field was deleted
  useEffect(() => {
    if (groupFieldId && !validFieldId) {
      setGroupField(null)
    }
  }, [groupFieldId, validFieldId, setGroupField])

  const groupField = useMemo(
    () => selectFields.find((f) => f.id === validFieldId) ?? null,
    [selectFields, validFieldId]
  )

  const columns = useMemo(() => {
    if (!groupField) return []
    return groupObjectsByField(objects, groupField.id, groupField.options ?? [])
  }, [objects, groupField])

  // Fields to show as preview on cards (exclude the grouping field)
  const cardFields = useMemo(
    () => type.fields.filter((f) => f.id !== validFieldId),
    [type.fields, validFieldId]
  )

  // Stabilize update ref to prevent stale closures
  const updateRef = useRef(update)
  useEffect(() => {
    updateRef.current = update
  }, [update])

  const handleDrop = useCallback(
    (objectId: string, newValue: string | null) => {
      const obj = objects.find((o) => o.id === objectId)
      if (!obj || !validFieldId) return

      const newProperties = { ...obj.properties }
      if (newValue === null) {
        delete newProperties[validFieldId]
      } else {
        newProperties[validFieldId] = newValue
      }

      updateRef.current(objectId, { properties: newProperties })

      const targetLabel = newValue ?? 'Uncategorized'
      setAnnouncement(`Moved "${obj.title}" to ${targetLabel}`)
    },
    [objects, validFieldId]
  )

  const handleKeyboardMove = useCallback(
    (objectId: string, direction: 'left' | 'right') => {
      const currentColIndex = columns.findIndex((col) =>
        col.objects.some((o) => o.id === objectId)
      )
      if (currentColIndex === -1) return

      const targetIndex = direction === 'left' ? currentColIndex - 1 : currentColIndex + 1
      if (targetIndex < 0 || targetIndex >= columns.length) return

      const targetValue = columns[targetIndex].value
      handleDrop(objectId, targetValue)
    },
    [columns, handleDrop]
  )

  // No select fields on the type
  if (selectFields.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>This type has no select fields to group by.</p>
        <p className="mt-1 text-sm">
          Add a select field in type settings to use board view.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <BoardFieldSelector
        selectFields={selectFields}
        selectedFieldId={validFieldId}
        onSelect={setGroupField}
      />

      {!validFieldId ? (
        <div className="py-12 text-center text-muted-foreground">
          Choose a select field to group entries into columns.
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => (
              <BoardColumn
                key={col.value ?? '__uncategorized'}
                value={col.value}
                label={col.label}
                objects={col.objects}
                fields={cardFields}
                canEdit={canEdit}
                onDrop={handleDrop}
                onMove={handleKeyboardMove}
              />
            ))}
          </div>
          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>
        </DndProvider>
      )}
    </div>
  )
}
