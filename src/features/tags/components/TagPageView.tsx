'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TagIcon, TrashIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useTags } from '../hooks/useTags'
import { TAG_COLORS } from './TagPicker'
import { useDataClient } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { ObjectItem } from '@/features/objects/components/ObjectItem'
import { useObjectTypes } from '@/features/object-types'
import { Button } from '@/shared/components/ui/Button'

interface TagPageViewProps {
  name: string
}

export function TagPageView({ name }: TagPageViewProps) {
  const router = useRouter()
  const dataClient = useDataClient()
  const { tags, remove, update } = useTags()
  const { types } = useObjectTypes()
  const [showColors, setShowColors] = useState(false)

  const tag = tags.find(t => t.name === name)
  const typeMap = new Map(types.map(t => [t.id, t]))

  const { data: objects = [], isLoading } = useQuery({
    queryKey: queryKeys.tags.objectsByTag(tag?.id ?? ''),
    queryFn: async () => {
      const result = await dataClient.tags.getObjectsByTag(tag!.id)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!tag,
  })

  const handleDelete = async () => {
    if (!tag) return
    const confirmed = window.confirm(`Delete tag "${tag.name}"? It will be removed from all entries.`)
    if (!confirmed) return
    await remove(tag.id)
    router.push('/')
  }

  if (!tag && !isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Tag &ldquo;{name}&rdquo; not found.</p>
        <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColors(!showColors)}
              className="rounded-md p-0.5 hover:bg-muted"
              title="Change color"
            >
              <TagIcon
                className="size-5"
                style={{ color: tag?.color ?? 'var(--color-muted-foreground)' }}
              />
            </button>
            <h1
              className="text-lg font-semibold"
              style={tag?.color ? { color: tag.color } : undefined}
            >
              {name}
            </h1>
            <span className="text-sm text-muted-foreground">
              {objects.length} object{objects.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={handleDelete} title="Delete tag">
            <TrashIcon className="size-4" />
          </Button>
        </div>
        {showColors && tag && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { update(tag.id, { color: c }); setShowColors(false) }}
                className={cn(
                  'size-6 rounded-full transition-transform hover:scale-110',
                  tag.color === c && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </header>
      <main className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TagIcon className="size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No entries with this tag</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Use the tag picker on any entry to add this tag</p>
          </div>
        ) : (
          <div className="space-y-2">
            {objects.map(obj => (
              <ObjectItem
                key={obj.id}
                object={obj}
                objectType={typeMap.get(obj.type_id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
