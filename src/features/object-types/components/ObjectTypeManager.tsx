'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'
import { useObjectTypes } from '../hooks/useObjectTypes'
import { TypeIcon } from './TypeIcon'
import { ObjectTypeForm } from './ObjectTypeForm'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import type { ObjectType, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

export function ObjectTypeManager() {
  const { types, isLoading, error, create, update, remove } = useObjectTypes()
  const searchParams = useSearchParams()
  const [editingType, setEditingType] = useState<ObjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDeleteType, setPendingDeleteType] = useState<ObjectType | null>(null)

  // Auto-open edit form when ?edit=<typeId> is in the URL
  const editTypeId = searchParams.get('edit')
  useEffect(() => {
    if (editTypeId && types.length > 0) {
      const type = types.find(t => t.id === editTypeId)
      if (type) setEditingType(type) // eslint-disable-line react-hooks/set-state-in-effect -- sync from URL param
    }
  }, [editTypeId, types])

  const handleCreate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    await create(input as CreateObjectTypeInput)
    setIsCreating(false)
  }

  const handleUpdate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    if (!editingType) return
    await update(editingType.id, input as UpdateObjectTypeInput)
    setEditingType(null)
  }

  const handleDelete = async () => {
    if (!pendingDeleteType) return
    const typeName = pendingDeleteType.name
    await remove(pendingDeleteType.id)
    setPendingDeleteType(null)
    toast({ description: `Type "${typeName}" deleted`, variant: 'success' })
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
          onCancel={() => setIsCreating(false)}
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
          onCancel={() => setEditingType(null)}
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
        <Button onClick={() => setIsCreating(true)}>
          <PlusIcon className="size-4" />
          Create Type
        </Button>
      </div>

      <div className="space-y-2">
        {types.map(type => (
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
                onClick={() => setPendingDeleteType(type)}
                title="Delete type"
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!pendingDeleteType}
        onOpenChange={(open) => { if (!open) setPendingDeleteType(null) }}
        title="Delete type"
        description={`Delete "${pendingDeleteType?.name}" type? Entries of this type will not be deleted, but they will lose their type association.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
