'use client'

import { XIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface TagBadgeProps {
  name: string
  color?: string | null
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function TagBadge({ name, color, onRemove, onClick, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
      style={{
        backgroundColor: color ? color + '20' : 'var(--color-muted)',
        color: color ?? 'var(--color-muted-foreground)',
      }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </span>
  )
}
