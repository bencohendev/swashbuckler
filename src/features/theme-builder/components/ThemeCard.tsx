'use client'

import { useState } from 'react'
import { CheckIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import type { CustomTheme } from '../types'
import { CORE_COLOR_KEYS } from '../types'

interface ThemeCardProps {
  theme: CustomTheme
  isActive: boolean
  onActivate: (id: string) => void
  onEdit: (theme: CustomTheme) => void
  onDelete: (id: string) => void
}

export function ThemeCard({ theme, isActive, onActivate, onEdit, onDelete }: ThemeCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isActive ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-muted/30'
      }`}
    >
      {/* Color swatches */}
      <div className="mb-3 flex gap-1">
        {CORE_COLOR_KEYS.map(key => (
          <span
            key={key}
            className="h-5 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md"
            style={{ backgroundColor: theme.coreColors[key] }}
          />
        ))}
      </div>

      {/* Name and badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="truncate text-sm font-medium">{theme.name}</span>
        <span className="text-xs capitalize text-muted-foreground">{theme.base}</span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1 text-xs text-primary">
            <CheckIcon className="size-3" />
            Active
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {!isActive && (
          <Button variant="outline" size="sm" onClick={() => onActivate(theme.id)}>
            Activate
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(theme)}
          aria-label={`Edit ${theme.name}`}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete ${theme.name}`}
        >
          <TrashIcon />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete theme"
        description={`Are you sure you want to delete "${theme.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => onDelete(theme.id)}
      />
    </div>
  )
}
