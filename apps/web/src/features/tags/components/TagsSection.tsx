'use client'

import { ChevronRightIcon, TagIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Tag } from '@/shared/lib/data'
import { useTagCounts } from '@/features/tags/hooks/useTags'
import { SidebarLink } from '@/features/sidebar/components/SidebarLink'
import { useCollapsible } from '@/features/sidebar/hooks/useCollapsible'
import type { CollapseSignal } from '@/features/sidebar/types'

interface TagsSectionProps {
  tags: Tag[]
  collapseSignal?: CollapseSignal
}

export function TagsSection({ tags, collapseSignal }: TagsSectionProps) {
  const [collapsed, setCollapsed] = useCollapsible('sidebar-collapsed-tags', collapseSignal)
  const tagCounts = useTagCounts(tags)

  if (tags.length === 0) return null

  return (
    <div>
      <div className="mb-1 flex items-center px-2">
        <div className="flex flex-1 items-center gap-1 text-sm font-medium text-muted-foreground">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:text-foreground"
            aria-expanded={!collapsed}
            aria-controls="tags-section-content"
            aria-label="Toggle tags"
          >
            <ChevronRightIcon
              className={cn(
                'size-3 transition-transform',
                !collapsed && 'rotate-90'
              )}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <TagIcon className="size-3" />
            <span>Tags</span>
            <span className="ml-1 text-muted-foreground/60">{tags.length}</span>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div id="tags-section-content" className="pl-8">
          {tags.map(tag => (
            <SidebarLink
              key={tag.id}
              href={`/tags/${encodeURIComponent(tag.name)}`}
              className={(isActive) => cn(
                'flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color ?? 'var(--color-muted-foreground)' }}
                />
                <span
                  className="truncate"
                  style={tag.color ? { color: tag.color } : undefined}
                >
                  {tag.name}
                </span>
              </span>
              {tagCounts.has(tag.id) && (
                <span className="text-xs text-muted-foreground/60">
                  {tagCounts.get(tag.id)}
                </span>
              )}
            </SidebarLink>
          ))}
        </div>
      )}
    </div>
  )
}
