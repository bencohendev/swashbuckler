'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRightIcon, TagIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useTags } from '../hooks/useTags'
import { useDataClient } from '@/shared/lib/data'
import type { ObjectTag } from '@/shared/lib/data'
import { subscribe } from '@/shared/lib/data/events'

export function TagsSection() {
  const { tags, isLoading } = useTags()
  const dataClient = useDataClient()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-collapsed-tags') === 'true'
  })
  const [tagCounts, setTagCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed-tags', String(collapsed))
  }, [collapsed])

  // Fetch tag counts
  useEffect(() => {
    if (tags.length === 0) return

    async function fetchCounts() {
      // For local mode, we need to count object_tags per tag
      // For both modes, use getObjectsByTag and count results
      const counts = new Map<string, number>()
      for (const tag of tags) {
        const result = await dataClient.tags.getObjectsByTag(tag.id)
        counts.set(tag.id, result.data.length)
      }
      setTagCounts(counts)
    }

    fetchCounts()

    const unsubscribe = subscribe('tags', fetchCounts)
    return () => unsubscribe()
  }, [tags, dataClient])

  if (isLoading || tags.length === 0) return null

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
            <TagIcon className="size-3" />
            <span>Tags</span>
            <span className="ml-1 text-muted-foreground/60">{tags.length}</span>
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="pl-8">
          {tags.map(tag => (
            <Link
              key={tag.id}
              href={`/tags/${encodeURIComponent(tag.name)}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
