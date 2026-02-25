'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayersIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { cn } from '@/shared/lib/utils'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { CreateTypeDialog } from '@/features/object-types'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { useSpacePermission } from '@/features/sharing'
import { useNextTitle } from '@/features/objects/hooks/useNextTitle'
import { toast } from '@/shared/hooks/useToast'
import { useObjectModal } from '@/shared/stores/objectModal'

interface QuickCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCaptureDialog({ open, onOpenChange }: QuickCaptureDialogProps) {
  const { types, create: createType } = useObjectTypes()
  const { create } = useObjects({ enabled: false })
  const { isOwner: isSpaceOwner } = useSpacePermission()
  const getNextTitle = useNextTitle()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateType, setShowCreateType] = useState(false)

  // Total items = object types + 1 for "New Type" action (owners only)
  const totalItems = types.length + (isSpaceOwner ? 1 : 0)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on dialog open
      setIsCreating(false)
    }
  }, [open])

  const handleSelect = useCallback(async (typeId: string, typeName: string) => {
    if (isCreating) return
    setIsCreating(true)

    const result = await create({
      title: getNextTitle(typeId, typeName),
      type_id: typeId,
    })

    if (result) {
      onOpenChange(false)
      useObjectModal.getState().open(result.id, { autoFocus: true })
    } else {
      toast({ description: 'Failed to create entry. You may not have permission.', variant: 'destructive' })
    }

    setIsCreating(false)
  }, [isCreating, create, getNextTitle, onOpenChange])

  const handleCreateType = useCallback(() => {
    onOpenChange(false)
    setShowCreateType(true)
  }, [onOpenChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex < types.length && types[selectedIndex]) {
        handleSelect(types[selectedIndex].id, types[selectedIndex].name)
      } else if (selectedIndex === types.length) {
        handleCreateType()
      }
    }
  }

  return (
    <>
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
                No types available
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
            {isSpaceOwner && (
              <>
                <div className="border-t my-1" />
                <button
                  data-selected={selectedIndex === types.length}
                  onClick={handleCreateType}
                  onMouseEnter={() => setSelectedIndex(types.length)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selectedIndex === types.length ? 'bg-accent' : 'hover:bg-accent/50',
                  )}
                >
                  <LayersIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">New Type</span>
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CreateTypeDialog
        open={showCreateType}
        onOpenChange={setShowCreateType}
        onCreate={createType}
      />
    </>
  )
}
