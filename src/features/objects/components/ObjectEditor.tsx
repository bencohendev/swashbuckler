'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrashIcon, MoreHorizontalIcon, CopyIcon, SmilePlusIcon, ImageIcon } from 'lucide-react'
import type { Value } from '@udecode/plate'
import { useObject } from '../hooks/useObjects'
import { useObjectType } from '@/features/object-types'
import { useTemplates } from '@/features/templates'
import { extractMentionIds, LinkedObjects } from '@/features/relations'
import { useDataClient } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { useSpacePermission, useExclusionFilter } from '@/features/sharing'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { Button } from '@/shared/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { Editor } from '@/features/editor'
import { TagPicker } from '@/features/tags'
import { PinButton } from '@/features/pins'
import { PropertyFields } from './PropertyFields'
import { CoverImage } from './CoverImage'

interface ObjectEditorProps {
  id: string
  onDelete?: () => void
  onNavigateAway?: () => void
}

export function ObjectEditor({ id, onDelete, onNavigateAway }: ObjectEditorProps) {
  const router = useRouter()
  const dataClient = useDataClient()
  const { object, isLoading, error, update, remove } = useObject(id)
  const { objectType } = useObjectType(object?.type_id ?? null)
  const { saveObjectAsTemplate } = useTemplates({ enabled: false })
  const { canEdit } = useSpacePermission()
  const { filterFields, isTypeExcluded, isObjectExcluded } = useExclusionFilter()
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Sync title when object changes (e.g., on initial load or navigation)
  useEffect(() => {
    if (object) {
      setTitle(object.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync on id change
  }, [object?.id])

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setTitle(newTitle)

    // Auto-save
    setIsSaving(true)
    await update({ title: newTitle })
    setIsSaving(false)
  }, [update])

  const handleContentSave = useCallback(async (content: Value) => {
    await update({ content })

    // Sync mention relations
    const mentionIds = extractMentionIds(content)
    await dataClient.relations.syncMentions(id, mentionIds)
    emit('objectRelations')
  }, [update, dataClient, id])

  const handleIconChange = useCallback(async (emoji: string) => {
    await update({ icon: emoji })
  }, [update])

  const handlePropertyChange = useCallback(async (fieldId: string, value: unknown) => {
    if (!object) return
    const updatedProperties = { ...object.properties, [fieldId]: value }
    await update({ properties: updatedProperties })
  }, [object, update])

  const handleCoverChange = useCallback(async (url: string | null) => {
    await update({ cover_image: url })
  }, [update])

  const handleDelete = async () => {
    if (!object) return

    const confirmed = window.confirm('Move this to trash?')
    if (!confirmed) return

    await remove()
    if (onDelete) {
      onDelete()
    } else {
      router.push('/')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!object) return

    const result = await saveObjectAsTemplate(object)
    if (result) {
      alert('Saved as template!')
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-10 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
      </div>
    )
  }

  if (error || !object) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || 'Entry not found'}</p>
        <Button variant="outline" onClick={onNavigateAway ?? (() => router.push('/'))} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  if (isTypeExcluded(object.type_id) || isObjectExcluded(object.id)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">This content is not available.</p>
        <Button variant="outline" onClick={onNavigateAway ?? (() => router.push('/'))} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {canEdit ? (
            <EmojiPicker value={object.icon ?? ''} onChange={handleIconChange}>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-2xl transition-colors hover:bg-muted"
                title="Change icon"
              >
                {object.icon ?? <SmilePlusIcon className="size-5 text-muted-foreground" />}
              </button>
            </EmojiPicker>
          ) : (
            object.icon && <span className="text-2xl">{object.icon}</span>
          )}
          <span className="text-sm text-muted-foreground">{objectType?.name ?? 'Entry'}</span>
          {!canEdit && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">View only</span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <PinButton objectId={id} />
          {canEdit && (
            <>
              <Button size="icon-sm" variant="ghost" onClick={handleDelete} title="Move to trash">
                <TrashIcon className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" title="More options">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!object.cover_image && (
                    <DropdownMenuItem onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          const { uploadImage } = await import('@/shared/lib/supabase/upload')
                          try {
                            const result = await uploadImage(file, 'covers')
                            await update({ cover_image: result.url })
                          } catch {
                            // CoverImage component handles errors visually
                          }
                        }
                      }
                      input.click()
                    }}>
                      <ImageIcon className="size-4" />
                      Add cover
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSaveAsTemplate}>
                    <CopyIcon className="size-4" />
                    Save as Template
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                    <TrashIcon className="size-4" />
                    Move to Trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <CoverImage
          coverImage={object.cover_image}
          onChange={handleCoverChange}
          readOnly={!canEdit}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          readOnly={!canEdit}
          className="mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
        />

        {objectType && objectType.fields.length > 0 && (
          <PropertyFields
            fields={objectType ? filterFields(objectType.id, objectType.fields) : []}
            values={object.properties}
            onChange={handlePropertyChange}
            readOnly={!canEdit}
          />
        )}

        <TagPicker objectId={id} readOnly={!canEdit} />

        <Editor
          initialContent={object.content ?? undefined}
          onSave={handleContentSave}
          placeholder="Start writing..."
          readOnly={!canEdit}
        />

        <LinkedObjects objectId={id} readOnly={!canEdit} />
      </main>
    </div>
  )
}
