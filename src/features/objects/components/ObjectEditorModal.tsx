'use client'

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
  const { objectId, close } = useObjectModal()
  const isMobile = useIsMobile()

  if (!objectId) return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent
        className={
          isMobile
            ? "fixed inset-0 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0"
            : "max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl"
        }
        showCloseButton={false}
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
            onDelete={close}
            onNavigateAway={close}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
