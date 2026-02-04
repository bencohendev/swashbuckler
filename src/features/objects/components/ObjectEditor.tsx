'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrashIcon, MoreHorizontalIcon, CopyIcon, BookmarkIcon, BookmarkMinusIcon } from 'lucide-react'
import type { Value } from '@udecode/plate'
import { useObject } from '../hooks/useObjects'
import { Button } from '@/shared/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { useDataClient } from '@/shared/lib/data'
import { Editor } from '@/features/editor'

interface ObjectEditorProps {
  id: string
}

export function ObjectEditor({ id }: ObjectEditorProps) {
  const router = useRouter()
  const dataClient = useDataClient()
  const { object, isLoading, error, update } = useObject(id)
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
  }, [update])

  const handleDelete = async () => {
    if (!object) return

    const confirmed = window.confirm('Move this to trash?')
    if (!confirmed) return

    await dataClient.objects.delete(object.id)
    router.push('/')
  }

  const handleSaveAsTemplate = async () => {
    if (!object) return

    // Create a copy of the object as a template
    const result = await dataClient.objects.create({
      title: `${object.title} (Template)`,
      type: object.type,
      icon: object.icon,
      cover_image: object.cover_image,
      properties: { ...object.properties },
      content: object.content ? JSON.parse(JSON.stringify(object.content)) : null,
      is_template: true,
    })

    if (result.data) {
      // Show a brief confirmation (could be improved with toast)
      alert('Saved as template!')
    }
  }

  const handleToggleTemplate = async () => {
    if (!object) return

    await update({ is_template: !object.is_template })
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
        <p className="text-destructive">{error || 'Object not found'}</p>
        <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {object.icon && <span className="text-2xl">{object.icon}</span>}
          <span className="text-sm text-muted-foreground capitalize">{object.type}</span>
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {object.is_template && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Template
            </span>
          )}
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
              {!object.is_template && (
                <DropdownMenuItem onClick={handleSaveAsTemplate}>
                  <CopyIcon className="size-4" />
                  Save as Template
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleToggleTemplate}>
                {object.is_template ? (
                  <>
                    <BookmarkMinusIcon className="size-4" />
                    Remove Template Status
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="size-4" />
                    Mark as Template
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <TrashIcon className="size-4" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
        />

        <Editor
          initialContent={object.content ?? undefined}
          onSave={handleContentSave}
          placeholder="Start writing..."
        />
      </main>
    </div>
  )
}
