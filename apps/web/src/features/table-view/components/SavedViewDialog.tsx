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

interface SavedViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, isDefault: boolean) => Promise<void>
  initialName?: string
  initialIsDefault?: boolean
  title?: string
}

export function SavedViewDialog({
  open,
  onOpenChange,
  onSave,
  initialName = '',
  initialIsDefault = false,
  title = 'Save View',
}: SavedViewDialogProps) {
  const [name, setName] = useState(initialName)
  const [isDefault, setIsDefault] = useState(initialIsDefault)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setIsDefault(initialIsDefault)
      setError(null)
    }
  }, [open, initialName, initialIsDefault])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), isDefault)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Save the current filter, sort, and view settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              placeholder="My view"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-3.5"
            />
            Set as default view
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
