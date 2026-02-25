'use client'

import { PinIcon, PinOffIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { usePins } from '../hooks/usePins'
import { Button } from '@/shared/components/ui/Button'

interface PinButtonProps {
  objectId: string
  size?: 'sm' | 'default'
  className?: string
}

export function PinButton({ objectId, size = 'default', className }: PinButtonProps) {
  const { pinnedIds, toggle } = usePins()
  const isPinned = pinnedIds.has(objectId)

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(objectId)
      }}
      title={isPinned ? 'Unpin' : 'Pin'}
      className={cn(
        size === 'sm' && 'size-6',
        className,
      )}
    >
      {isPinned ? (
        <PinOffIcon className={cn('size-4', size === 'sm' && 'size-3.5')} />
      ) : (
        <PinIcon className={cn('size-4', size === 'sm' && 'size-3.5')} />
      )}
    </Button>
  )
}
