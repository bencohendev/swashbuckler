'use client'

import { useState, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, TrashIcon, MoreHorizontalIcon, CopyIcon, SmilePlusIcon, ImageIcon, BracesIcon, LayoutTemplateIcon, MousePointerIcon } from 'lucide-react'
import type { Value } from '@udecode/plate'
import { useObject } from '../hooks/useObjects'
import { useObjectType } from '@/features/object-types'
import { useTemplates, SaveAsTemplateDialog, ApplyTemplateDialog } from '@/features/templates'
import { extractMentionIds, LinkedObjects } from '@/features/relations'
import { useDataClient, useStorageMode, useAuth } from '@/shared/lib/data'
import { useEditorStore } from '@/features/editor/store'
import { useRecentAccess } from '@/shared/stores/recentAccess'
import { useCurrentSpace } from '@/shared/lib/data/SpaceProvider'
import { createClient } from '@/shared/lib/supabase/client'
import { emit } from '@/shared/lib/data/events'
import { useSpacePermission, useExclusionFilter, useSpaceShares } from '@/features/sharing'
import { useCollaboration, useMousePresence, useMouseCursorPreference, CollaboratorAvatars, ConnectionStatus, RemoteMouseCursors } from '@/features/collaboration'
import { applyTemplateContent, mergeProperties } from '@/features/templates/lib/applyTemplate'
import {
  resolveContentVariables,
  resolvePropertyVariables,
  type VariableResolutionContext,
} from '@/features/templates/lib/variables'
import { EmojiPicker } from '@/shared/components/LazyEmojiPicker'
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
import { Editor, type EditorHandle } from '@/features/editor/components/Editor'
import { EditorErrorBoundary } from '@/features/editor/components/EditorErrorBoundary'
import { stripPrivateContent } from '@/features/editor/lib/stripPrivateContent'
import { TagPicker } from '@/features/tags'
import { PinButton } from '@/features/pins'
import { PropertyFields } from './PropertyFields'
import { CoverImage } from './CoverImage'

const SAVE_DEBOUNCE_MS = 500

