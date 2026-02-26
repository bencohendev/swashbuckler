'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, SmilePlusIcon, ImageIcon } from 'lucide-react'
import type { Value } from '@udecode/plate'
import { useTemplate } from '../hooks/useTemplate'
import { useObjectType } from '@/features/object-types'
import { useEditorStore } from '@/features/editor/store'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { Button } from '@/shared/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { toast } from '@/shared/hooks/useToast'
import { Editor } from '@/features/editor'
import { PropertyFields } from '@/features/objects/components/PropertyFields'
import { CoverImage } from '@/features/objects/components/CoverImage'

interface TemplateEditorProps {
  id: string
}

export function TemplateEditor({ id }: TemplateEditorProps) {
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)
  const { template, isLoading, error, update } = useTemplate(id)
  const { objectType } = useObjectType(template?.type_id ?? null)
  const { isDirty: editorDirty, isSaving: editorSaving, lastSaved: editorLastSaved } = useEditorStore()
  const [title, setTitle] = useState('')
  const [isTitleSaving, setIsTitleSaving] = useState(false)

  // Sync title when template loads
  useEffect(() => {
    if (template) {
      setTitle(template.name)
    }
  }, [template?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- only sync on id change

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setTitle(newTitle)
    if (!newTitle.trim()) return

    setIsTitleSaving(true)
    await update({ name: newTitle.trim() })
    setIsTitleSaving(false)
  }, [update])

  const handleContentSave = useCallback(async (content: Value) => {
    const result = await update({ content })
    if (!result) throw new Error('Failed to save template content')
  }, [update])

  const handleIconChange = useCallback(async (emoji: string) => {
    await update({ icon: emoji })
  }, [update])

  const handlePropertyChange = useCallback(async (fieldId: string, value: unknown) => {
    if (!template) return
    const updatedProperties = { ...template.properties, [fieldId]: value }
    await update({ properties: updatedProperties })
  }, [template, update])

  const handleCoverChange = useCallback(async (url: string | null) => {
    await update({ cover_image: url })
  }, [update])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col animate-pulse" role="status" aria-label="Loading template" aria-busy="true">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="h-9 w-2/3 rounded bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || 'Template not found'}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <EmojiPicker value={template.icon ?? ''} onChange={handleIconChange}>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-2xl transition-colors hover:bg-muted"
              title="Change icon"
              aria-label="Change icon"
            >
              {template.icon ?? <SmilePlusIcon className="size-5 text-muted-foreground" />}
            </button>
          </EmojiPicker>
          <span className="text-sm text-muted-foreground">{objectType?.name ?? 'Entry'}</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Template
          </span>
          <span role="status" aria-live="polite" className={`text-xs font-medium ${editorDirty ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {isTitleSaving || editorSaving ? 'Saving...' : editorDirty ? 'Unsaved changes' : editorLastSaved ? `Saved ${editorLastSaved.toLocaleTimeString()}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!template.cover_image && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" title="More options" aria-label="More options">
                  <ImageIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                        toast({ description: 'Failed to upload cover image', variant: 'destructive' })
                      }
                    }
                  }
                  input.click()
                }}>
                  <ImageIcon className="size-4" />
                  Add cover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Template mode — variable insertion enabled
        </div>
        <CoverImage
          coverImage={template.cover_image}
          onChange={handleCoverChange}
        />
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Template name"
          className="mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
        />

        {objectType && objectType.fields.length > 0 && (
          <PropertyFields
            fields={objectType.fields}
            values={template.properties}
            onChange={handlePropertyChange}
          />
        )}

        <Editor
          key={id}
          initialContent={template.content ?? undefined}
          onSave={handleContentSave}
          placeholder="Start writing template content..."
          isTemplateMode
          isOwner
        />
      </main>
    </div>
  )
}
