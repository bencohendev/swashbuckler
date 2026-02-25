'use client'

import { useState } from 'react'
import { DownloadIcon, Loader2Icon } from 'lucide-react'
import { useGlobalObjectTypes } from '../hooks/useGlobalObjectTypes'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { Button } from '@/shared/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { useSpaceId } from '@/shared/lib/data'
import { toast } from '@/shared/hooks/useToast'

export function GlobalTypeImporter() {
  const [open, setOpen] = useState(false)
  const { types, isLoading, importToSpace } = useGlobalObjectTypes()
  const spaceId = useSpaceId()
  const [importingId, setImportingId] = useState<string | null>(null)

  const handleImport = async (typeId: string) => {
    if (!spaceId) return
    setImportingId(typeId)
    const { data, error } = await importToSpace(typeId, spaceId)
    setImportingId(null)
    if (error) {
      toast({ description: error, variant: 'destructive' })
    } else if (data) {
      toast({ description: `Imported "${data.name}" into this space`, variant: 'success' })
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <DownloadIcon className="size-4" />
        Import Global Type
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Global Type</DialogTitle>
            <DialogDescription>
              Choose a global type to copy into this space.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && types.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No global types available. Create one in Account Settings first.
            </p>
          )}

          {!isLoading && types.length > 0 && (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {types.map(type => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg bg-muted"
                      style={type.color ? { backgroundColor: type.color + '20', color: type.color } : undefined}
                    >
                      <TypeIcon icon={type.icon} className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.fields.length} field{type.fields.length !== 1 ? 's' : ''}
                        {' · '}
                        {type.slug}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={importingId === type.id}
                    onClick={() => handleImport(type.id)}
                  >
                    {importingId === type.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      'Import'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
