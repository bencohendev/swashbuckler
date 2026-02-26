'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileEditIcon, TrashIcon, MoreHorizontalIcon } from 'lucide-react'
import { useTemplates } from '../hooks/useTemplates'
import { useObjectTypes } from '@/features/object-types'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import type { Template, ObjectType } from '@/shared/lib/data'

interface TemplateCardProps {
  template: Template
  objectType?: ObjectType
  onEdit: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

function TemplateCard({ template, objectType, onEdit, onDelete }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(template.id)
    setIsDeleting(false)
    toast({ description: `Template "${template.name}" deleted`, variant: 'success' })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        {objectType ? (
          <TypeIcon icon={objectType.icon} className="size-5 text-muted-foreground" />
        ) : (
          <TypeIcon icon="file" className="size-5 text-muted-foreground" />
        )}
        <div>
          <h3 className="font-medium">{template.name}</h3>
          <p className="text-sm text-muted-foreground">{objectType?.name ?? 'Entry'}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" loading={isDeleting}>
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(template.id)}>
            <FileEditIcon className="size-4" />
            Edit Template
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            <TrashIcon className="size-4" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

export function TemplateList() {
  const router = useRouter()
  const { templates, isLoading, error, deleteTemplate } = useTemplates()
  const { types } = useObjectTypes()

  const handleDelete = async (id: string) => {
    await deleteTemplate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-lg" />
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

  // Group templates by type
  const typeMap = new Map(types.map(t => [t.id, t]))
  const templatesByType = new Map<string, Template[]>()
  for (const template of templates) {
    const existing = templatesByType.get(template.type_id) ?? []
    existing.push(template)
    templatesByType.set(template.type_id, existing)
  }

  return (
    <div className="space-y-6">
      {types.map(type => {
        const typeTemplates = templatesByType.get(type.id)
        if (!typeTemplates || typeTemplates.length === 0) return null

        return (
          <div key={type.id} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {type.plural_name} Templates
            </h3>
            {typeTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                objectType={typeMap.get(template.type_id)}
                onEdit={(id) => router.push(`/templates/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
