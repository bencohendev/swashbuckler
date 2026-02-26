'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useCustomThemeStore } from '../stores/customTheme'
import { ThemeBuilder } from './ThemeBuilder'
import { ThemeCard } from './ThemeCard'
import type { CustomTheme } from '../types'

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; theme: CustomTheme }

export function CustomThemeSettings() {
  const themes = useCustomThemeStore(s => s.themes)
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme)
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Custom Themes</h1>
            <p className="text-muted-foreground">
              Create and manage your custom themes.
            </p>
          </div>
          {builder.mode === 'closed' && (
            <Button onClick={() => setBuilder({ mode: 'create' })}>
              <PlusIcon />
              New Theme
            </Button>
          )}
        </div>
      </div>

      {/* Builder or list */}
      {builder.mode !== 'closed' ? (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {builder.mode === 'edit' ? `Edit: ${builder.theme.name}` : 'Create Theme'}
          </h2>
          <ThemeBuilder
            editingTheme={builder.mode === 'edit' ? builder.theme : null}
            onClose={() => setBuilder({ mode: 'closed' })}
            autoAssignSpace={false}
          />
        </div>
      ) : themes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map(t => (
            <ThemeCard
              key={t.id}
              theme={t}
              isActive={false}
              onEdit={theme => setBuilder({ mode: 'edit', theme })}
              onDelete={deleteTheme}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            No custom themes yet. Create one to get started.
          </p>
        </div>
      )}
    </div>
  )
}
