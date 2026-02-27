'use client'

import { XIcon } from 'lucide-react'
import type { FieldDefinition, Tag, ObjectType } from '@/shared/lib/data'
import type { FilterCondition, FilterFieldTarget } from '../lib/filterTypes'
import {
  getOperators,
  getDefaultOperator,
  type FilterFieldType,
} from '../lib/operatorRegistry'
import { FilterValueInput } from './FilterValueInput'

interface FieldOption {
  label: string
  value: string
  kind: FilterFieldTarget['kind']
  fieldId?: string
  systemField?: 'created_at' | 'updated_at'
  fieldType: FilterFieldType
  options?: string[]
}

export function buildFieldOptions(fields: FieldDefinition[]): FieldOption[] {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
  const result: FieldOption[] = [
    { label: 'Title', value: '__title__', kind: 'title', fieldType: 'title' },
  ]
  for (const f of sorted) {
    result.push({
      label: f.name,
      value: f.id,
      kind: 'property',
      fieldId: f.id,
      fieldType: f.type as FilterFieldType,
      options: f.options,
    })
  }
  result.push(
    { label: 'Content', value: '__content__', kind: 'content', fieldType: 'content' },
    { label: 'Tags', value: '__tag__', kind: 'tag', fieldType: 'tag' },
    { label: 'Created', value: '__created_at__', kind: 'system', systemField: 'created_at', fieldType: 'system_date' },
    { label: 'Updated', value: '__updated_at__', kind: 'system', systemField: 'updated_at', fieldType: 'system_date' },
    { label: 'Relations', value: '__relation__', kind: 'relation', fieldType: 'relation' },
  )
  return result
}

function targetToSelectValue(target: FilterFieldTarget): string {
  switch (target.kind) {
    case 'title':
      return '__title__'
    case 'content':
      return '__content__'
    case 'tag':
      return '__tag__'
    case 'relation':
      return '__relation__'
    case 'system':
      return target.field === 'created_at' ? '__created_at__' : '__updated_at__'
    case 'property':
      return target.fieldId
  }
}

function findFieldOption(fieldOptions: FieldOption[], selectValue: string): FieldOption | undefined {
  return fieldOptions.find((f) => f.value === selectValue)
}

interface FilterConditionRowProps {
  condition: FilterCondition
  isFirst: boolean
  fieldOptions: FieldOption[]
  tags: Tag[]
  objectTypes: ObjectType[]
  onUpdate: (updates: Partial<Omit<FilterCondition, 'id'>>) => void
  onRemove: () => void
}

export function FilterConditionRow({
  condition,
  isFirst,
  fieldOptions,
  tags,
  objectTypes,
  onUpdate,
  onRemove,
}: FilterConditionRowProps) {
  const selectedValue = targetToSelectValue(condition.target)
  const selectedField = findFieldOption(fieldOptions, selectedValue)
  const fieldType = selectedField?.fieldType ?? 'text'
  const operators = getOperators(fieldType)

  function handleFieldChange(newValue: string) {
    const option = findFieldOption(fieldOptions, newValue)
    if (!option) return
    let target: FilterFieldTarget
    switch (option.kind) {
      case 'title':
        target = { kind: 'title' }
        break
      case 'content':
        target = { kind: 'content' }
        break
      case 'tag':
        target = { kind: 'tag' }
        break
      case 'relation':
        target = { kind: 'relation' }
        break
      case 'system':
        target = { kind: 'system', field: option.systemField! }
        break
      case 'property':
        target = { kind: 'property', fieldId: option.fieldId! }
        break
    }
    const defaultOp = getDefaultOperator(option.fieldType)
    onUpdate({ target, operator: defaultOp, value: '', value2: undefined })
  }

  function handleOperatorChange(op: string) {
    onUpdate({ operator: op, value: '', value2: undefined })
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
        {isFirst ? 'Where' : 'and'}
      </span>

      <select
        value={selectedValue}
        onChange={(e) => handleFieldChange(e.target.value)}
        aria-label="Filter field"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {fieldOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value)}
        aria-label="Filter operator"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      <FilterValueInput
        target={condition.target}
        fieldType={fieldType}
        operator={condition.operator}
        value={condition.value}
        value2={condition.value2}
        onChange={(v, v2) => onUpdate({ value: v, value2: v2 })}
        tags={tags}
        objectTypes={objectTypes}
        fieldOptions={selectedField?.options}
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter condition"
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}
