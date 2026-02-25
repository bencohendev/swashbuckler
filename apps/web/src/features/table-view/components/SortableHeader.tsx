'use client'

import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'

export interface SortState {
  column: string
  direction: 'asc' | 'desc'
}

interface SortableHeaderProps {
  column: string
  label: string
  sort: SortState | null
  onSort: (column: string) => void
  className?: string
}

export function SortableHeader({ column, label, sort, onSort, className }: SortableHeaderProps) {
  const isActive = sort?.column === column

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex cursor-pointer select-none items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive ? (
          sort.direction === 'asc' ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>
    </th>
  )
}
