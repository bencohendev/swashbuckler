'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { ObjectTypeForm } from './ObjectTypeForm'
import type { CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

interface CreateTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateObjectTypeInput) => Promise<unknown>
}

export function CreateTypeDialog({ open, onOpenChange, onCreate }: CreateTypeDialogProps) {
  const handleSave = async (input: CreateObjectTypeInput | UpdateObjectTypeInput) => {
    await onCreate(input as CreateObjectTypeInput)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Type</DialogTitle>
          <DialogDescription>
            Define a new object type with custom fields.
          </DialogDescription>
        </DialogHeader>
        <ObjectTypeForm
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
