'use client'

import { useState, useEffect } from 'react'
import { CopyIcon } from 'lucide-react'
import type { Template } from '@/shared/lib/data'
import { Button } from '@/shared/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { useTemplates } from '../hooks/useTemplates'

type ContentMode = 'replace' | 'prepend'

interface ApplyTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  typeId: string
  onApply: (templateId: string, contentMode: ContentMode) => Promise<void>
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  typeId,
  onApply,
}: ApplyTemplateDialogProps) {
  const { templates, isLoading } = useTemplates({ typeId })
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [contentMode, setContentMode] = useState<ContentMode>('replace')
  const [isApplying, setIsApplying] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedTemplate(null)
      setContentMode('replace')
      setIsApplying(false)
    }
  }, [open])

  const handleSelect = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleBack = () => {
    setSelectedTemplate(null)
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return
    setIsApplying(true)
    try {
      await onApply(selectedTemplate.id, contentMode)
      onOpenChange(false)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {!selectedTemplate ? (
          <>
            <DialogHeader>
              <DialogTitle>Apply Template</DialogTitle>
              <DialogDescription>Choose a template to apply to this entry.</DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No templates for this type yet. Save an entry as a template first.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto py-2" role="listbox" aria-label="Templates">
                {templates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => handleSelect(template)}
                  >
                    <CopyIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{template.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleApply}>
            <DialogHeader>
              <DialogTitle>Apply &ldquo;{selectedTemplate.name}&rdquo;</DialogTitle>
              <DialogDescription>Choose how to apply the template content.</DialogDescription>
            </DialogHeader>

            <fieldset className="space-y-2 py-4" disabled={isApplying}>
              <legend className="sr-only">Content mode</legend>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  contentMode === 'replace' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="contentMode"
                  value="replace"
                  checked={contentMode === 'replace'}
                  onChange={() => setContentMode('replace')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Replace</div>
                  <div className="text-xs text-muted-foreground">
                    Replace existing content with the template
                  </div>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  contentMode === 'prepend' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="contentMode"
                  value="prepend"
                  checked={contentMode === 'prepend'}
                  onChange={() => setContentMode('prepend')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Keep existing below</div>
                  <div className="text-xs text-muted-foreground">
                    Template content first, then your existing content
                  </div>
                </div>
              </label>
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleBack} disabled={isApplying}>
                Back
              </Button>
              <Button type="submit" disabled={isApplying}>
                {isApplying ? 'Applying...' : 'Apply'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
