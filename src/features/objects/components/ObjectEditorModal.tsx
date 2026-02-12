'use client'

import { useObjectModal } from '@/shared/stores/objectModal'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { ObjectEditor } from './ObjectEditor'

export function ObjectEditorModal() {
  const { objectId, close } = useObjectModal()

  return (
    <Dialog open={!!objectId} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Edit Entry</DialogTitle>
        {objectId && (
          <ObjectEditor
            id={objectId}
            onDelete={close}
            onNavigateAway={close}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
