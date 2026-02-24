'use client'

import { PlusIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/Button'

interface QuickCaptureButtonProps {
  onClick: () => void
  className?: string
}

export function QuickCaptureButton({ onClick, className }: QuickCaptureButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn("fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg md:bottom-6 md:right-6", className)}
      aria-label="Quick capture (⌘E)"
    >
      <PlusIcon className="size-5" />
    </Button>
  )
}