/** Returns a debounced save function. The latest value always wins. */
function useDebouncedSave<T>(
  saveFn: MutableRefObject<((value: T) => Promise<unknown>) | null>,
  delay = SAVE_DEBOUNCE_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<T | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (latestRef.current !== null && saveFn.current) {
      saveFn.current(latestRef.current)
      latestRef.current = null
    }
  }, [saveFn])

  const schedule = useCallback((value: T) => {
    latestRef.current = value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, delay)
  }, [flush, delay])

  // Flush on unmount so pending changes aren't lost
  useEffect(() => () => flush(), [flush])

  return { schedule, flush }
}

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
  const editorRef = useRef<EditorHandle>(null)
  const dataClient = useDataClient()
  const storageMode = useStorageMode()
  const { user } = useAuth()
  const { space, sharedPermission } = useCurrentSpace()
  const supabase = useMemo(() => createClient(), [])
  const { object, isLoading: isObjectLoading, error, update, remove, archive } = useObject(id)
  const { objectType, isLoading: isTypeLoading } = useObjectType(object?.type_id ?? null)
  const { templates, saveObjectAsTemplate, getTemplateVariables } = useTemplates()
  const { canEdit, isOwner } = useSpacePermission()
  const { filterFields, isTypeExcluded, isObjectExcluded } = useExclusionFilter()
  const { shares } = useSpaceShares(space?.id ?? null)
  const { isDirty: editorDirty, isSaving: editorSaving, lastSaved: editorLastSaved } = useEditorStore()

  // Unified loading: wait for both the object and its type before rendering content.
  // This prevents staggered content jumps (title → properties → content).
  const isLoading = isObjectLoading || (!!object?.type_id && isTypeLoading)

  const [title, setTitle] = useState(() => (!autoFocus && object?.title) ? object.title : '')
  const [isTitleSaving, setIsTitleSaving] = useState(false)
  const [isTemplateMode, setIsTemplateMode] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false)
  const [contentVersion, setContentVersion] = useState(0)
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false)

  // Collaborative mode: authenticated user with edit permission on a shared space.
  // For owners: shared if they've created shares. For recipients: shared if sharedPermission is set.
  const isSharedSpace = isOwner ? shares.length > 0 : sharedPermission !== null
  const isCollaborative = storageMode === 'supabase' && canEdit && isSharedSpace

  const { showMouseCursors, toggleMouseCursors } = useMouseCursorPreference()

  const collaborationOptions = useCollaboration({
    spaceId: space?.id ?? '',
    documentId: id,
    supabase,
    userId: user?.id ?? '',
    userName: user?.email?.split('@')[0] ?? 'Anonymous',
    avatarUrl: user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture,
    enabled: isCollaborative,
  })

  useMousePresence({
    containerRef: mainRef,
    awareness: collaborationOptions?.awareness ?? null,
    enabled: isCollaborative && !!collaborationOptions && showMouseCursors,
  })

  // Track access for recent-entries ordering
  const trackAccess = useRecentAccess((s) => s.trackAccess)
  useEffect(() => {
    trackAccess(id)
  }, [id, trackAccess])

  // Sync title from query data (initial load, navigation, or remote changes).
  // For new entries (autoFocus), keep title empty so placeholder shows the generated name.
  // Track whether the user is actively editing to avoid overwriting mid-keystroke.
  const isTitleFocusedRef = useRef(false)
  useEffect(() => {
    if (object && !autoFocus && !isTitleFocusedRef.current) {
      setTitle(object.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync on id/title change, not every object ref
  }, [object?.id, object?.title, autoFocus])

  // Auto-focus title for newly created entries
  // Uses requestAnimationFrame to ensure focus happens after dialog layout/animation
  useEffect(() => {
    if (autoFocus && object && titleRef.current) {
      const el = titleRef.current
      requestAnimationFrame(() => el.focus())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on initial load
  }, [object?.id])

  // Debounced title persistence — local state updates instantly, DB writes are batched
  const titleSaveFnRef = useRef<((value: string) => Promise<unknown>) | null>(null)
  titleSaveFnRef.current = async (newTitle: string) => {
    setIsTitleSaving(true)
    await update({ title: newTitle })
    setIsTitleSaving(false)
  }
  const { schedule: scheduleTitleSave } = useDebouncedSave(titleSaveFnRef)

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
    if (!newTitle) return // Don't persist empty — DB keeps generated name
    scheduleTitleSave(newTitle)
  }, [scheduleTitleSave])

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

  // Debounced property persistence — accumulates changes, flushes to DB
  const pendingPropertiesRef = useRef<Record<string, unknown> | null>(null)
  const propSaveFnRef = useRef<((value: Record<string, unknown>) => Promise<unknown>) | null>(null)
  propSaveFnRef.current = async (props: Record<string, unknown>) => {
    await update({ properties: props })
    pendingPropertiesRef.current = null
  }
  const { schedule: schedulePropSave } = useDebouncedSave(propSaveFnRef)

  const handlePropertyChange = useCallback((fieldId: string, value: unknown) => {
    if (!object) return
    // Merge with any already-pending changes so rapid edits to different fields
    // don't overwrite each other
    const base = pendingPropertiesRef.current ?? object.properties
    const updatedProperties = { ...base, [fieldId]: value }
    pendingPropertiesRef.current = updatedProperties
    schedulePropSave(updatedProperties)
  }, [object, schedulePropSave])

  const handleCoverChange = useCallback(async (url: string | null) => {
    await update({ cover_image: url })
  }, [update])

  const handleArchive = async () => {
    await archive()
    toast({ description: 'Archived', variant: 'info' })
    if (onNavigateAway) {
      onNavigateAway()
    } else {
      router.push('/dashboard')
    }
  }

  const handleDelete = async () => {
    await remove()
    toast({ description: 'Moved to trash', variant: 'info' })
    if (onDelete) {
      onDelete()
    } else {
      router.push('/dashboard')
    }
  }

  const handleSaveAsTemplate = () => {
    if (!object) return
    setIsTemplateDialogOpen(true)
  }

  const handleTemplateDialogSave = useCallback(async (name: string): Promise<boolean> => {
    if (!object) return false
    const result = await saveObjectAsTemplate(object, name)
    if (result) {
      toast({ description: `Template "${name}" saved`, variant: 'success' })
      return true
    }
    return false
  }, [object, saveObjectAsTemplate])

  const handleApplyTemplate = useCallback(async (templateId: string, contentMode: 'replace' | 'prepend') => {
    if (!object) return
    const varInfo = await getTemplateVariables(templateId)
    if (!varInfo) {
      toast({ description: 'Failed to load template', variant: 'destructive' })
      return
    }
    const { template, hasVariables } = varInfo

    // Resolve variables if template has any
    const context: VariableResolutionContext = {
      userName: user?.email?.split('@')[0] ?? null,
      spaceName: space?.name ?? null,
    }
    const resolvedContent = hasVariables && template.content
      ? resolveContentVariables(template.content, context, {})
      : template.content
    const resolvedProperties = hasVariables && template.properties
      ? resolvePropertyVariables(template.properties, context, {})
      : template.properties

    // Merge content
    const newContent = applyTemplateContent(resolvedContent, object.content, contentMode)

    // Merge properties — fill empty fields from template
    const newProperties = resolvedProperties
      ? mergeProperties(resolvedProperties, object.properties)
      : object.properties

    // Apply icon/cover only if entry has none
    const metadataUpdates: Record<string, unknown> = {
      properties: newProperties,
    }
    if (!object.icon && template.icon) metadataUpdates.icon = template.icon
    if (!object.cover_image && template.cover_image) metadataUpdates.cover_image = template.cover_image

    if (isCollaborative && editorRef.current) {
      // In collaborative mode, apply content through Slate transforms so changes
      // flow through the Y.Doc to all connected peers. Metadata is saved directly.
      editorRef.current.applyContent(newContent, contentMode)
      await update(metadataUpdates)
    } else {
      // Solo mode: save everything to DB and re-mount the editor
      await update({ ...metadataUpdates, content: newContent })
      setContentVersion(v => v + 1)
    }
    toast({ description: 'Template applied', variant: 'success' })
  }, [object, getTemplateVariables, update, user, space, isCollaborative])

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
        <main className="flex-1 overflow-auto p-4 md:pl-16 md:pr-6 md:py-6">
          <div className="mx-auto max-w-[1024px]">
            <div className="h-9 w-2/3 rounded bg-muted" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-4/6 rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !object) {
    return (
      <div className="p-6" role="alert" aria-live="assertive">
        <p className="text-destructive">{error || 'Entry not found'}</p>
        <Button variant="outline" onClick={onNavigateAway ?? (() => router.push('/dashboard'))} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  if (isTypeExcluded(object.type_id) || isObjectExcluded(object.id)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">This content is not available.</p>
        <Button variant="outline" onClick={onNavigateAway ?? (() => router.push('/dashboard'))} className="mt-4">
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
            <>
              <Button
                size="icon-sm"
                variant={showMouseCursors ? 'ghost' : 'outline'}
                onClick={toggleMouseCursors}
                title={showMouseCursors ? 'Hide collaborator cursors' : 'Show collaborator cursors'}
                aria-label={showMouseCursors ? 'Hide collaborator cursors' : 'Show collaborator cursors'}
                aria-pressed={showMouseCursors}
              >
                <MousePointerIcon className={`size-4 ${showMouseCursors ? '' : 'text-muted-foreground'}`} />
              </Button>
              <CollaboratorAvatars awareness={collaborationOptions.awareness} />
            </>
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
                  <DropdownMenuItem onClick={() => setIsApplyTemplateOpen(true)}>
                    <LayoutTemplateIcon className="size-4" />
                    Apply Template
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

      <main ref={mainRef} className="flex-1 overflow-auto p-4 md:pl-16 md:pr-6 md:py-6">
        <div className="relative mx-auto max-w-[1024px]">
          {collaborationOptions && showMouseCursors && (
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
            onFocus={() => { isTitleFocusedRef.current = true }}
            onBlur={() => { isTitleFocusedRef.current = false }}
            placeholder={autoFocus && !title && object?.title ? object.title : 'Untitled'}
            readOnly={!canEdit}
            className={`mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground${!canEdit ? ' cursor-default' : ''}`}
          />

          {objectType && objectType.fields.length > 0 && (
            <div>
              <PropertyFields
                fields={objectType ? filterFields(objectType.id, objectType.fields) : []}
                values={object.properties}
                onChange={handlePropertyChange}
                readOnly={!canEdit}
              />
            </div>
          )}

          <TagPicker objectId={id} readOnly={!canEdit} />

          <div data-tour="editor-area">
            <EditorErrorBoundary onReset={() => setContentVersion(v => v + 1)}>
              <Editor
                key={`${id}-${contentVersion}`}
                ref={editorRef}
                initialContent={editorContent}
                onSave={handleContentSave}
                placeholder="Start writing..."
                readOnly={!canEdit}
                isTemplateMode={isTemplateMode}
                isOwner={isOwner}
                collaborationOptions={collaborationOptions}
              />
            </EditorErrorBoundary>
          </div>

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
      <ApplyTemplateDialog
        open={isApplyTemplateOpen}
        onOpenChange={setIsApplyTemplateOpen}
        typeId={object.type_id}
        onApply={handleApplyTemplate}
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
