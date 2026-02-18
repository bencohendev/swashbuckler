'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useObjectModal } from '@/shared/stores/objectModal'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { Button } from '@/shared/components/ui/Button'
import { ObjectEditor } from './ObjectEditor'

export function ObjectEditorModal() {
  const { objectId, close } = useObjectModal()
  const isMobile = useIsMobile()

  if (!objectId) return null

  // Mobile: full-screen takeover
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex h-14 items-center border-b px-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={close}
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-auto">
          <ObjectEditor
            id={objectId}
            onDelete={close}
            onNavigateAway={close}
          />
        </div>
      </div>
    )
  }

  // Desktop: dialog
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Edit Entry</DialogTitle>
        <ObjectEditor
          id={objectId}
          onDelete={close}
          onNavigateAway={close}
        />
      </DialogContent>
    </Dialog>
  )
}
