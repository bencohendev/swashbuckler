'use client'

import { useState } from 'react'
import { PaletteIcon, PlusIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { cn } from '@/shared/lib/utils'
import { useTags } from '../hooks/useTags'
import { useObjectTags } from '../hooks/useTags'
import { TagBadge } from './TagBadge'

export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#8b5cf6', // violet
]

interface TagPickerProps {
  objectId: string
  readOnly?: boolean
}

export function TagPicker({ objectId, readOnly }: TagPickerProps) {
  const { tags: allTags, create, update } = useTags()
  const { tags: objectTags, addTag, removeTag } = useObjectTags(objectId)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [colorEditId, setColorEditId] = useState<string | null>(null)

  const objectTagIds = new Set(objectTags.map(t => t.id))
  const lowerSearch = search.toLowerCase()
  const availableTags = allTags.filter(
    t => !objectTagIds.has(t.id) && t.name.toLowerCase().includes(lowerSearch)
  )
  const exactMatch = allTags.some(t => t.name.toLowerCase() === lowerSearch)

  const handleCreateAndAdd = async () => {
    if (!search.trim()) return
    const color = TAG_COLORS[allTags.length % TAG_COLORS.length]
    const tag = await create({ name: search.trim(), color })
    if (tag) {
      await addTag(tag.id)
      setSearch('')
    }
  }

  const handleAddExisting = async (tagId: string) => {
    await addTag(tagId)
  }

  const handleColorChange = async (tagId: string, color: string) => {
    await update(tagId, { color })
    setColorEditId(null)
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
        <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setColorEditId(null) }}>
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
              <div className="max-h-48 overflow-y-auto">
                {availableTags.map(tag => (
                  <div key={tag.id}>
                    <div className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent">
                      <button
                        type="button"
                        onClick={() => handleAddExisting(tag.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                      >
                        <TagBadge name={tag.name} color={tag.color} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setColorEditId(colorEditId === tag.id ? null : tag.id)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        title="Change color"
                      >
                        <PaletteIcon className="size-3" />
                      </button>
                    </div>
                    {colorEditId === tag.id && (
                      <div className="flex flex-wrap gap-1 px-2 pb-1.5">
                        {TAG_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleColorChange(tag.id, c)}
                            className={cn(
                              'size-5 rounded-full transition-transform hover:scale-110',
                              tag.color === c && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
