'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronRightIcon, ClockIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObject } from '@/shared/lib/data'
import { ObjectItem } from '@/features/objects/components/ObjectItem'

const RECENT_LIMIT = 5

interface RecentSectionProps {
  objects: DataObject[]
}

export function RecentSection({ objects }: RecentSectionProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-collapsed-recent') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed-recent', String(collapsed))
  }, [collapsed])

  const recentObjects = useMemo(() => {
    return [...objects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, RECENT_LIMIT)
  }, [objects])

  if (recentObjects.length === 0) return null

  return (
    <div>
      <div className="mb-1 flex items-center px-2">
        <div className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:text-foreground"
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
        <div className="pl-4">
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
