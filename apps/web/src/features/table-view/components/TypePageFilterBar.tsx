'use client'

import { useRef, useId, useMemo } from 'react'
import { SearchIcon, ListFilterIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import type { ObjectType, Tag } from '@/shared/lib/data'
import { useObjectTypes } from '@/features/object-types'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/utils'
import type { FilterExpression } from '../lib/filterTypes'
import { hasActiveFilters } from '../lib/filterTypes'
import type { SortConfig } from '../lib/sortObjects'
import { SortPopover } from './SortPopover'
import { FilterBuilder } from './FilterBuilder'
import { FilterPills } from './FilterPills'

interface TypePageFilterBarProps {
  type: ObjectType
  tags: Tag[]
  expression: FilterExpression
  onExpressionChange: (expr: FilterExpression) => void
  sort: SortConfig
  onSortChange: (sort: SortConfig) => void
  totalCount: number
  filteredCount: number
}

export function TypePageFilterBar({
  type,
  tags,
  expression,
  onExpressionChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: TypePageFilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const liveId = useId()
  const active = hasActiveFilters(expression)
  const { types } = useObjectTypes()

  const fields = useMemo(
    () => [...type.fields].sort((a, b) => a.sort_order - b.sort_order),
    [type.fields],
  )

  const conditionCount = useMemo(
    () => expression.groups.reduce((sum, g) => sum + g.conditions.length, 0),
    [expression.groups],
  )

  function updateSearch(search: string) {
    onExpressionChange({ ...expression, search })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            role="searchbox"
            aria-label={`Search ${type.plural_name}`}
            placeholder={`Search ${type.plural_name.toLowerCase()}\u2026`}
            value={expression.search}
            onChange={(e) => updateSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                updateSearch('')
                searchRef.current?.blur()
              }
            }}
            className="pl-8"
          />
        </div>

        <SortPopover fields={fields} sort={sort} onSortChange={onSortChange} />

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Filter"
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:bg-accent',
                active && 'border-primary text-primary',
              )}
            >
              <ListFilterIcon className="size-4" />
              Filter
              {conditionCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {conditionCount}
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={4}
              className="z-50 w-[420px] rounded-lg border bg-popover p-3 shadow-md"
            >
              <div className="max-h-80 overflow-y-auto">
                <FilterBuilder
                  fields={fields}
                  tags={tags}
                  objectTypes={types}
                  expression={expression}
                  onChange={onExpressionChange}
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <FilterPills
        expression={expression}
        fields={fields}
        tags={tags}
        objectTypes={types}
        onChange={onExpressionChange}
      />

      <div aria-live="polite" id={liveId} className="sr-only">
        {active
          ? `Showing ${filteredCount} of ${totalCount} ${type.plural_name.toLowerCase()}`
          : `${totalCount} ${type.plural_name.toLowerCase()}`}
      </div>
    </div>
  )
}
