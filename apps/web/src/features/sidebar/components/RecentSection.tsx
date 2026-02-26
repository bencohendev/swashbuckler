'use client'

import { useMemo } from 'react'
import { ChevronRightIcon, ClockIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObjectSummary } from '@/shared/lib/data'
import { ObjectItem } from '@/features/objects/components/ObjectItem'
import { useCollapsible } from '@/features/sidebar/hooks/useCollapsible'
import { useRecentAccess } from '@/shared/stores/recentAccess'
import type { CollapseSignal } from '@/features/sidebar/types'

const RECENT_LIMIT = 5

interface RecentSectionProps {
  objects: DataObjectSummary[]
  collapseSignal?: CollapseSignal
}

export function RecentSection({ objects, collapseSignal }: RecentSectionProps) {
  const [collapsed, setCollapsed] = useCollapsible('sidebar-collapsed-recent', collapseSignal)

  const entries = useRecentAccess((s) => s.entries)
  const recentIds = useMemo(() => entries.slice(0, RECENT_LIMIT).map((e) => e.id), [entries])

  const recentObjects = useMemo(() => {
    const objectMap = new Map(objects.map((o) => [o.id, o]))

    // Start with tracked entries that still exist in the object list
    const ordered: DataObjectSummary[] = []
    for (const id of recentIds) {
      const obj = objectMap.get(id)
      if (obj) {
        ordered.push(obj)
        objectMap.delete(id)
      }
    }

    // Fill remaining slots with updated_at-sorted fallback
    if (ordered.length < RECENT_LIMIT) {
      const remaining = [...objectMap.values()]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      for (const obj of remaining) {
        if (ordered.length >= RECENT_LIMIT) break
        ordered.push(obj)
      }
    }

    return ordered
  }, [objects, recentIds])

  if (recentObjects.length === 0) return null

  return (
    <div>
      <div className="mb-1 flex items-center px-2">
        <div className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:text-foreground"
            aria-expanded={!collapsed}
            aria-controls="recent-section-content"
            aria-label="Toggle recent items"
          >
            <ChevronRightIcon
              className={cn(
                'size-3 transition-transform',
                !collapsed && 'rotate-90'
              )}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="size-3" />
            <span>Recent</span>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div id="recent-section-content" className="pl-4">
          {recentObjects.map(obj => (
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
