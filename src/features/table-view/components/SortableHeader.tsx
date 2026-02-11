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
      className={`cursor-pointer select-none px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground ${className ?? ''}`}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
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
      </span>
    </th>
  )
}
