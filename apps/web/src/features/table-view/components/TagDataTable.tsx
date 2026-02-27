'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DataObjectSummary, ObjectType, Tag } from '@/shared/lib/data'
import { useObjectTagsBatch, TagBadge } from '@/features/tags'
import { SortableHeader, type SortState } from './SortableHeader'

interface TagDataTableProps {
  objects: DataObjectSummary[]
  typeMap: Map<string, ObjectType>
  emptyMessage?: string
}

const MAX_VISIBLE_TAGS = 3

function TagsCell({ tags, router }: { tags: Tag[]; router: ReturnType<typeof useRouter> }) {
  if (tags.length === 0) return null
  const visible = tags.slice(0, MAX_VISIBLE_TAGS)
  const overflow = tags.length - MAX_VISIBLE_TAGS

  return (
    <span className="flex flex-wrap items-center gap-1">
      {visible.map(tag => (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <span key={tag.id} onClick={(e) => e.stopPropagation()}>
          <TagBadge
            name={tag.name}
            color={tag.color}
            onClick={() => router.push(`/tags/${encodeURIComponent(tag.name)}`)}
          />
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground">+{overflow}</span>
      )}
    </span>
  )
}

export function TagDataTable({ objects, typeMap, emptyMessage }: TagDataTableProps) {
  const router = useRouter()
  const [sort, setSort] = useState<SortState | null>(null)

  const objectIds = useMemo(() => objects.map(o => o.id), [objects])
  const { tagsByObject } = useObjectTagsBatch(objectIds)

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      if (prev?.column === column) {
        return prev.direction === 'asc'
          ? { column, direction: 'desc' }
          : null
      }
      return { column, direction: 'asc' }
    })
  }, [])

  const sortedObjects = useMemo(() => {
    if (!sort) return objects

    return [...objects].sort((a, b) => {
      let cmp: number

      if (sort.column === 'title') {
        cmp = a.title.localeCompare(b.title)
      } else if (sort.column === 'type') {
        const aName = typeMap.get(a.type_id)?.name ?? ''
        const bName = typeMap.get(b.type_id)?.name ?? ''
        cmp = aName.localeCompare(bName)
      } else if (sort.column === 'tags') {
        const aTags = (tagsByObject[a.id] ?? []).map(t => t.name).sort().join(', ')
        const bTags = (tagsByObject[b.id] ?? []).map(t => t.name).sort().join(', ')
        if (!aTags && !bTags) cmp = 0
        else if (!aTags) cmp = 1
        else if (!bTags) cmp = -1
        else cmp = aTags.localeCompare(bTags)
      } else if (sort.column === 'updated_at') {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      } else {
        cmp = 0
      }

      return sort.direction === 'desc' ? -cmp : cmp
    })
  }, [objects, sort, tagsByObject, typeMap])

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">Tagged objects</caption>
        <thead className="border-b bg-muted/50">
          <tr className="group">
            <SortableHeader
              column="title"
              label="Title"
              sort={sort}
              onSort={handleSort}
              className="min-w-[200px]"
            />
            <SortableHeader
              column="type"
              label="Type"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              column="tags"
              label="Tags"
              sort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              column="updated_at"
              label="Updated"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedObjects.map((obj) => (
            <tr
              key={obj.id}
              tabIndex={0}
              role="link"
              className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
              onClick={() => router.push(`/objects/${obj.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/objects/${obj.id}`)
                }
              }}
            >
              <td className="px-3 py-2 font-medium">
                <span className="flex items-center gap-2">
                  {obj.icon && <span>{obj.icon}</span>}
                  <span className="truncate">{obj.title}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {typeMap.get(obj.type_id)?.name ?? 'Unknown'}
              </td>
              <td className="px-3 py-2">
                <TagsCell tags={tagsByObject[obj.id] ?? []} router={router} />
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(obj.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {sortedObjects.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                {emptyMessage ?? 'No items yet'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
