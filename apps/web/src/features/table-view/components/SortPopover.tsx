'use client'

import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from 'lucide-react'
import { Popover } from 'radix-ui'
import type { FieldDefinition } from '@/shared/lib/data'
import { cn } from '@/shared/lib/utils'
import type { SortConfig } from '../lib/sortObjects'

interface SortPopoverProps {
  fields: FieldDefinition[]
  sort: SortConfig
  onSortChange: (sort: SortConfig) => void
}

function getSortLabel(field: string, fields: FieldDefinition[]): string {
  if (field === 'sort_order') return 'Manual'
  if (field === 'title') return 'Title'
  if (field === 'tags') return 'Tags'
  if (field === 'updated_at') return 'Updated'
  if (field === 'created_at') return 'Created'
  const f = fields.find((fd) => fd.id === field)
  return f?.name ?? field
}

export function SortPopover({ fields, sort, onSortChange }: SortPopoverProps) {
  const isManualSort = sort.field === 'sort_order'

  const sortFieldOptions = [
    { value: 'sort_order', label: 'Manual' },
    { value: 'title', label: 'Title' },
    ...fields.map((f) => ({ value: f.id, label: f.name })),
    { value: 'tags', label: 'Tags' },
    { value: 'updated_at', label: 'Updated' },
  ]

  return (
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
                    onChange={() => onSortChange({ ...sort, field: opt.value })}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {!isManualSort && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">Direction</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-pressed={sort.direction === 'asc'}
                    onClick={() => onSortChange({ ...sort, direction: 'asc' })}
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
                    onClick={() => onSortChange({ ...sort, direction: 'desc' })}
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
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
