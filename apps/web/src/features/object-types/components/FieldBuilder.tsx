'use client'

import { useEffect, useRef, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { PlusIcon, TrashIcon, GripVerticalIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { FieldDefinition, FieldType } from '@/shared/lib/data'

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'url', label: 'URL' },
]

const DRAG_TYPE = 'FIELD_ROW'

interface DragItem {
  index: number
}

interface FieldBuilderProps {
  fields: FieldDefinition[]
  onChange: (fields: FieldDefinition[]) => void
}

export function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
  const handleAddField = () => {
    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      name: '',
      type: 'text',
      sort_order: fields.length,
    }
    onChange([...fields, newField])
  }

  const handleUpdateField = (index: number, updates: Partial<FieldDefinition>) => {
    const updated = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    )
    onChange(updated)
  }

  const handleRemoveField = (index: number) => {
    const updated = fields
      .filter((_, i) => i !== index)
      .map((field, i) => ({ ...field, sort_order: i }))
    onChange(updated)
  }

  const handleMoveField = (fromIndex: number, toIndex: number) => {
    const updated = [...fields]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(updated.map((field, i) => ({ ...field, sort_order: i })))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Custom Fields</label>
        <Button type="button" size="sm" variant="outline" onClick={handleAddField}>
          <PlusIcon className="size-3" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom fields. Add fields to define properties for this type.
        </p>
      )}

      <DndProvider backend={HTML5Backend}>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <DraggableFieldRow
              key={field.id}
              field={field}
              index={index}
              onUpdate={(updates) => handleUpdateField(index, updates)}
              onRemove={() => handleRemoveField(index)}
              onMove={handleMoveField}
            />
          ))}
        </div>
      </DndProvider>
    </div>
  )
}

interface DraggableFieldRowProps {
  field: FieldDefinition
  index: number
  onUpdate: (updates: Partial<FieldDefinition>) => void
  onRemove: () => void
  onMove: (from: number, to: number) => void
}

function DraggableFieldRow({ field, index, onUpdate, onRemove, onMove }: DraggableFieldRowProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Use refs so useDrag/useDrop specs never need to reconnect mid-drag
  const indexRef = useRef(index)
  const onMoveRef = useRef(onMove)

  useEffect(() => {
    indexRef.current = index
    onMoveRef.current = onMove
  }, [index, onMove])

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: (): DragItem => ({ index: indexRef.current }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  const [, drop] = useDrop<DragItem>({
    accept: DRAG_TYPE,
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

      // Only move when cursor crosses the midpoint
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      onMoveRef.current(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  useEffect(() => {
    drag(drop(ref))
  }, [drag, drop])

  const needsOptions = field.type === 'select' || field.type === 'multi_select'

  return (
    <div
      ref={ref}
      className="space-y-2 rounded-lg border p-3"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="min-h-11 min-w-11 inline-flex cursor-grab items-center justify-center sm:min-h-0 sm:min-w-0 text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVerticalIcon className="size-3" />
        </div>

        <input
          type="text"
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Field name"
          aria-label="Field name"
          className="w-full min-w-0 sm:w-auto sm:flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="flex items-center gap-2 pl-7 sm:pl-0">
          <select
            value={field.type}
            aria-label="Field type"
            onChange={(e) => {
              const newType = e.target.value as FieldType
              onUpdate({ type: newType, options: undefined })
            }}
            className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {FIELD_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={field.required ?? false}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="size-3"
            />
            Required
          </label>

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onRemove}
            aria-label="Remove field"
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon className="size-3" />
          </Button>
        </div>
      </div>

      {needsOptions && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onUpdate({ options })}
        />
      )}
    </div>
  )
}

interface OptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [newOption, setNewOption] = useState('')

  const handleAdd = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onChange([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="ml-5 space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Options</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option, index) => (
          <span
            key={index}
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
          >
            {option}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="min-h-11 min-w-11 inline-flex items-center justify-center sm:min-h-0 sm:min-w-0 text-muted-foreground hover:text-destructive"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Add option..."
          aria-label="New option"
          className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} className="text-xs">
          Add
        </Button>
      </div>
    </div>
  )
}
