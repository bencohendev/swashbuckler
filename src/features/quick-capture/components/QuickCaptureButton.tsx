'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

interface QuickCaptureButtonProps {
  onClick: () => void
}

export function QuickCaptureButton({ onClick }: QuickCaptureButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg md:bottom-6 md:right-6"
      aria-label="Quick capture (⌘E)"
    >
      <PlusIcon className="size-5" />
    </Button>
  )
}
