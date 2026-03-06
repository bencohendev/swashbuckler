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
  title?: string
  description?: string
  showSkipAll?: boolean
  onTakeTour: () => void
  onSkip: () => void
  onSkipAll?: () => void
}

export function WelcomeDialog({
  open,
  title = 'Welcome to Swashbuckler',
  description = 'Your personal knowledge base. Let\u2019s take a quick tour to get you oriented.',
  showSkipAll,
  onTakeTour,
  onSkip,
  onSkipAll,
}: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {showSkipAll && onSkipAll && (
            <Button variant="ghost" onClick={onSkipAll} className="mr-auto text-muted-foreground">
              Don&apos;t show tours
            </Button>
          )}
          <Button variant="outline" onClick={onSkip}>
            Dismiss
          </Button>
          <Button onClick={onTakeTour}>
            Take a tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
