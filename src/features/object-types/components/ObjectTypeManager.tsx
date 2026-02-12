'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'
import { useObjectTypes } from '../hooks/useObjectTypes'
import { TypeIcon } from './TypeIcon'
import { ObjectTypeForm } from './ObjectTypeForm'
import { Button } from '@/shared/components/ui/Button'
import type { ObjectType, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

export function ObjectTypeManager() {
  const { types, isLoading, error, create, update, remove } = useObjectTypes()
  const [editingType, setEditingType] = useState<ObjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    await create(input as CreateObjectTypeInput)
    setIsCreating(false)
  }

  const handleUpdate = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    if (!editingType) return
    await update(editingType.id, input as UpdateObjectTypeInput)
    setEditingType(null)
  }

  const handleDelete = async (type: ObjectType) => {
    const confirmed = window.confirm(
      `Delete "${type.name}" type? Objects of this type will not be deleted, but they will lose their type association.`
    )
    if (!confirmed) return
    await remove(type.id)
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
                onClick={() => handleDelete(type)}
                title="Delete type"
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
