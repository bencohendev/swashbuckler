'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDrag, useDrop } from 'react-dnd'
import { GripVerticalIcon } from 'lucide-react'
import type { DataObjectSummary, ObjectType } from '@/shared/lib/data'

const LIST_ITEM_DRAG_TYPE = 'LIST_ITEM'

interface DragItem {
  index: number
}

interface TypeListViewProps {
  type?: ObjectType
  objects: DataObjectSummary[]
  emptyMessage?: string
  isManualSort?: boolean
  onMoveObject?: (from: number, to: number) => void
  onDropObjects?: () => void
}

function DraggableListItem({
  index,
  obj,
  router,
  onMove,
  onDrop,
}: {
  index: number
  obj: DataObjectSummary
  router: ReturnType<typeof useRouter>
  onMove: (from: number, to: number) => void
  onDrop: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const indexRef = useRef(index)
  const onMoveRef = useRef(onMove)
  const onDropRef = useRef(onDrop)

  useEffect(() => {
    indexRef.current = index
    onMoveRef.current = onMove
    onDropRef.current = onDrop
  }, [index, onMove, onDrop])

  const [{ isDragging }, drag, preview] = useDrag({
    type: LIST_ITEM_DRAG_TYPE,
    item: (): DragItem => ({ index: indexRef.current }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropRef.current(),
  })

  const [, drop] = useDrop<DragItem>({
    accept: LIST_ITEM_DRAG_TYPE,
    hover: (item, monitor) => {
      if (!ref.current) return
      const dragIndex = item.index
      const hoverIndex = indexRef.current
      if (dragIndex === hoverIndex) return

      const hoverRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return
      const hoverClientY = clientOffset.y - hoverRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      onMoveRef.current(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  useEffect(() => {
    preview(drop(ref))
  }, [preview, drop])

  return (
    <div ref={ref} className={isDragging ? 'opacity-40' : ''}>
      <button
        onClick={() => router.push(`/objects/${obj.id}`)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50"
      >
        <span
          ref={(el) => { drag(el) }}
          role="button"
          tabIndex={0}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <GripVerticalIcon className="size-4" />
        </span>
        {obj.icon && <span className="shrink-0">{obj.icon}</span>}
        <span className="truncate font-medium">{obj.title}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {new Date(obj.updated_at).toLocaleDateString()}
        </span>
      </button>
    </div>
  )
}

export function TypeListView({ type, objects, emptyMessage, isManualSort, onMoveObject, onDropObjects }: TypeListViewProps) {
  const router = useRouter()

  if (objects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyMessage ?? `No ${type?.plural_name.toLowerCase() ?? 'items'} yet`}
      </div>
    )
  }

  return (
    <div className="divide-y rounded-lg border">
      {isManualSort && onMoveObject && onDropObjects ? (
        objects.map((obj, i) => (
          <DraggableListItem
            key={obj.id}
            index={i}
            obj={obj}
            router={router}
            onMove={onMoveObject}
            onDrop={onDropObjects}
          />
        ))
      ) : (
        objects.map((obj) => (
          <button
            key={obj.id}
            onClick={() => router.push(`/objects/${obj.id}`)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50"
          >
            {obj.icon && <span className="shrink-0">{obj.icon}</span>}
            <span className="truncate font-medium">{obj.title}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {new Date(obj.updated_at).toLocaleDateString()}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
