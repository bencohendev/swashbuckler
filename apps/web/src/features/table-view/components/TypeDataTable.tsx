'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DataObjectSummary, ObjectType, FieldDefinition, Tag } from '@/shared/lib/data'
import { TagBadge } from '@/features/tags'
import { SortableHeader } from './SortableHeader'
import { PropertyCell } from './PropertyCell'
import type { SortConfig } from '../lib/sortObjects'

interface TypeDataTableProps {
  type: ObjectType
  objects: DataObjectSummary[]
  tagsByObject: Record<string, Tag[]>
  sort: SortConfig
  onSortChange: (sort: SortConfig) => void
}

function getFieldValue(obj: DataObjectSummary, field: FieldDefinition): unknown {
  return obj.properties?.[field.id]
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

export function TypeDataTable({ type, objects, tagsByObject, sort, onSortChange }: TypeDataTableProps) {
  const router = useRouter()

  const fields = useMemo(
    () => [...type.fields].sort((a, b) => a.sort_order - b.sort_order),
    [type.fields]
  )

  // Map SortConfig to SortState shape for SortableHeader
  const sortState = useMemo(
    () => ({ column: sort.field, direction: sort.direction }),
    [sort],
  )

  const handleSort = useCallback((column: string) => {
    if (sort.field === column) {
      if (sort.direction === 'asc') {
        onSortChange({ field: column, direction: 'desc' })
      } else {
        onSortChange({ field: 'updated_at', direction: 'desc' })
      }
    } else {
      onSortChange({ field: column, direction: 'asc' })
    }
  }, [sort, onSortChange])

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">{type.plural_name}</caption>
        <thead className="border-b bg-muted/50">
          <tr className="group">
            <SortableHeader
              column="title"
              label="Title"
              sort={sortState}
              onSort={handleSort}
              className="min-w-[200px]"
            />
            {fields.map((field) => (
              <SortableHeader
                key={field.id}
                column={field.id}
                label={field.name}
                sort={sortState}
                onSort={handleSort}
              />
            ))}
            <SortableHeader
              column="tags"
              label="Tags"
              sort={sortState}
              onSort={handleSort}
            />
            <SortableHeader
              column="updated_at"
              label="Updated"
              sort={sortState}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y">
          {objects.map((obj) => (
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
              {fields.map((field) => (
                <td key={field.id} className="px-3 py-2">
                  <PropertyCell
                    value={getFieldValue(obj, field)}
                    fieldType={field.type}
                  />
                </td>
              ))}
              <td className="px-3 py-2">
                <TagsCell tags={tagsByObject[obj.id] ?? []} router={router} />
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(obj.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {objects.length === 0 && (
            <tr>
              <td
                colSpan={fields.length + 3}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                No {type.plural_name.toLowerCase()} yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
