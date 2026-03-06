'use client'

import { useRouter } from 'next/navigation'
import { FileTextIcon, MapIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { AnalyticsConsentToggle } from './AnalyticsConsentToggle'

interface GuestModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuestModeDialog({ open, onOpenChange }: GuestModeDialogProps) {
  const router = useRouter()

  const enterGuest = (withExample: boolean) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `swashbuckler-guest=1; path=/; max-age=31536000; SameSite=Lax${secure}`
    if (withExample) {
      document.cookie = `swashbuckler-guest-example=1; path=/; max-age=300; SameSite=Lax${secure}`
    }
    router.push('/dashboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Try as Guest</DialogTitle>
          <DialogDescription>
            Your data stays on this device. You can sign up later to sync it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          <button
            onClick={() => enterGuest(false)}
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
            onClick={() => enterGuest(true)}
            className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <MapIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Explore an example campaign</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A pirate adventure with linked NPCs, locations, quests, and session logs.
              </p>
            </div>
          </button>

          <AnalyticsConsentToggle />
        </div>
      </DialogContent>
    </Dialog>
  )
}
