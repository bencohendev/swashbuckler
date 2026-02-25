'use client'

import { useRef, useId } from 'react'
import {
  SearchIcon,
  ListFilterIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
} from 'lucide-react'
import { Popover } from 'radix-ui'
import type { ObjectType, FieldDefinition, Tag } from '@/shared/lib/data'
import { TagBadge } from '@/features/tags'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/utils'
import { type TypePageFilters, EMPTY_FILTERS, isFiltered } from '../lib/filterObjects'
import type { SortConfig } from '../lib/sortObjects'

interface TypePageFilterBarProps {
  type: ObjectType
  tags: Tag[]
  filters: TypePageFilters
  onFiltersChange: (filters: TypePageFilters) => void
  sort: SortConfig
  onSortChange: (sort: SortConfig) => void
  totalCount: number
  filteredCount: number
}

function getSortLabel(field: string, fields: FieldDefinition[]): string {
  if (field === 'title') return 'Title'
  if (field === 'tags') return 'Tags'
  if (field === 'updated_at') return 'Updated'
  if (field === 'created_at') return 'Created'
  const f = fields.find((fd) => fd.id === field)
  return f?.name ?? field
}

export function TypePageFilterBar({
  type,
  tags,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: TypePageFilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const liveId = useId()
  const active = isFiltered(filters)

  const fields = [...type.fields].sort((a, b) => a.sort_order - b.sort_order)
  const selectFields = fields.filter(
    (f) => f.type === 'select' || f.type === 'multi_select'
  )
  const checkboxFields = fields.filter((f) => f.type === 'checkbox')
  const dateFields = fields.filter((f) => f.type === 'date')
  const numberFields = fields.filter((f) => f.type === 'number')
  const textFields = fields.filter((f) => f.type === 'text')
  const urlFields = fields.filter((f) => f.type === 'url')

  const hasFilterableFields =
    selectFields.length > 0 ||
    checkboxFields.length > 0 ||
    dateFields.length > 0 ||
    numberFields.length > 0 ||
    textFields.length > 0 ||
    urlFields.length > 0 ||
    tags.length > 0

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

  function setDateFilter(fieldId: string, range: { from?: string; to?: string }) {
    onFiltersChange({
      ...filters,
      dateFilters: { ...filters.dateFilters, [fieldId]: range },
    })
  }

  function setNumberFilter(fieldId: string, range: { min?: number; max?: number }) {
    onFiltersChange({
      ...filters,
      numberFilters: { ...filters.numberFilters, [fieldId]: range },
    })
  }

  function setTextFilter(fieldId: string, value: string) {
    onFiltersChange({
      ...filters,
      textFilters: { ...filters.textFilters, [fieldId]: value },
    })
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

  for (const field of dateFields) {
    const range = filters.dateFilters[field.id]
    if (!range || (!range.from && !range.to)) continue
    let label: string
    if (range.from && range.to) {
      label = `${field.name}: ${range.from} \u2013 ${range.to}`
    } else if (range.from) {
      label = `${field.name}: after ${range.from}`
    } else {
      label = `${field.name}: before ${range.to}`
    }
    pills.push({
      key: `date:${field.id}`,
      label,
      onRemove: () => {
        const next = { ...filters.dateFilters }
        delete next[field.id]
        onFiltersChange({ ...filters, dateFilters: next })
      },
    })
  }

  for (const field of numberFields) {
    const range = filters.numberFilters[field.id]
    if (!range || (range.min === undefined && range.max === undefined)) continue
    let label: string
    if (range.min !== undefined && range.max !== undefined) {
      label = `${field.name}: ${range.min} \u2013 ${range.max}`
    } else if (range.min !== undefined) {
      label = `${field.name}: \u2265 ${range.min}`
    } else {
      label = `${field.name}: \u2264 ${range.max}`
    }
    pills.push({
      key: `number:${field.id}`,
      label,
      onRemove: () => {
        const next = { ...filters.numberFilters }
        delete next[field.id]
        onFiltersChange({ ...filters, numberFilters: next })
      },
    })
  }

  for (const field of [...textFields, ...urlFields]) {
    const val = filters.textFilters[field.id]
    if (!val) continue
    pills.push({
      key: `text:${field.id}`,
      label: `${field.name}: contains \u201c${val}\u201d`,
      onRemove: () => {
        const next = { ...filters.textFilters }
        delete next[field.id]
        onFiltersChange({ ...filters, textFilters: next })
      },
    })
  }

  const sortFieldOptions = [
    { value: 'title', label: 'Title' },
    ...fields.map((f) => ({ value: f.id, label: f.name })),
    { value: 'tags', label: 'Tags' },
    { value: 'updated_at', label: 'Updated' },
  ]

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

        {/* Sort popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
            >
              <ArrowUpDownIcon className="size-4" />
              <span className="hidden sm:inline">
                {getSortLabel(sort.field, fields)}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={4}
              className="z-50 w-56 rounded-lg border bg-popover p-3 shadow-md"
            >
              <div className="space-y-3">
                <div role="radiogroup" aria-label="Sort field" className="space-y-0.5">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Sort by</p>
                  {sortFieldOptions.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
                      <input
                        type="radio"
                        name="sort-field"
                        value={opt.value}
                        checked={sort.field === opt.value}
                        onChange={() =>
                          onSortChange({ ...sort, field: opt.value })
                        }
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Direction</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-pressed={sort.direction === 'asc'}
                      onClick={() =>
                        onSortChange({ ...sort, direction: 'asc' })
                      }
                      className={cn(
                        'flex items-center gap-1 rounded-md px-3 py-1 text-sm transition-colors',
                        sort.direction === 'asc'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <ArrowUpIcon className="size-3" />
                      Asc
                    </button>
                    <button
                      type="button"
                      aria-pressed={sort.direction === 'desc'}
                      onClick={() =>
                        onSortChange({ ...sort, direction: 'desc' })
                      }
                      className={cn(
                        'flex items-center gap-1 rounded-md px-3 py-1 text-sm transition-colors',
                        sort.direction === 'desc'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <ArrowDownIcon className="size-3" />
                      Desc
                    </button>
                  </div>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Filter popover */}
        {hasFilterableFields && (
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
                  {/* Select / multi_select fields */}
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

                  {/* Checkbox fields */}
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

                  {/* Date fields */}
                  {dateFields.map((field) => {
                    const range = filters.dateFilters[field.id] ?? {}
                    return (
                      <fieldset key={field.id} className="space-y-1.5">
                        <legend className="text-xs font-medium uppercase text-muted-foreground">{field.name}</legend>
                        <div className="flex items-center gap-2">
                          <label className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">From</span>
                            <input
                              type="date"
                              value={range.from ?? ''}
                              onChange={(e) =>
                                setDateFilter(field.id, { ...range, from: e.target.value || undefined })
                              }
                              aria-label={`${field.name} from date`}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">To</span>
                            <input
                              type="date"
                              value={range.to ?? ''}
                              onChange={(e) =>
                                setDateFilter(field.id, { ...range, to: e.target.value || undefined })
                              }
                              aria-label={`${field.name} to date`}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                        </div>
                      </fieldset>
                    )
                  })}

                  {/* Number fields */}
                  {numberFields.map((field) => {
                    const range = filters.numberFilters[field.id] ?? {}
                    return (
                      <fieldset key={field.id} className="space-y-1.5">
                        <legend className="text-xs font-medium uppercase text-muted-foreground">{field.name}</legend>
                        <div className="flex items-center gap-2">
                          <label className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Min</span>
                            <input
                              type="number"
                              value={range.min ?? ''}
                              onChange={(e) =>
                                setNumberFilter(field.id, {
                                  ...range,
                                  min: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              aria-label={`${field.name} minimum`}
                              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-muted-foreground">Max</span>
                            <input
                              type="number"
                              value={range.max ?? ''}
                              onChange={(e) =>
                                setNumberFilter(field.id, {
                                  ...range,
                                  max: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              aria-label={`${field.name} maximum`}
                              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                        </div>
                      </fieldset>
                    )
                  })}

                  {/* Text fields */}
                  {textFields.map((field) => (
                    <div key={field.id}>
                      <h4 className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{field.name}</h4>
                      <Input
                        type="text"
                        value={filters.textFilters[field.id] ?? ''}
                        onChange={(e) => setTextFilter(field.id, e.target.value)}
                        placeholder={`Filter ${field.name.toLowerCase()}\u2026`}
                        aria-label={`${field.name} filter`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}

                  {/* URL fields */}
                  {urlFields.map((field) => (
                    <div key={field.id}>
                      <h4 className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{field.name}</h4>
                      <Input
                        type="text"
                        value={filters.textFilters[field.id] ?? ''}
                        onChange={(e) => setTextFilter(field.id, e.target.value)}
                        placeholder={`Filter ${field.name.toLowerCase()}\u2026`}
                        aria-label={`${field.name} filter`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}

                  {/* Tags */}
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
