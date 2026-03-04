'use client'

import { useCallback } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { useObjectModal } from '@/shared/stores/objectModal'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { Button } from '@/shared/components/ui/Button'
import { ObjectEditor } from './ObjectEditor'

export function ObjectEditorModal() {
  const { objectId, autoFocus, close } = useObjectModal()
  const isMobile = useIsMobile()

  // Prevent Radix Dialog from stealing focus when autoFocus is set —
  // ObjectEditor's own useEffect will focus the title input once the object loads
  const handleOpenAutoFocus = useCallback((e: Event) => {
    if (autoFocus) e.preventDefault()
  }, [autoFocus])

  if (!objectId) return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent
        className={
          isMobile
            ? "fixed inset-0 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0"
            : "max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl"
        }
        showCloseButton={false}
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        <DialogTitle className="sr-only">Edit Entry</DialogTitle>
        {isMobile && (
          <div className="flex h-14 items-center border-b px-2">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
              >
                <ArrowLeftIcon className="size-4" />
                Back
              </Button>
            </DialogClose>
          </div>
        )}
        <div className={isMobile ? "h-[calc(100%-3.5rem)] overflow-auto" : undefined}>
          <ObjectEditor
            id={objectId}
            autoFocus={autoFocus}
            onDelete={close}
            onNavigateAway={close}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
