'use client'

import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { FieldDefinition, Tag, ObjectType } from '@/shared/lib/data'
import type { FilterExpression } from '../lib/filterTypes'
import { addGroup, addCondition, removeCondition, updateCondition, removeGroup } from '../lib/filterTypes'
import { getDefaultOperator } from '../lib/operatorRegistry'
import { FilterConditionRow, buildFieldOptions } from './FilterConditionRow'

interface FilterBuilderProps {
  fields: FieldDefinition[]
  tags: Tag[]
  objectTypes: ObjectType[]
  expression: FilterExpression
  onChange: (expr: FilterExpression) => void
}

export function FilterBuilder({
  fields,
  tags,
  objectTypes,
  expression,
  onChange,
}: FilterBuilderProps) {
  const fieldOptions = buildFieldOptions(fields)

  function handleAddGroup() {
    // Add a group with one default condition
    let next = addGroup(expression)
    const newGroup = next.groups[next.groups.length - 1]
    const defaultField = fieldOptions[0]
    const defaultOp = getDefaultOperator(defaultField.fieldType)
    next = addCondition(next, newGroup.id, {
      id: crypto.randomUUID(),
      target: { kind: 'title' },
      operator: defaultOp,
      value: '',
    })
    onChange(next)
  }

  function handleAddCondition(groupId: string) {
    const defaultField = fieldOptions[0]
    const defaultOp = getDefaultOperator(defaultField.fieldType)
    const next = addCondition(expression, groupId, {
      id: crypto.randomUUID(),
      target: { kind: 'title' },
      operator: defaultOp,
      value: '',
    })
    onChange(next)
  }

  function handleRemoveCondition(groupId: string, conditionId: string) {
    onChange(removeCondition(expression, groupId, conditionId))
  }

  function handleUpdateCondition(
    groupId: string,
    conditionId: string,
    updates: Partial<Omit<import('../lib/filterTypes').FilterCondition, 'id'>>,
  ) {
    onChange(updateCondition(expression, groupId, conditionId, updates))
  }

  function handleRemoveGroup(groupId: string) {
    onChange(removeGroup(expression, groupId))
  }

  function handleClearAll() {
    onChange({ search: expression.search, groups: [] })
  }

  return (
    <div className="space-y-3">
      {expression.groups.map((group, groupIndex) => (
        <div key={group.id}>
          {groupIndex > 0 && (
            <div className="flex items-center gap-2 py-1.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <div className="space-y-1.5">
            {group.conditions.map((cond, condIndex) => (
              <FilterConditionRow
                key={cond.id}
                condition={cond}
                isFirst={condIndex === 0}
                fieldOptions={fieldOptions}
                tags={tags}
                objectTypes={objectTypes}
                onUpdate={(updates) =>
                  handleUpdateCondition(group.id, cond.id, updates)
                }
                onRemove={() => handleRemoveCondition(group.id, cond.id)}
              />
            ))}
            <div className="flex items-center gap-1.5 pl-[3.25rem]">
              <button
                type="button"
                onClick={() => handleAddCondition(group.id)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <PlusIcon className="size-3" />
                Add filter
              </button>
              {expression.groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(group.id)}
                  aria-label="Remove filter group"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-3" />
                  Remove group
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 border-t pt-2">
        <button
          type="button"
          onClick={handleAddGroup}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PlusIcon className="size-3" />
          Add filter group
        </button>
        {expression.groups.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="ml-auto rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
