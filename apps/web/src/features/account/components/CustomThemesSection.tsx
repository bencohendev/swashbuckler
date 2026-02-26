'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useCustomThemeStore } from '@/features/theme-builder/stores/customTheme'
import { ThemeBuilder } from '@/features/theme-builder/components/ThemeBuilder'
import { ThemeCard } from '@/features/theme-builder/components/ThemeCard'
import type { CustomTheme } from '@/features/theme-builder/types'

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; theme: CustomTheme }

export function CustomThemesSection() {
  const themes = useCustomThemeStore(s => s.themes)
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme)
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' })

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custom Themes</h2>
        {builder.mode === 'closed' && (
          <Button size="sm" onClick={() => setBuilder({ mode: 'create' })}>
            <PlusIcon />
            New Theme
          </Button>
        )}
      </div>

      {builder.mode !== 'closed' ? (
        <div>
          <h3 className="mb-4 text-sm font-medium">
            {builder.mode === 'edit' ? `Edit: ${builder.theme.name}` : 'Create Theme'}
          </h3>
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
        <p className="text-sm text-muted-foreground">
          No custom themes yet. Create one to get started.
        </p>
      )}
    </div>
  )
}
