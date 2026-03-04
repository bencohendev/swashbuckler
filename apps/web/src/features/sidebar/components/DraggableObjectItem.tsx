'use client'

import { useEffect, useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { GripVerticalIcon, FileIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObjectSummary } from '@/shared/lib/data'
import { PinButton } from '@/features/pins'
import { SidebarLink } from './SidebarLink'

interface DraggableObjectItemProps {
  index: number
  object: DataObjectSummary
  dragType: string
  onMove: (from: number, to: number) => void
  onDrop: () => void
}

interface DragItem {
  index: number
}

export function DraggableObjectItem({
  index,
  object,
  dragType,
  onMove,
  onDrop,
}: DraggableObjectItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const indexRef = useRef(index)
  const onMoveRef = useRef(onMove)
  const onDropRef = useRef(onDrop)

  useEffect(() => {
    indexRef.current = index
    onMoveRef.current = onMove
    onDropRef.current = onDrop
  }, [index, onMove, onDrop])

  const [{ isDragging }, drag] = useDrag({
    type: dragType,
    item: (): DragItem => ({ index: indexRef.current }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropRef.current(),
  })

  const [, drop] = useDrop<DragItem>({
    accept: dragType,
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
    drag(drop(ref))
  }, [drag, drop])

  return (
    <div ref={ref} className={cn('group/drag', isDragging && 'opacity-40')}>
      <SidebarLink
        href={`/objects/${object.id}`}
        className={(active) => cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-[14px] cursor-pointer transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <GripVerticalIcon className="size-3 shrink-0 cursor-grab opacity-0 group-hover/drag:opacity-50" aria-hidden="true" />
        {object.icon ? (
          <span className="text-lg">{object.icon}</span>
        ) : (
          <FileIcon className="size-5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{object.title}</span>
        <PinButton
          objectId={object.id}
          size="sm"
          className="shrink-0 opacity-0 group-hover:opacity-100"
        />
      </SidebarLink>
    </div>
  )
}
