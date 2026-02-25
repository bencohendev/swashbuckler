'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, TrashIcon, MoreHorizontalIcon, CopyIcon, SmilePlusIcon, ImageIcon, BracesIcon } from 'lucide-react'
import type { Value } from '@udecode/plate'
import { useObject } from '../hooks/useObjects'
import { useObjectType } from '@/features/object-types'
import { useTemplates, SaveAsTemplateDialog } from '@/features/templates'
import { extractMentionIds, LinkedObjects } from '@/features/relations'
import { useDataClient, useStorageMode, useAuth } from '@/shared/lib/data'
import { useEditorStore } from '@/features/editor/store'
import { useCurrentSpace } from '@/shared/lib/data/SpaceProvider'
import { createClient } from '@/shared/lib/supabase/client'
import { emit } from '@/shared/lib/data/events'
import { useSpacePermission, useExclusionFilter, useSpaceShares } from '@/features/sharing'
import { useCollaboration, useMousePresence, CollaboratorAvatars, ConnectionStatus, RemoteMouseCursors } from '@/features/collaboration'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { Editor } from '@/features/editor'
import { stripPrivateContent } from '@/features/editor/lib/stripPrivateContent'
import { TagPicker } from '@/features/tags'
import { PinButton } from '@/features/pins'
import { PropertyFields } from './PropertyFields'
import { CoverImage } from './CoverImage'

interface ObjectEditorProps {
  id: string
  autoFocus?: boolean
  onDelete?: () => void
  onNavigateAway?: () => void
}

