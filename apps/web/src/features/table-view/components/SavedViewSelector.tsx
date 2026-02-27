'use client'

import { useState, useCallback } from 'react'
import {
  BookmarkIcon,
  StarIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  TrashIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/shared/components/ui/DropdownMenu'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { Button } from '@/shared/components/ui/Button'
import type { SavedView } from '@/shared/lib/data'
import type { FilterExpression } from '../lib/filterTypes'
import type { SortConfig } from '../lib/sortObjects'
import type { ViewMode } from '../stores/viewMode'
import { SavedViewDialog } from './SavedViewDialog'

interface SavedViewSelectorProps {
  typeId: string
  views: SavedView[]
  expression: FilterExpression
  sort: SortConfig
  viewMode: ViewMode
  boardGroupFieldId: string | null
  onApplyView: (
    expression: FilterExpression,
    sort: SortConfig,
    viewMode: ViewMode,
    boardGroupFieldId: string | null,
  ) => void
  onCreateView: (input: {
    name: string
    filters: FilterExpression
    sort: SortConfig
    view_mode: ViewMode
    board_group_field_id: string | null
    is_default: boolean
    type_id: string
  }) => Promise<SavedView | null>
  onUpdateView: (id: string, input: {
    name?: string
    filters?: FilterExpression
    sort?: SortConfig
    view_mode?: ViewMode
    board_group_field_id?: string | null
    is_default?: boolean
  }) => Promise<SavedView | null>
  onDeleteView: (id: string) => Promise<boolean>
}

export function SavedViewSelector({
  typeId,
  views,
  expression,
  sort,
  viewMode,
  boardGroupFieldId,
  onApplyView,
  onCreateView,
  onUpdateView,
  onDeleteView,
}: SavedViewSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [renameView, setRenameView] = useState<SavedView | null>(null)
  const [deleteView, setDeleteView] = useState<SavedView | null>(null)

  const handleApply = useCallback((view: SavedView) => {
    onApplyView(view.filters, view.sort, view.view_mode as ViewMode, view.board_group_field_id)
  }, [onApplyView])

  const handleCreate = useCallback(async (name: string, isDefault: boolean) => {
    await onCreateView({
      name,
      filters: expression,
      sort,
      view_mode: viewMode,
      board_group_field_id: boardGroupFieldId,
      is_default: isDefault,
      type_id: typeId,
    })
  }, [onCreateView, expression, sort, viewMode, boardGroupFieldId, typeId])

  const handleRename = useCallback(async (name: string, isDefault: boolean) => {
    if (!renameView) return
    await onUpdateView(renameView.id, { name, is_default: isDefault })
  }, [renameView, onUpdateView])

  const handleOverwrite = useCallback(async (view: SavedView) => {
    await onUpdateView(view.id, {
      filters: expression,
      sort,
      view_mode: viewMode,
      board_group_field_id: boardGroupFieldId,
    })
  }, [onUpdateView, expression, sort, viewMode, boardGroupFieldId])

  const handleToggleDefault = useCallback(async (view: SavedView) => {
    await onUpdateView(view.id, { is_default: !view.is_default })
  }, [onUpdateView])

  const handleDelete = useCallback(async () => {
    if (!deleteView) return
    await onDeleteView(deleteView.id)
  }, [deleteView, onDeleteView])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            aria-label="Saved views"
          >
            <BookmarkIcon className="size-4" />
            <span className="hidden sm:inline">Views</span>
            {views.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-xs font-medium">
                {views.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {views.length > 0 && (
            <>
              <DropdownMenuLabel>Saved views</DropdownMenuLabel>
              {views.map((view) => (
                <div key={view.id} className="flex items-center">
                  <DropdownMenuItem
                    className="flex-1"
                    onSelect={() => handleApply(view)}
                  >
                    <span className="flex-1 truncate">{view.name}</span>
                    {view.is_default && (
                      <StarIcon className="size-3.5 fill-current text-amber-500" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Options for ${view.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="right" className="w-48">
                      <DropdownMenuItem onSelect={() => setRenameView(view)}>
                        <PencilIcon className="size-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleOverwrite(view)}>
                        <RefreshCwIcon className="size-3.5" />
                        Update with current
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleToggleDefault(view)}>
                        <StarIcon className="size-3.5" />
                        {view.is_default ? 'Remove default' : 'Set as default'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteView(view)}
                      >
                        <TrashIcon className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <BookmarkIcon className="size-3.5" />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SavedViewDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        title="Save View"
      />

      <SavedViewDialog
        open={!!renameView}
        onOpenChange={(open) => { if (!open) setRenameView(null) }}
        onSave={handleRename}
        initialName={renameView?.name ?? ''}
        initialIsDefault={renameView?.is_default ?? false}
        title="Edit View"
      />

      <ConfirmDialog
        open={!!deleteView}
        onOpenChange={(open) => { if (!open) setDeleteView(null) }}
        title="Delete saved view"
        description={`Are you sure you want to delete "${deleteView?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
