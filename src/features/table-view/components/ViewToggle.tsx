'use client'

import { TableIcon, ListIcon, LayoutGridIcon } from 'lucide-react'
import { useViewMode, type ViewMode } from '../stores/viewMode'
import { cn } from '@/shared/lib/utils'

const modes: { value: ViewMode; icon: typeof TableIcon; label: string }[] = [
  { value: 'table', icon: TableIcon, label: 'Table view' },
  { value: 'list', icon: ListIcon, label: 'List view' },
  { value: 'card', icon: LayoutGridIcon, label: 'Card view' },
]

interface ViewToggleProps {
  slug: string
}

export function ViewToggle({ slug }: ViewToggleProps) {
  const { mode, setMode } = useViewMode(slug)

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          aria-label={label}
          className={cn(
            'rounded-md p-1.5 transition-colors',
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
