'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { cn } from '@/shared/lib/utils'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { useObjectModal } from '@/shared/stores/objectModal'

interface QuickCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCaptureDialog({ open, onOpenChange }: QuickCaptureDialogProps) {
  const { types } = useObjectTypes()
  const { create } = useObjects({ enabled: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0)
      setIsCreating(false)
    }
  }, [open])

  const handleSelect = useCallback(async (typeId: string, typeName: string) => {
    if (isCreating) return
    setIsCreating(true)

    const result = await create({
      title: `Untitled ${typeName}`,
      type_id: typeId,
    })

    if (result) {
      onOpenChange(false)
      useObjectModal.getState().open(result.id)
    }

    setIsCreating(false)
  }, [isCreating, create, onOpenChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, types.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && types[selectedIndex]) {
      e.preventDefault()
      handleSelect(types[selectedIndex].id, types[selectedIndex].name)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-sm"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Quick Capture</DialogTitle>
        <div className="border-b px-3 py-2.5 text-sm font-medium text-muted-foreground">
          Create new...
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {types.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No object types available
            </div>
          )}
          {types.map((type, index) => (
            <button
              key={type.id}
              data-selected={index === selectedIndex}
              onClick={() => handleSelect(type.id, type.name)}
              onMouseEnter={() => setSelectedIndex(index)}
              disabled={isCreating}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50',
                isCreating && 'opacity-50'
              )}
            >
              <TypeIcon icon={type.icon} className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{type.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
