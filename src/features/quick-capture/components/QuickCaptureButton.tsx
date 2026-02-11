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
      className="fixed bottom-6 right-6 z-40 size-12 rounded-full shadow-lg"
      aria-label="Quick capture (⌘E)"
    >
      <PlusIcon className="size-5" />
    </Button>
  )
}
