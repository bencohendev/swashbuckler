'use client'

import { useMemo } from 'react'
import { ChevronRightIcon, PinIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObjectSummary } from '@/shared/lib/data'
import { ObjectItem } from '@/features/objects/components/ObjectItem'
import { useCollapsible } from '@/features/sidebar/hooks/useCollapsible'
import type { CollapseSignal } from '@/features/sidebar/types'

interface PinnedSectionProps {
  pinnedIds: Set<string>
  objects: DataObjectSummary[]
  collapseSignal?: CollapseSignal
}

export function PinnedSection({ pinnedIds, objects, collapseSignal }: PinnedSectionProps) {
  const [collapsed, setCollapsed] = useCollapsible('sidebar-collapsed-pinned', collapseSignal)

  const pinnedObjects = useMemo(() => {
    if (pinnedIds.size === 0) return []
    return objects.filter(obj => pinnedIds.has(obj.id))
  }, [objects, pinnedIds])

  if (pinnedObjects.length === 0) return null

  return (
    <div>
      <div className="mb-1 flex items-center px-2">
        <div className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:text-foreground"
            aria-expanded={!collapsed}
            aria-controls="pinned-section-content"
            aria-label="Toggle pinned items"
          >
            <ChevronRightIcon
              className={cn(
                'size-3 transition-transform',
                !collapsed && 'rotate-90'
              )}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <PinIcon className="size-3" />
            <span>Pinned</span>
            <span className="ml-1 text-muted-foreground/60">{pinnedObjects.length}</span>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div id="pinned-section-content" className="pl-4">
          {pinnedObjects.map(obj => (
            <ObjectItem
              key={obj.id}
              object={obj}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}
