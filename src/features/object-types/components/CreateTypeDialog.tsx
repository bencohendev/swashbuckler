'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { ObjectTypeForm } from './ObjectTypeForm'
import type { ObjectType, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

interface CreateTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateObjectTypeInput) => Promise<ObjectType | null>
}

export function CreateTypeDialog({ open, onOpenChange, onCreate }: CreateTypeDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    setError(null)
    const result = await onCreate(input as CreateObjectTypeInput)
    if (result) {
      onOpenChange(false)
    } else {
      setError('Failed to create type. Please try again.')
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Type</DialogTitle>
          <DialogDescription>
            Define a new object type with custom fields.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <ObjectTypeForm
          onSave={handleSave}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
