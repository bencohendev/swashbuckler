'use client'

import { useState } from 'react'
import { FileTextIcon, MapIcon, Loader2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'

interface NewUserDialogProps {
  open: boolean
  onChoice: (withExample: boolean) => void
}

export function NewUserDialog({ open, onChoice }: NewUserDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleChoice = (withExample: boolean) => {
    setLoading(true)
    onChoice(withExample)
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent closing without a choice */ }}>
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set up your workspace</DialogTitle>
          <DialogDescription>
            Choose how you'd like to start. You can always create more spaces later.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Setting things up...</p>
          </div>
        ) : (
          <div className="grid gap-3 pt-2">
            <button
              onClick={() => handleChoice(false)}
              className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <FileTextIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Start blank</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Empty workspace — build your world from scratch.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleChoice(true)}
              className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <MapIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Explore an example world</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A pirate adventure with linked NPCs, locations, quests, and session logs.
                  You can modify or delete it at any time.
                </p>
              </div>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
