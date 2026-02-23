'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'

interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName: string
  existingNames: string[]
  onSave: (name: string) => Promise<boolean>
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  defaultName,
  existingNames,
  onSave,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(defaultName)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens, auto-incrementing if default name is taken
  useEffect(() => {
    if (open) {
      const lowerNames = new Set(existingNames.map((n) => n.toLowerCase()))
      let candidate = defaultName
      let i = 2
      while (lowerNames.has(candidate.toLowerCase())) {
        candidate = `${defaultName} ${i}`
        i++
      }
      setName(candidate) // eslint-disable-line react-hooks/set-state-in-effect -- reset on dialog open
      setIsSaving(false)
      setError(null)
    }
  }, [open, defaultName, existingNames])

  const trimmed = name.trim()
  const isDuplicate = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  )
  const isValid = trimmed.length > 0 && !isDuplicate && !isSaving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSaving(true)
    setError(null)
    const success = await onSave(trimmed)
    if (success) {
      onOpenChange(false)
    } else {
      setError('Failed to save template. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Choose a name for your template.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              placeholder="Template name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            {isDuplicate && (
              <p className="text-sm text-destructive">
                A template with this name already exists.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
