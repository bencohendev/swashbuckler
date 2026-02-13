'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/Dialog'

interface VariablePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variableNames: string[]
  onSubmit: (values: Record<string, string>) => void
}

export function VariablePromptDialog({
  open,
  onOpenChange,
  variableNames,
  onSubmit,
}: VariablePromptDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variableNames.map(name => [name, '']))
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fill in template variables</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {variableNames.map(name => (
            <div key={name}>
              <label htmlFor={`var-${name}`} className="mb-1 block text-sm font-medium">
                {name}
              </label>
              <input
                id={`var-${name}`}
                type="text"
                value={values[name] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [name]: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoFocus={name === variableNames[0]}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
