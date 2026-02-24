'use client'

import { useRef, useId } from 'react'
import { SearchIcon, ListFilterIcon, XIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import type { ObjectType, Tag } from '@/shared/lib/data'
import { TagBadge } from '@/features/tags'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/utils'
import { type TypePageFilters, EMPTY_FILTERS, isFiltered } from '../lib/filterObjects'

interface TypePageFilterBarProps {
  type: ObjectType
  tags: Tag[]
  filters: TypePageFilters
  onFiltersChange: (filters: TypePageFilters) => void
  totalCount: number
  filteredCount: number
}

export function TypePageFilterBar({
  type,
  tags,
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: TypePageFilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const liveId = useId()
  const active = isFiltered(filters)
  const hasFilterableFields = type.fields.some(
    (f) => f.type === 'select' || f.type === 'multi_select' || f.type === 'checkbox'
  )
  const showPopover = hasFilterableFields || tags.length > 0

  const selectFields = type.fields.filter(
    (f) => f.type === 'select' || f.type === 'multi_select'
  )
  const checkboxFields = type.fields.filter((f) => f.type === 'checkbox')

  function updateSearch(search: string) {
    onFiltersChange({ ...filters, search })
  }

  function toggleSelectValue(fieldId: string, value: string) {
    const current = filters.selectFilters[fieldId] ?? new Set()
    const next = new Set(current)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    onFiltersChange({
      ...filters,
      selectFilters: { ...filters.selectFilters, [fieldId]: next },
    })
  }

  function setCheckboxFilter(fieldId: string, value: boolean | undefined) {
    onFiltersChange({
      ...filters,
      checkboxFilters: { ...filters.checkboxFilters, [fieldId]: value },
    })
  }

  function toggleTag(tagId: string) {
    const next = new Set(filters.tagFilter)
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onFiltersChange({ ...filters, tagFilter: next })
  }

  function clearAll() {
    onFiltersChange(EMPTY_FILTERS)
    searchRef.current?.focus()
  }

  // Build active filter pills
  const pills: { key: string; label: string; onRemove: () => void }[] = []

  for (const field of selectFields) {
    const selected = filters.selectFilters[field.id]
    if (!selected) continue
    for (const val of selected) {
      pills.push({
        key: `${field.id}:${val}`,
        label: `${field.name}: ${val}`,
        onRemove: () => toggleSelectValue(field.id, val),
      })
    }
  }

  for (const field of checkboxFields) {
    const val = filters.checkboxFilters[field.id]
    if (val === undefined) continue
    pills.push({
      key: `checkbox:${field.id}`,
      label: `${field.name}: ${val ? 'Yes' : 'No'}`,
      onRemove: () => setCheckboxFilter(field.id, undefined),
    })
  }

  for (const tagId of filters.tagFilter) {
    const tag = tags.find((t) => t.id === tagId)
    if (!tag) continue
    pills.push({
      key: `tag:${tagId}`,
      label: `Tag: ${tag.name}`,
      onRemove: () => toggleTag(tagId),
    })
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
            placeholder={`Search ${type.plural_name.toLowerCase()}…`}
            value={filters.search}
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

        {showPopover && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label="Filter"
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:bg-accent',
                  active && 'border-primary text-primary'
                )}
              >
                <ListFilterIcon className="size-4" />
                Filter
                {pills.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {pills.length}
                  </span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="end"
                sideOffset={4}
                className="z-50 w-72 rounded-lg border bg-popover p-3 shadow-md"
              >
                <div className="max-h-80 space-y-4 overflow-y-auto">
                  {selectFields.map((field) => {
                    const headingId = `filter-${field.id}`
                    const selected = filters.selectFilters[field.id] ?? new Set<string>()
                    return (
                      <div key={field.id} role="group" aria-labelledby={headingId}>
                        <h4 id={headingId} className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                          {field.name}
                        </h4>
                        <div className="space-y-1">
                          {(field.options ?? []).map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent">
                              <input
                                type="checkbox"
                                checked={selected.has(option)}
                                onChange={() => toggleSelectValue(field.id, option)}
                                className="rounded border-input"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {checkboxFields.map((field) => {
                    const headingId = `filter-cb-${field.id}`
                    const val = filters.checkboxFilters[field.id]
                    return (
                      <div key={field.id} role="group" aria-labelledby={headingId}>
                        <h4 id={headingId} className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                          {field.name}
                        </h4>
                        <div className="flex gap-1">
                          {([undefined, true, false] as const).map((choice) => {
                            const label = choice === undefined ? 'Any' : choice ? 'Yes' : 'No'
                            return (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={val === choice}
                                onClick={() => setCheckboxFilter(field.id, choice)}
                                className={cn(
                                  'rounded-md px-3 py-1 text-sm transition-colors',
                                  val === choice
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {tags.length > 0 && (
                    <div role="group" aria-labelledby="filter-tags">
                      <h4 id="filter-tags" className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                        Tags
                      </h4>
                      <div className="space-y-1">
                        {tags.map((tag) => (
                          <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent">
                            <input
                              type="checkbox"
                              checked={filters.tagFilter.has(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              className="rounded border-input"
                            />
                            <TagBadge name={tag.name} color={tag.color} />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {active && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-3 w-full rounded-md border py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
            >
              {pill.label}
              <button
                type="button"
                onClick={pill.onRemove}
                aria-label={`Remove filter: ${pill.label}`}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div aria-live="polite" id={liveId} className="sr-only">
        {active
          ? `Showing ${filteredCount} of ${totalCount} ${type.plural_name.toLowerCase()}`
          : `${totalCount} ${type.plural_name.toLowerCase()}`}
      </div>
    </div>
  )
}
