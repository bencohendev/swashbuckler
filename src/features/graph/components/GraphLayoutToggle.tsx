'use client'

import { Waypoints, GitFork, CircleDot, Group } from 'lucide-react'
import { useGraphStore } from '../lib/store'
import type { GraphLayoutMode } from '../lib/types'
import { cn } from '@/shared/lib/utils'

const modes: { value: GraphLayoutMode; icon: typeof Waypoints; label: string }[] = [
  { value: 'force', icon: Waypoints, label: 'Force-directed' },
  { value: 'hierarchical', icon: GitFork, label: 'Hierarchical' },
  { value: 'radial', icon: CircleDot, label: 'Radial' },
  { value: 'clustered', icon: Group, label: 'Clustered' },
]

export function GraphLayoutToggle() {
  const layoutMode = useGraphStore((s) => s.layoutMode)
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode)

  return (
    <div className="absolute top-9 left-9 flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5 backdrop-blur">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setLayoutMode(value)}
          aria-label={label}
          title={label}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            layoutMode === value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
