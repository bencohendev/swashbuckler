'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useTags } from '../hooks/useTags'
import { useObjectTags } from '../hooks/useTags'
import { TagBadge } from './TagBadge'

interface TagPickerProps {
  objectId: string
  readOnly?: boolean
}

export function TagPicker({ objectId, readOnly }: TagPickerProps) {
  const { tags: allTags, create } = useTags()
  const { tags: objectTags, addTag, removeTag } = useObjectTags(objectId)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const objectTagIds = new Set(objectTags.map(t => t.id))
  const lowerSearch = search.toLowerCase()
  const availableTags = allTags.filter(
    t => !objectTagIds.has(t.id) && t.name.toLowerCase().includes(lowerSearch)
  )
  const exactMatch = allTags.some(t => t.name.toLowerCase() === lowerSearch)

  const handleCreateAndAdd = async () => {
    if (!search.trim()) return
    const tag = await create({ name: search.trim() })
    if (tag) {
      await addTag(tag.id)
      setSearch('')
    }
  }

  const handleAddExisting = async (tagId: string) => {
    await addTag(tagId)
  }

  if (objectTags.length === 0 && readOnly) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {objectTags.map(tag => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          onRemove={readOnly ? undefined : () => removeTag(tag.id)}
        />
      ))}
      {!readOnly && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              <PlusIcon className="size-3" />
              Tag
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={4}
              className="z-50 w-56 rounded-lg border bg-popover p-2 shadow-md"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or create..."
                autoFocus
                className="mb-2 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim() && !exactMatch) {
                    handleCreateAndAdd()
                  }
                }}
              />
              <div className="max-h-40 overflow-y-auto">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddExisting(tag.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <TagBadge name={tag.name} color={tag.color} />
                  </button>
                ))}
                {search.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={handleCreateAndAdd}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                  >
                    Create &ldquo;{search.trim()}&rdquo;
                  </button>
                )}
                {availableTags.length === 0 && !search.trim() && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    No tags yet. Type to create one.
                  </p>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  )
}
