'use client'

import { TableIcon, ListIcon, LayoutGridIcon, KanbanIcon } from 'lucide-react'
import { useViewMode, type ViewMode } from '../stores/viewMode'
import { cn } from '@/shared/lib/utils'

const modes: { value: ViewMode; icon: typeof TableIcon; label: string }[] = [
  { value: 'table', icon: TableIcon, label: 'Table view' },
  { value: 'list', icon: ListIcon, label: 'List view' },
  { value: 'card', icon: LayoutGridIcon, label: 'Card view' },
  { value: 'board', icon: KanbanIcon, label: 'Board view' },
]

interface ViewToggleProps {
  slug: string
}

export function ViewToggle({ slug }: ViewToggleProps) {
  const { mode, setMode } = useViewMode(slug)

  return (
    <div role="group" aria-label="View mode" className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          aria-label={label}
          aria-pressed={mode === value}
          className={cn(
            'rounded-md p-2.5 transition-colors md:p-1.5',
            mode === value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
