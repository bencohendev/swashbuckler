'use client'

import { XIcon } from 'lucide-react'
import type { FieldDefinition, Tag, ObjectType } from '@/shared/lib/data'
import type { FilterExpression, FilterCondition, FilterFieldTarget } from '../lib/filterTypes'
import { removeCondition } from '../lib/filterTypes'
import { getOperatorLabel } from '../lib/operatorRegistry'

interface FilterPillsProps {
  expression: FilterExpression
  fields: FieldDefinition[]
  tags: Tag[]
  objectTypes: ObjectType[]
  onChange: (expr: FilterExpression) => void
}

function getFieldLabel(target: FilterFieldTarget, fields: FieldDefinition[]): string {
  switch (target.kind) {
    case 'title':
      return 'Title'
    case 'tag':
      return 'Tags'
    case 'relation':
      return 'Relations'
    case 'system':
      return target.field === 'created_at' ? 'Created' : 'Updated'
    case 'property': {
      const field = fields.find((f) => f.id === target.fieldId)
      return field?.name ?? target.fieldId
    }
  }
}

function getValueLabel(
  condition: FilterCondition,
  tags: Tag[],
  objectTypes: ObjectType[],
): string {
  const { operator, value } = condition
  // No-value operators
  if (['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'has_links', 'has_no_links'].includes(operator)) {
    return ''
  }

  if (condition.target.kind === 'tag') {
    const tag = tags.find((t) => t.id === String(value ?? ''))
    return tag?.name ?? String(value ?? '')
  }

  if (condition.target.kind === 'relation' && operator === 'links_to_type') {
    const type = objectTypes.find((t) => t.id === String(value ?? ''))
    return type?.name ?? String(value ?? '')
  }

  const v = String(value ?? '')
  if (operator === 'is_between') {
    const v2 = String(condition.value2 ?? '')
    return `${v} \u2013 ${v2}`
  }
  return v
}

export function FilterPills({
  expression,
  fields,
  tags,
  objectTypes,
  onChange,
}: FilterPillsProps) {
  const pills: { key: string; groupId: string; conditionId: string; label: string }[] = []

  for (const group of expression.groups) {
    for (const cond of group.conditions) {
      const fieldLabel = getFieldLabel(cond.target, fields)
      const opLabel = getOperatorLabel(cond.operator)
      const valueLabel = getValueLabel(cond, tags, objectTypes)
      const label = valueLabel
        ? `${fieldLabel} ${opLabel} ${valueLabel}`
        : `${fieldLabel} ${opLabel}`
      pills.push({
        key: cond.id,
        groupId: group.id,
        conditionId: cond.id,
        label,
      })
    }
  }

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
        >
          {pill.label}
          <button
            type="button"
            onClick={() =>
              onChange(removeCondition(expression, pill.groupId, pill.conditionId))
            }
            aria-label={`Remove filter: ${pill.label}`}
            className="rounded-full p-0.5 hover:bg-muted"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
