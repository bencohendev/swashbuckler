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
import { AnalyticsConsentToggle } from './AnalyticsConsentToggle'

interface NewUserDialogProps {
  open: boolean
  onChoice: (withExample: boolean) => void
}

export function NewUserDialog({ open, onChoice }: NewUserDialogProps) {
  const [loading, setLoading] = useState<'blank' | 'example' | false>(false)

  const handleChoice = (withExample: boolean) => {
    setLoading(withExample ? 'example' : 'blank')
    onChoice(withExample)
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent closing without a choice */ }}>
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="sm:text-center">
          <DialogTitle>
            {loading ? 'Setting things up' : 'Set up your workspace'}
          </DialogTitle>
          <DialogDescription>
            {loading === 'example'
              ? <span>Please wait while your world is being constructed.<br />This may take a few moments.</span>
              : loading === 'blank'
                ? <span>Setting things up.<br />This may take a few moments.</span>
                : 'Choose how you\'d like to start. You can always create more spaces later.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
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

            <AnalyticsConsentToggle />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
