'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileIcon, FileTextIcon, TrashIcon, EditIcon, MoreHorizontalIcon } from 'lucide-react'
import { useTemplates } from '../hooks/useTemplates'
import { Button } from '@/shared/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import type { DataObject } from '@/shared/lib/data'

interface TemplateCardProps {
  template: DataObject
  onEdit: (id: string) => void
  onDelete: (id: string, permanent?: boolean) => Promise<void>
  onUnmark: (id: string) => Promise<void>
}

function TemplateCard({ template, onEdit, onDelete, onUnmark }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (permanent: boolean) => {
    const action = permanent ? 'permanently delete' : 'move to trash'
    const confirmed = window.confirm(`Are you sure you want to ${action} this template?`)
    if (!confirmed) return

    setIsDeleting(true)
    await onDelete(template.id, permanent)
    setIsDeleting(false)
  }

  const handleUnmark = async () => {
    const confirmed = window.confirm('Remove template status? This will turn it into a regular object.')
    if (!confirmed) return

    await onUnmark(template.id)
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        {template.type === 'page' ? (
          <FileIcon className="size-5 text-muted-foreground" />
        ) : (
          <FileTextIcon className="size-5 text-muted-foreground" />
        )}
        <div>
          <h3 className="font-medium">{template.title}</h3>
          <p className="text-sm text-muted-foreground capitalize">{template.type}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(template.id)}
        >
          <EditIcon className="size-4" />
          Edit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" disabled={isDeleting}>
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleUnmark}>
              Remove Template Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(false)}>
              <TrashIcon className="size-4" />
              Move to Trash
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(true)}>
              <TrashIcon className="size-4" />
              Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function TemplateList() {
  const router = useRouter()
  const { templates, isLoading, error, deleteTemplate, unmarkAsTemplate } = useTemplates()

  const handleEdit = (id: string) => {
    router.push(`/objects/${id}`)
  }

  const handleDelete = async (id: string, permanent = false) => {
    await deleteTemplate(id, permanent)
  }

  const handleUnmark = async (id: string) => {
    await unmarkAsTemplate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No templates yet. You can save any object as a template from its editor.
        </p>
      </div>
    )
  }

  const pageTemplates = templates.filter(t => t.type === 'page')
  const noteTemplates = templates.filter(t => t.type === 'note')

  return (
    <div className="space-y-6">
      {pageTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Page Templates</h3>
          {pageTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUnmark={handleUnmark}
            />
          ))}
        </div>
      )}

      {noteTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Note Templates</h3>
          {noteTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUnmark={handleUnmark}
            />
          ))}
        </div>
      )}
    </div>
  )
}