export function ObjectEditor({ id, autoFocus, onDelete, onNavigateAway }: ObjectEditorProps) {
  const router = useRouter()
  const mainRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dataClient = useDataClient()
  const storageMode = useStorageMode()
  const { user } = useAuth()
  const { space, sharedPermission } = useCurrentSpace()
  const supabase = useMemo(() => createClient(), [])
  const { object, isLoading, error, update, remove, archive } = useObject(id)
  const { objectType } = useObjectType(object?.type_id ?? null)
  const { templates, saveObjectAsTemplate } = useTemplates()
  const { canEdit, isOwner } = useSpacePermission()
  const { filterFields, isTypeExcluded, isObjectExcluded } = useExclusionFilter()
  const { shares } = useSpaceShares(space?.id ?? null)
  const { isDirty: editorDirty, isSaving: editorSaving, lastSaved: editorLastSaved } = useEditorStore()
  const [title, setTitle] = useState('')
  const [isTitleSaving, setIsTitleSaving] = useState(false)
  const [isTemplateMode, setIsTemplateMode] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false)

  // Collaborative mode: authenticated user with edit permission on a shared space.
  // For owners: shared if they've created shares. For recipients: shared if sharedPermission is set.
  const isSharedSpace = isOwner ? shares.length > 0 : sharedPermission !== null
  const isCollaborative = storageMode === 'supabase' && canEdit && isSharedSpace

  const collaborationOptions = useCollaboration({
    documentId: id,
    supabase,
    userId: user?.id ?? '',
    userName: user?.email?.split('@')[0] ?? 'Anonymous',
    avatarUrl: user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture,
    enabled: isCollaborative && !isLoading,
  })

  useMousePresence({
    containerRef: mainRef,
    awareness: collaborationOptions?.awareness ?? null,
    enabled: isCollaborative && !!collaborationOptions,
  })

  // Sync title when object changes (e.g., on initial load or navigation)
  // For new entries (autoFocus), keep title empty so placeholder shows the generated name
  useEffect(() => {
    if (object && !autoFocus) {
      setTitle(object.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync on id change
  }, [object?.id, autoFocus])

  // Auto-focus title for newly created entries
  useEffect(() => {
    if (autoFocus && object && titleRef.current) {
      titleRef.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on initial load
  }, [object?.id])

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setTitle(newTitle)
    if (!newTitle) return // Don't persist empty — DB keeps generated name

    // Auto-save
    setIsTitleSaving(true)
    await update({ title: newTitle })
    setIsTitleSaving(false)
  }, [update])

  const handleContentSave = useCallback(async (content: Value) => {
    const result = await update({ content })
    if (!result) throw new Error('Failed to save content')

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

  const handleArchive = async () => {
    await archive()
    toast({ description: 'Archived', variant: 'info' })
    if (onNavigateAway) {
      onNavigateAway()
    } else {
      router.push('/')
    }
  }

  const handleDelete = async () => {
    await remove()
    toast({ description: 'Moved to trash', variant: 'info' })
    if (onDelete) {
      onDelete()
    } else {
      router.push('/')
    }
  }

  const handleSaveAsTemplate = () => {
    if (!object) return
    setIsTemplateDialogOpen(true)
  }

  const handleTemplateDialogSave = useCallback(async (name: string): Promise<boolean> => {
    if (!object) return false
    const result = await saveObjectAsTemplate(object, name)
    if (result.data) {
      toast({ description: `Template "${name}" saved`, variant: 'success' })
      return true
    }
    return false
  }, [object, saveObjectAsTemplate])

  // Strip private content for view-only non-owners
  const editorContent = useMemo(() => {
    if (!isOwner && !canEdit && object?.content) {
      return stripPrivateContent(object.content)
    }
    return object?.content ?? undefined
  }, [isOwner, canEdit, object?.content])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col animate-pulse" role="status" aria-label="Loading entry" aria-busy="true">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-1">
            <div className="size-8 rounded-md bg-muted" />
            <div className="size-8 rounded-md bg-muted" />
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
      <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          {canEdit ? (
            <EmojiPicker value={object.icon ?? ''} onChange={handleIconChange}>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-2xl transition-colors hover:bg-muted"
                title="Change icon"
                aria-label="Change icon"
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
          {collaborationOptions ? (
            <ConnectionStatus provider={collaborationOptions.provider} />
          ) : (
            <span role="status" aria-live="polite" className={`text-xs font-medium ${editorDirty ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {isTitleSaving || editorSaving ? 'Saving...' : editorDirty ? 'Unsaved changes' : editorLastSaved ? `Saved ${editorLastSaved.toLocaleTimeString()}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {collaborationOptions && (
            <CollaboratorAvatars awareness={collaborationOptions.awareness} />
          )}
          <PinButton objectId={id} />
          {canEdit && (
            <>
              <Button
                size="icon-sm"
                variant={isTemplateMode ? 'default' : 'ghost'}
                onClick={() => setIsTemplateMode(prev => !prev)}
                title={isTemplateMode ? 'Exit template mode' : 'Template mode'}
                aria-label={isTemplateMode ? 'Exit template mode' : 'Template mode'}
              >
                <BracesIcon className="size-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setConfirmTrashOpen(true)} title="Move to trash" aria-label="Move to trash">
                <TrashIcon className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" title="More options" aria-label="More options">
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
                            toast({ description: 'Failed to upload cover image', variant: 'destructive' })
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
                  {!object.is_deleted && (
                    <DropdownMenuItem onClick={handleArchive}>
                      <ArchiveIcon className="size-4" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmTrashOpen(true)}>
                    <TrashIcon className="size-4" />
                    Move to Trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-auto p-4 md:p-6">
        <div className="relative">
          {collaborationOptions && (
            <RemoteMouseCursors awareness={collaborationOptions.awareness} />
          )}
          {isTemplateMode && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Template mode — variable insertion enabled
            </div>
          )}
          <CoverImage
            coverImage={object.cover_image}
            onChange={handleCoverChange}
            readOnly={!canEdit}
          />
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={autoFocus && !title && object?.title ? object.title : 'Untitled'}
            readOnly={!canEdit}
            className={`mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground${!canEdit ? ' cursor-default' : ''}`}
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
            key={id}
            initialContent={editorContent}
            onSave={handleContentSave}
            placeholder="Start writing..."
            readOnly={!canEdit}
            isTemplateMode={isTemplateMode}
            isOwner={isOwner}
            collaborationOptions={collaborationOptions}
          />

          <LinkedObjects objectId={id} readOnly={!canEdit} />
        </div>
      </main>

      <SaveAsTemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        defaultName={object.title}
        existingNames={templates.map((t) => t.name)}
        onSave={handleTemplateDialogSave}
      />
      <ConfirmDialog
        open={confirmTrashOpen}
        onOpenChange={setConfirmTrashOpen}
        title="Move to trash"
        description={`Move "${object.title}" to trash?`}
        confirmLabel="Move to trash"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
