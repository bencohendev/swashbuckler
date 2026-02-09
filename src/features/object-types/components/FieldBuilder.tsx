'use client'

import { useState } from 'react'
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

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...fields]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    onChange(updated.map((field, i) => ({ ...field, sort_order: i })))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Custom Fields</label>
        <Button size="sm" variant="outline" onClick={handleAddField}>
          <PlusIcon className="size-3" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom fields. Add fields to define properties for this type.
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <FieldRow
            key={field.id}
            field={field}
            index={index}
            totalFields={fields.length}
            onUpdate={(updates) => handleUpdateField(index, updates)}
            onRemove={() => handleRemoveField(index)}
            onMove={(direction) => handleMoveField(index, direction)}
          />
        ))}
      </div>
    </div>
  )
}

interface FieldRowProps {
  field: FieldDefinition
  index: number
  totalFields: number
  onUpdate: (updates: Partial<FieldDefinition>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
}

function FieldRow({ field, index, totalFields, onUpdate, onRemove, onMove }: FieldRowProps) {
  const [showOptions, setShowOptions] = useState(false)
  const needsOptions = field.type === 'select' || field.type === 'multi_select'

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <GripVerticalIcon className="size-3" />
          </button>
        </div>

        <input
          type="text"
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Field name"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />

        <select
          value={field.type}
          onChange={(e) => {
            const newType = e.target.value as FieldType
            onUpdate({ type: newType, options: undefined })
            setShowOptions(newType === 'select' || newType === 'multi_select')
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
          size="icon-xs"
          variant="ghost"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <TrashIcon className="size-3" />
        </Button>
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
              className="text-muted-foreground hover:text-destructive"
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
          className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" variant="outline" onClick={handleAdd} className="text-xs">
          Add
        </Button>
      </div>
    </div>
  )
}
