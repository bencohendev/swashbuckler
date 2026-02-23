'use client'

import { useState } from 'react'
import { RotateCcwIcon, TrashIcon } from 'lucide-react'
import { useObjects } from '../hooks/useObjects'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import type { DataObject } from '@/shared/lib/data'

export function TrashList() {
  const { objects, isLoading, restore, remove } = useObjects({ isDeleted: true })
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DataObject | null>(null)

  const handleRestore = async (obj: DataObject) => {
    setProcessingId(obj.id)
    await restore(obj.id)
    setProcessingId(null)
    toast({ description: `"${obj.title}" restored` })
  }

  const handlePermanentDelete = async () => {
    if (!pendingDelete) return
    const title = pendingDelete.title
    setProcessingId(pendingDelete.id)
    await remove(pendingDelete.id, true)
    setProcessingId(null)
    setPendingDelete(null)
    toast({ description: `"${title}" permanently deleted` })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (objects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrashIcon className="mb-4 size-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Trash is empty</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {objects.map((obj) => (
        <div
          key={obj.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {obj.icon && <span>{obj.icon}</span>}
              <span className="truncate font-medium">{obj.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Deleted {obj.deleted_at ? new Date(obj.deleted_at).toLocaleDateString() : 'recently'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRestore(obj)}
              disabled={processingId === obj.id}
              title="Restore"
              aria-label={`Restore "${obj.title}"`}
            >
              <RotateCcwIcon className="size-4" />
              Restore
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPendingDelete(obj)}
              disabled={processingId === obj.id}
              className="text-destructive hover:text-destructive"
              title="Delete permanently"
              aria-label={`Permanently delete "${obj.title}"`}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Delete permanently"
        description={`Permanently delete "${pendingDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handlePermanentDelete}
      />
    </div>
  )
}
