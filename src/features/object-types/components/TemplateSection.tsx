'use client'

import { useState, useRef, useEffect } from 'react'
import { PencilIcon, TrashIcon } from 'lucide-react'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import type { Template } from '@/shared/lib/data'

interface TemplateSectionProps {
  typeId: string
}

interface TemplateRowProps {
  template: Template
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function TemplateRow({ template, onRename, onDelete }: TemplateRowProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  const startEditing = () => {
    setEditName(template.name)
    setEditing(true)
  }

  const commitRename = async () => {
    setEditing(false)
    const trimmed = editName.trim()
    if (!trimmed || trimmed === template.name) return
    await onRename(template.id, trimmed)
    toast({ description: `Template renamed to "${trimmed}"`, variant: 'success' })
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditName(template.name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const handleDelete = async () => {
    await onDelete(template.id)
    toast({ description: `Template "${template.name}" deleted`, variant: 'success' })
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          aria-label="Template name"
          className="min-w-0 flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
          aria-label={`Rename template "${template.name}"`}
        >
          {template.name}
        </button>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={startEditing}
          aria-label={`Rename template "${template.name}"`}
        >
          <PencilIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDeleteOpen(true)}
          aria-label={`Delete template "${template.name}"`}
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete template"
        description={`Permanently delete template "${template.name}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

export function TemplateSection({ typeId }: TemplateSectionProps) {
  const { templates, isLoading, deleteTemplate, renameTemplate } = useTemplates({ typeId })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Templates</div>
        {[1, 2].map(i => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Templates</span>
        {templates.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {templates.length}
          </span>
        )}
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates for this type.</p>
      ) : (
        <div className="space-y-1.5">
          {templates.map(template => (
            <TemplateRow
              key={template.id}
              template={template}
              onRename={renameTemplate}
              onDelete={deleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
