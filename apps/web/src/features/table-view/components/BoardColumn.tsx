'use client'

import { useRef, useEffect } from 'react'
import { useDrop } from 'react-dnd'
import type { DataObjectSummary, FieldDefinition } from '@/shared/lib/data'
import { BoardCard, type BoardCardDragItem } from './BoardCard'
import { cn } from '@/shared/lib/utils'

interface BoardColumnProps {
  value: string | null
  label: string
  objects: DataObjectSummary[]
  fields: FieldDefinition[]
  canEdit: boolean
  onDrop: (objectId: string, newValue: string | null) => void
  onMove?: (objectId: string, direction: 'left' | 'right') => void
}

export function BoardColumn({ value, label, objects, fields, canEdit, onDrop, onMove }: BoardColumnProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isOver }, drop] = useDrop<BoardCardDragItem, void, { isOver: boolean }>({
    accept: BoardCard.DRAG_TYPE,
    canDrop: () => canEdit,
    drop: (item) => {
      if (item.sourceValue === value) return
      onDrop(item.objectId, value)
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  })

  useEffect(() => {
    drop(ref)
  }, [drop])

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${label} — ${objects.length} ${objects.length === 1 ? 'entry' : 'entries'}`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30',
        isOver && canEdit && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <h3 className="text-sm font-medium truncate">{label}</h3>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {objects.length}
        </span>
      </div>
      <div role="list" className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {objects.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground/60">
            No entries
          </div>
        ) : (
          objects.map((obj) => (
            <BoardCard
              key={obj.id}
              object={obj}
              fields={fields}
              sourceValue={value}
              canEdit={canEdit}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  )
}
