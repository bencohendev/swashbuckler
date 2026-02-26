'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { Button } from '@/shared/components/ui/Button'

interface WelcomeDialogProps {
  open: boolean
  onTakeTour: () => void
  onSkip: () => void
}

export function WelcomeDialog({ open, onTakeTour, onSkip }: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome to Swashbuckler</DialogTitle>
          <DialogDescription>
            Your personal knowledge base. Let&apos;s take a quick tour to get you oriented.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
          <Button onClick={onTakeTour}>
            Take a tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
