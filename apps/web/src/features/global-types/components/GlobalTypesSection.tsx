'use client'

import { useState } from 'react'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'
import { useGlobalObjectTypes } from '../hooks/useGlobalObjectTypes'
import { ObjectTypeForm } from '@/features/object-types/components/ObjectTypeForm'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import type { ObjectType, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

export function GlobalTypesSection() {
  const { types, isLoading, error, create, update, remove } = useGlobalObjectTypes()
  const [editingType, setEditingType] = useState<ObjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDeleteType, setPendingDeleteType] = useState<ObjectType | null>(null)

  const handleCreate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    const result = await create(input as CreateObjectTypeInput)
    if (result) {
      setIsCreating(false)
      toast({ description: `Global type "${result.name}" created`, variant: 'success' })
    } else {
      toast({ description: 'Failed to create global type', variant: 'destructive' })
    }
  }

  const handleUpdate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    if (!editingType) return
    const result = await update(editingType.id, input as UpdateObjectTypeInput)
    if (result) {
      setEditingType(null)
      toast({ description: 'Global type updated', variant: 'success' })
    } else {
      toast({ description: 'Failed to update global type', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!pendingDeleteType) return
    const typeName = pendingDeleteType.name
    const ok = await remove(pendingDeleteType.id)
    setPendingDeleteType(null)
    if (ok) {
      toast({ description: `Global type "${typeName}" deleted`, variant: 'success' })
    }
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Global Types</h2>
          <p className="text-sm text-muted-foreground">
            Reusable type blueprints you can import into any space.
          </p>
        </div>
        {!isCreating && !editingType && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <PlusIcon className="size-4" />
            New
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isCreating && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Create Global Type</h3>
          <ObjectTypeForm
            isGlobal
            onSave={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      {editingType && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Edit {editingType.name}</h3>
          <ObjectTypeForm
            objectType={editingType}
            isGlobal
            onSave={handleUpdate}
            onCancel={() => setEditingType(null)}
          />
        </div>
      )}

      {!isLoading && !error && !isCreating && !editingType && (
        <>
          {types.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No global types yet. Create one to use across spaces.
            </p>
          ) : (
            <div className="space-y-2">
              {types.map(type => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg bg-muted"
                      style={type.color ? { backgroundColor: type.color + '20', color: type.color } : undefined}
                    >
                      <TypeIcon icon={type.icon} className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.fields.length} field{type.fields.length !== 1 ? 's' : ''}
                        {' · '}
                        {type.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditingType(type)}
                      title="Edit global type"
                    >
                      <EditIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setPendingDeleteType(type)}
                      title="Delete global type"
                      className="text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDeleteType}
        onOpenChange={(open) => { if (!open) setPendingDeleteType(null) }}
        title="Delete global type"
        description={`Delete "${pendingDeleteType?.name}"? Copies already imported into spaces will not be affected.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
