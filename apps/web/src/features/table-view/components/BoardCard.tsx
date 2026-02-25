'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDrag } from 'react-dnd'
import type { DataObject, FieldDefinition } from '@/shared/lib/data'
import { PropertyCell } from './PropertyCell'
import { cn } from '@/shared/lib/utils'

const DRAG_TYPE = 'BOARD_CARD'

export interface BoardCardDragItem {
  type: typeof DRAG_TYPE
  objectId: string
  sourceValue: string | null
}

interface BoardCardProps {
  object: DataObject
  fields: FieldDefinition[]
  sourceValue: string | null
  canEdit: boolean
}

export function BoardCard({ object, fields, sourceValue, canEdit }: BoardCardProps) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag<BoardCardDragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { type: DRAG_TYPE, objectId: object.id, sourceValue },
    canDrag: () => canEdit,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  useEffect(() => {
    drag(ref)
  }, [drag])

  // Show up to 2 non-grouping fields that have values
  const previewFields = fields
    .filter((f) => object.properties[f.id] !== undefined && object.properties[f.id] !== null && object.properties[f.id] !== '')
    .slice(0, 2)

  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={0}
      className={cn(
        'rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50',
        canEdit && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
      onClick={() => router.push(`/objects/${object.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/objects/${object.id}`)
        }
      }}
    >
      <div className="flex items-center gap-2">
        {object.icon && <span className="shrink-0">{object.icon}</span>}
        <span className="truncate font-medium text-sm">{object.title}</span>
      </div>
      {previewFields.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {previewFields.map((field) => (
            <div key={field.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="shrink-0">{field.name}:</span>
              <PropertyCell value={object.properties[field.id]} fieldType={field.type} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

BoardCard.DRAG_TYPE = DRAG_TYPE
