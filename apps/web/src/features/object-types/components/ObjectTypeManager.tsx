'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PlusIcon, EditIcon, TrashIcon, ArchiveIcon } from 'lucide-react'
import { useObjectTypes } from '../hooks/useObjectTypes'
import { TypeIcon } from './TypeIcon'
import { ObjectTypeForm } from './ObjectTypeForm'
import { GlobalTypeImporter } from '@/features/global-types/components/GlobalTypeImporter'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import { useAuth } from '@/shared/lib/data'
import type { ObjectType, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

export function ObjectTypeManager() {
  const { types, isLoading, error, create, update, remove, archive } = useObjectTypes()
  const { isGuest } = useAuth()
  const searchParams = useSearchParams()
  const [editingType, setEditingType] = useState<ObjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDeleteType, setPendingDeleteType] = useState<ObjectType | null>(null)
  const [pendingArchiveType, setPendingArchiveType] = useState<ObjectType | null>(null)

  // Auto-open edit form when ?edit=<typeId> is in the URL
  const editTypeId = searchParams.get('edit')
  useEffect(() => {
    if (editTypeId && types.length > 0) {
      const type = types.find(t => t.id === editTypeId)
      if (type) setEditingType(type) // eslint-disable-line react-hooks/set-state-in-effect -- sync from URL param
    }
  }, [editTypeId, types])

  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const handleCreate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    setCreateError(null)
    const result = await create(input as CreateObjectTypeInput)
    if (result.error) {
      setCreateError(result.error)
      return
    }
    setIsCreating(false)
  }

  const handleUpdate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    if (!editingType) return
    setEditError(null)
    const result = await update(editingType.id, input as UpdateObjectTypeInput)
    if (result.error) {
      setEditError(result.error)
      return
    }
    setEditingType(null)
  }

  const handleDelete = async () => {
    if (!pendingDeleteType) return
    const typeName = pendingDeleteType.name
    const error = await remove(pendingDeleteType.id)
    setPendingDeleteType(null)
    if (error) {
      toast({ description: `Failed to delete type: ${error}`, variant: 'destructive' })
    } else {
      toast({ description: `Type "${typeName}" deleted`, variant: 'success' })
    }
  }

  const handleArchive = async () => {
    if (!pendingArchiveType) return
    const typeName = pendingArchiveType.name
    const error = await archive(pendingArchiveType.id)
    setPendingArchiveType(null)
    if (error) {
      toast({ description: `Failed to archive type: ${error}`, variant: 'destructive' })
    } else {
      toast({ description: `Type "${typeName}" archived`, variant: 'success' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
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

  if (isCreating) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Create New Type</h2>
        <ObjectTypeForm
          onSave={handleCreate}
          onCancel={() => { setIsCreating(false); setCreateError(null) }}
          error={createError}
        />
      </div>
    )
  }

  if (editingType) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Edit {editingType.name}</h2>
        <ObjectTypeForm
          objectType={editingType}
          onSave={handleUpdate}
          onCancel={() => { setEditingType(null); setEditError(null) }}
          error={editError}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {types.length} type{types.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          {!isGuest && <GlobalTypeImporter />}
          <Button onClick={() => setIsCreating(true)}>
            <PlusIcon className="size-4" />
            Create Type
          </Button>
        </div>
      </div>

      {types.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No types yet. Create one to get started.
        </p>
      ) : <div className="space-y-2">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg bg-muted"
                style={type.color ? { backgroundColor: type.color + '20', color: type.color } : undefined}
              >
                <TypeIcon icon={type.icon} className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">
                  <Link href={`/types/${type.slug}`} className="hover:underline">
                    {type.name}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {type.fields.length} field{type.fields.length !== 1 ? 's' : ''}
                  {' \u00b7 '}
                  {type.slug}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditingType(type)}
                title="Edit type"
              >
                <EditIcon className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setPendingArchiveType(type)}
                title="Archive type"
                className="text-muted-foreground hover:text-muted-foreground/80"
              >
                <ArchiveIcon className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setPendingDeleteType(type)}
                title="Delete type"
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>}
      <ConfirmDialog
        open={!!pendingArchiveType}
        onOpenChange={(open) => { if (!open) setPendingArchiveType(null) }}
        title="Archive type"
        description={`Archive "${pendingArchiveType?.name}"? It will be hidden but can be restored later.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={!!pendingDeleteType}
        onOpenChange={(open) => { if (!open) setPendingDeleteType(null) }}
        title="Delete type"
        description={`Delete "${pendingDeleteType?.name}" type? All entries and templates of this type will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
